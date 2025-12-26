from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
import razorpay
from django.conf import settings
from django.core.cache import cache
import random
import string
from django.core.mail import send_mail
import requests
from base64 import b64encode
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import re

from .models import Category, Product, Cart, Order, OrderItem, Coupon
from .serializers import (
    CategorySerializer, ProductSerializer, CartSerializer,
    OrderSerializer, UserSerializer
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = Product.objects.all()
        category = self.request.query_params.get('category', None)
        search = self.request.query_params.get('search', None)
        trending = self.request.query_params.get('trending', None)
        bestseller = self.request.query_params.get('bestseller', None)
        skin_type = self.request.query_params.get('skin_type', None)

        if category:
            queryset = queryset.filter(category__slug=category)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        if trending == 'true':
            queryset = queryset.filter(is_trending=True)
        if bestseller == 'true':
            queryset = queryset.filter(is_bestseller=True)
        if skin_type:
            queryset = queryset.filter(skin_type=skin_type)

        return queryset

    @action(detail=False, methods=['get'])
    def featured(self, request):
        products = Product.objects.filter(
            Q(is_trending=True) | Q(is_bestseller=True)
        )[:10]
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND
            )

        cart_item, created = Cart.objects.get_or_create(
            user=request.user,
            product=product,
            defaults={'quantity': quantity}
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        serializer = self.get_serializer(cart_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def total(self, request):
        cart_items = self.get_queryset()
        total = sum(item.total_price for item in cart_items)
        return Response({'total': total})


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def _send_order_emails(self, order, payment_id=None, manual=False):
        """
        Send order confirmation to user and notification to admin.
        Works for both online and manual/COD flows.
        """
        # Build items text
        items_list = []
        for item in order.items.all():
            items_list.append(f"- {item.product.name} x {item.quantity} - ₹{item.price * item.quantity}")
        items_text = '\n'.join(items_list) if items_list else 'No items'

        # Order tracker link (assuming frontend is at localhost:3000, adjust as needed)
        tracker_link = f"http://localhost:3000/track-order/{order.order_number}"

        # User email
        user_email = order.email or order.user.email
        if user_email:
            subject = f"Order Confirmed - {order.order_number}"
            payment_line = f"Payment ID: {payment_id}" if payment_id else ("Payment: Manual/COD" if manual else "Payment: Pending verification")
            message = f'''Dear {order.full_name or order.user.username},

Thank you for your order!

Order Details:
- Order Number: {order.order_number}
- Order Tracker ID: {order.order_number}
- Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
- Total Amount: ₹{order.total_amount}
- {payment_line}

Items Ordered:
{items_text}

Shipping Address:
{order.shipping_address}
{order.city}, {order.state} - {order.pincode}
Phone: {order.phone}

Track your order here: {tracker_link}

Your order has been placed successfully and will be processed soon.

Team Veya
we have chemistry™

---
This is an automated email. Please do not reply to this email.
'''
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user_email],
                fail_silently=False,
            )

        # Admin email - Send to connect.veya@gmail.com
        admin_subject = f"New Order Received - {order.order_number}"
        admin_message = f'''New Order Received!

Order Details:
- Order Number: {order.order_number}
- Order Tracker ID: {order.order_number}
- Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
- Customer: {order.full_name or order.user.username}
- Customer Email: {order.email or order.user.email}
- Customer Phone: {order.phone}
- Total Amount: ₹{order.total_amount}
- Payment ID: {payment_id or 'Manual/COD' if manual else 'Pending verification'}
- Status: {order.status}

Items Ordered:
{items_text}

Shipping Address:
{order.shipping_address}
{order.city}, {order.state} - {order.pincode}

Track order: {tracker_link}

Please process this order and update the status accordingly.

---
This is an automated notification from Veya E-commerce System.
'''
        # Send admin email ONLY to connect.veya@gmail.com (not to user)
        send_mail(
            admin_subject,
            admin_message,
            settings.DEFAULT_FROM_EMAIL,
            [settings.DEFAULT_FROM_EMAIL],  # Only send to connect.veya@gmail.com
            fail_silently=False,
        )

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        cart_items = Cart.objects.filter(user=request.user)
        if not cart_items.exists():
            return Response(
                {'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST
            )

        total_amount = sum(item.total_price for item in cart_items)
        
        # Handle coupon code if provided
        coupon_code = request.data.get('coupon_code', '').strip().upper()
        applied_coupon = None
        coupon_discount = 0
        
        if coupon_code:
            try:
                coupon = Coupon.objects.get(
                    code=coupon_code,
                    user=request.user,
                    is_used=False
                )
                coupon_discount = float(coupon.discount_amount)
                if coupon_discount > total_amount:
                    coupon_discount = total_amount
                applied_coupon = coupon
                total_amount = max(0, total_amount - coupon_discount)
            except Coupon.DoesNotExist:
                return Response(
                    {'error': 'Invalid or already used coupon code'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check order count BEFORE creating order (to determine if this is the 3rd order)
        completed_orders_count = Order.objects.filter(
            user=request.user,
            status__in=['processing', 'shipped', 'delivered']
        ).count()

        # Generate order number
        order_number = 'ORD' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))

        order = Order.objects.create(
            user=request.user,
            order_number=order_number,
            total_amount=total_amount,
            full_name=request.data.get('full_name', ''),
            email=request.data.get('email', request.user.email),
            shipping_address=request.data.get('shipping_address'),
            city=request.data.get('city', ''),
            state=request.data.get('state', ''),
            pincode=request.data.get('pincode', ''),
            phone=request.data.get('phone'),
        )
        
        # Mark coupon as used if applied
        if applied_coupon:
            applied_coupon.is_used = True
            applied_coupon.order = order
            from django.utils import timezone
            applied_coupon.used_at = timezone.now()
            applied_coupon.save()

        # Create order items
        for cart_item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price=cart_item.product.final_price
            )

        # Clear cart
        cart_items.delete()

        # Note: Coupon issuance happens in verify_payment when order status becomes 'processing'
        # (for online payments) or in create_payment for COD orders

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def create_payment(self, request, pk=None):
        order = self.get_object()

        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            # Allow COD/manual fulfilment when Razorpay keys are missing
            order.status = 'pending'
            order.save(update_fields=['status', 'updated_at'])
            
            # For COD, check coupon issuance after order is placed (treat as completed)
            completed_orders_count = Order.objects.filter(
                user=order.user,
                status__in=['pending', 'processing', 'shipped', 'delivered']
            ).exclude(id=order.id).count()  # Exclude current order
            
            if completed_orders_count == 2:  # This is the 3rd order
                existing_coupon = Coupon.objects.filter(
                    user=order.user,
                    is_used=False
                ).first()
                
                if not existing_coupon:
                    coupon_code = 'VEYA100' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    while Coupon.objects.filter(code=coupon_code).exists():
                        coupon_code = 'VEYA100' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    
                    Coupon.objects.create(
                        user=order.user,
                        code=coupon_code,
                        discount_amount=100.00,
                        is_used=False
                    )
                    
                    try:
                        user_email = order.email or order.user.email
                        if user_email:
                            coupon_subject = "Congratulations! You've earned a ₹100 discount coupon!"
                            coupon_message = f'''Dear {order.full_name or order.user.username},

Congratulations! You've placed 3 orders with us and earned a special reward!

Your Coupon Code: {coupon_code}
Discount Amount: ₹100.00
Valid for: One-time use on your next order

How to use:
1. Add items to your cart
2. Apply the coupon code "{coupon_code}" at checkout
3. Enjoy ₹100 off your order!

Thank you for being a valued customer!

Team Veya
we have chemistry™

---
This is an automated email. Please do not reply to this email.
'''
                            send_mail(
                                coupon_subject,
                                coupon_message,
                                settings.DEFAULT_FROM_EMAIL,
                                [user_email],
                                fail_silently=False,
                            )
                    except Exception as e:
                        import traceback
                        error_msg = f'Error sending coupon email: {str(e)}\n{traceback.format_exc()}'
                        print(error_msg)
            
            try:
                self._send_order_emails(order, manual=True)
            except Exception as e:
                import traceback
                print(f"Error sending manual payment emails: {e}\n{traceback.format_exc()}")
            return Response(
                {
                    'payment_required': False,
                    'message': 'Payment gateway not configured. Order placed as COD/manual.'
                },
                status=status.HTTP_200_OK
            )

        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

        razorpay_order = client.order.create({
            'amount': int(order.total_amount * 100),  # Amount in paise
            'currency': 'INR',
            'receipt': order.order_number
        })

        order.razorpay_order_id = razorpay_order['id']
        order.save()

        return Response({
            'order_id': razorpay_order['id'],
            'amount': razorpay_order['amount'],
            'currency': razorpay_order['currency'],
            'key': settings.RAZORPAY_KEY_ID
        })

    @action(detail=True, methods=['post'])
    def verify_payment(self, request, pk=None):
        order = self.get_object()
        payment_id = request.data.get('payment_id')
        signature = request.data.get('signature')

        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            return Response(
                {'error': 'Razorpay credentials not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': order.razorpay_order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            })

            order.razorpay_payment_id = payment_id
            order.razorpay_signature = signature
            order.status = 'processing'
            order.save()

            # Check if this order makes it exactly 3 completed orders, issue coupon
            completed_orders_count = Order.objects.filter(
                user=order.user,
                status__in=['processing', 'shipped', 'delivered']
            ).count()
            
            if completed_orders_count == 3:
                # Check if user already has an unused coupon
                existing_coupon = Coupon.objects.filter(
                    user=order.user,
                    is_used=False
                ).first()
                
                if not existing_coupon:
                    # Generate unique coupon code
                    coupon_code = 'VEYA100' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    while Coupon.objects.filter(code=coupon_code).exists():
                        coupon_code = 'VEYA100' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    
                    # Create coupon
                    Coupon.objects.create(
                        user=order.user,
                        code=coupon_code,
                        discount_amount=100.00,
                        is_used=False
                    )
                    
                    # Send coupon email to user
                    try:
                        user_email = order.email or order.user.email
                        if user_email:
                            coupon_subject = "Congratulations! You've earned a ₹100 discount coupon!"
                            coupon_message = f'''Dear {order.full_name or order.user.username},

Congratulations! You've placed 3 orders with us and earned a special reward!

Your Coupon Code: {coupon_code}
Discount Amount: ₹100.00
Valid for: One-time use on your next order

How to use:
1. Add items to your cart
2. Apply the coupon code "{coupon_code}" at checkout
3. Enjoy ₹100 off your order!

Thank you for being a valued customer!

Team Veya
we have chemistry™

---
This is an automated email. Please do not reply to this email.
'''
                            send_mail(
                                coupon_subject,
                                coupon_message,
                                settings.DEFAULT_FROM_EMAIL,
                                [user_email],
                                fail_silently=False,
                            )
                    except Exception as e:
                        import traceback
                        error_msg = f'Error sending coupon email: {str(e)}\n{traceback.format_exc()}'
                        print(error_msg)

            try:
                self._send_order_emails(order, payment_id=payment_id, manual=False)
            except Exception as e:
                import traceback
                error_msg = f'Error sending order emails: {str(e)}\n{traceback.format_exc()}'
                print(error_msg)

            return Response({'status': 'success', 'message': 'Payment verified'})

        except razorpay.errors.SignatureVerificationError:
            return Response(
                {'error': 'Payment verification failed'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='track/(?P<order_number>[^/.]+)', permission_classes=[AllowAny])
    def track(self, request, order_number=None):
        """
        Public endpoint to track order by order number.
        """
        try:
            order = Order.objects.get(order_number=order_number)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found. Please check your order ID.'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        import json
        from datetime import datetime
        log_path = r'c:\Users\HP\OneDrive\Desktop\ecommmer\.cursor\debug.log'
        
        if request.method == 'GET':
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'location': 'views.py:216',
                        'message': 'users/me GET called',
                        'data': {'is_authenticated': request.user.is_authenticated, 'user': request.user.username if request.user.is_authenticated else None, 'session_key': request.session.session_key},
                        'timestamp': int(datetime.now().timestamp() * 1000),
                        'sessionId': 'debug-session',
                        'runId': 'run1',
                        'hypothesisId': 'A'
                    }) + '\n')
            except: pass
            # #endregion
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method in ['PUT', 'PATCH']:
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate, login, logout


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    """
    Step 1: Accept registered email and send OTP.
    """
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Do not reveal that email doesn't exist
        return Response({'message': 'If this email is registered, an OTP has been sent.'}, status=status.HTTP_200_OK)

    # Generate 6-digit OTP
    otp = ''.join(random.choices(string.digits, k=6))
    cache_key = f'password_reset_otp_{email}'
    cache.set(cache_key, {'code': otp, 'user_id': user.id}, timeout=600)  # 10 minutes

    # Send email with OTP
    subject = 'Veya - Password Reset OTP'
    message = f'''Dear {user.first_name or user.username},

We received a request to reset your Veya account password.

Your One-Time Password (OTP) is: {otp}

This OTP is valid for 10 minutes. Do not share it with anyone.

If you did not request this, you can safely ignore this email.

Team Veya
we have chemistry™
'''
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
    except Exception:
        # Even if email fails, avoid leaking details
        pass

    return Response({'message': 'If this email is registered, an OTP has been sent.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_verify_view(request):
    """
    Step 2: Verify OTP for given email.
    """
    email = request.data.get('email', '').strip().lower()
    otp = request.data.get('otp', '').strip()

    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f'password_reset_otp_{email}'
    data = cache.get(cache_key)
    if not data or data.get('code') != otp:
        return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

    # Mark OTP as verified for this email
    verify_key = f'password_reset_verified_{email}'
    cache.set(verify_key, True, timeout=600)
    return Response({'message': 'OTP verified successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    Step 3: Set new password after OTP verification.
    """
    email = request.data.get('email', '').strip().lower()
    otp = request.data.get('otp', '').strip()
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if not all([email, otp, new_password, confirm_password]):
        return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
    if new_password != confirm_password:
        return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f'password_reset_otp_{email}'
    data = cache.get(cache_key)
    verify_key = f'password_reset_verified_{email}'
    verified = cache.get(verify_key)

    if not data or data.get('code') != otp or not verified:
        return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=data.get('user_id'))
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    # Clear cache
    cache.delete(cache_key)
    cache.delete(verify_key)

    return Response({'message': 'Password has been reset successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login_view(request):
    """
    Login or register user using Google ID token.
    Expects: { "token": "<google_id_token>" }
    """
    from .serializers import UserSerializer

    id_token = request.data.get('token')
    if not id_token:
        return Response({'error': 'Missing token'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Verify token with Google
        resp = requests.get('https://oauth2.googleapis.com/tokeninfo', params={'id_token': id_token}, timeout=5)
        if resp.status_code != 200:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_400_BAD_REQUEST)
        data = resp.json()

        # Check audience if configured
        client_id = settings.GOOGLE_CLIENT_ID
        if client_id and data.get('aud') != client_id:
            return Response({'error': 'Token audience mismatch'}, status=status.HTTP_400_BAD_REQUEST)

        email = data.get('email')
        sub = data.get('sub')
        name = data.get('name', '') or ''
        given_name = data.get('given_name') or ''
        family_name = data.get('family_name') or ''

        if not email:
            return Response({'error': 'Email not available from Google'}, status=status.HTTP_400_BAD_REQUEST)

        # Find or create user
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            base_username = email.split('@')[0] or f'user_{sub}'
            username = base_username
            counter = 1
            while User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                password=User.objects.make_random_password(),
                first_name=given_name,
                last_name=family_name,
            )

        # Log the user in via Django session
        login(request, user)
        request.session.save()

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': f'Google login failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def bulk_order_request_view(request):
    """
    Handle bulk order enquiries by emailing the admin and
    sending an acknowledgement to the customer. Keeps the API
    simple (no DB persistence) but ensures details are captured.
    """
    from django.core.mail import send_mail
    from django.conf import settings
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    from datetime import datetime

    name = request.data.get('name', '').strip()
    email = request.data.get('email', '').strip().lower()
    phone = request.data.get('phone', '').strip()
    company = request.data.get('company', '').strip()
    quantity = request.data.get('quantity', '').strip()
    message = request.data.get('message', '').strip()

    # Basic validation
    if not name:
        return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)
    if not phone:
        return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not quantity:
        return Response({'error': 'Quantity is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Notify admin
        admin_subject = f'New Bulk Order Enquiry - {name}'
        admin_message = f'''Bulk Order Enquiry Received

Name: {name}
Email: {email}
Phone: {phone}
Company: {company or 'N/A'}
Quantity: {quantity}

Message:
{message or 'N/A'}

Received at: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
'''
        send_mail(
            admin_subject,
            admin_message,
            settings.DEFAULT_FROM_EMAIL,
            [settings.DEFAULT_FROM_EMAIL],
            fail_silently=False,
        )

        # Acknowledge customer
        customer_subject = 'Thanks for your interest in Veya bulk orders'
        customer_message = f'''Hi {name},

Thanks for reaching out about placing a bulk order with Veya.
We have received your enquiry and will contact you shortly.

Summary of your request:
- Quantity: {quantity}
- Company: {company or 'N/A'}
- Phone: {phone}
- Additional details: {message or 'N/A'}

If you need urgent assistance, reply to this email or call us.

Team Veya
we have chemistry™
'''
        send_mail(
            customer_subject,
            customer_message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )

        return Response({'status': 'success', 'message': 'Bulk order request sent'}, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        error_msg = f'Error processing bulk order request: {str(e)}\n{traceback.format_exc()}'
        print(error_msg)
        return Response({'error': 'Could not send your request right now. Please try again later.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    from django.core.mail import send_mail
    from django.conf import settings
    
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password')
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()

    # Validate required fields
    if not username:
        return Response(
            {'error': 'Username is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not email:
        return Response(
            {'error': 'Email is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not password:
        return Response(
            {'error': 'Password is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if username already exists
    if User.objects.filter(username__iexact=username).exists():
        return Response(
            {'error': 'Username already exists. Please choose a different username.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if email already exists
    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {'error': 'Email already exists. Please use a different email address.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # Ensure email OTP was verified before allowing registration
    verify_key = f'register_verified_{email}'
    if not cache.get(verify_key):
        return Response(
            {'error': 'Please verify your email with OTP before creating an account.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create user
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        # Clear verification flag once user is created
        cache.delete(verify_key)

        # Send welcome email
        try:
            subject = 'Welcome to Veya - Registration Successful!'
            message = f'''Dear {first_name or username},

Thank you for registering with Veya!

You have successfully registered to Veya with the following details:
- Username: {username}
- Email: {email}

We're excited to have you as part of the Veya family. Start exploring our amazing collection of beauty products and enjoy exclusive offers!

Happy Shopping!
Team Veya
we have chemistry™

---
This is an automated email. Please do not reply to this email.
'''
            from_email = settings.DEFAULT_FROM_EMAIL
            recipient_list = [email]
            
            send_mail(
                subject,
                message,
                from_email,
                recipient_list,
                fail_silently=False,
            )
            print(f'Registration email sent successfully to {email}')
        except Exception as e:
            # Log the error but don't fail registration if email fails
            import traceback
            error_msg = f'Error sending registration email to {email}: {str(e)}\n{traceback.format_exc()}'
            print(error_msg)
            # You can also log to a file or send to monitoring service

        login(request, user)
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response(
            {'error': f'Registration failed: {str(e)}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(request, username=username, password=password)
    if user is not None:
        # Clear any existing session first
        request.session.flush()
        # Create new session
        login(request, user)
        # Ensure session is saved
        request.session.save()
        
        # Send login confirmation email
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            subject = 'Veya - Login Successful'
            message = f'''Dear {user.first_name or user.username},

You have successfully logged in to your Veya account.

If this wasn't you, please contact our support team immediately.

Stay beautiful!
Team Veya
we have chemistry™

---
This is an automated email. Please do not reply to this email.
'''
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            print(f'Login confirmation email sent successfully to {user.email}')
        except Exception as e:
            import traceback
            error_msg = f'Error sending login email to {user.email}: {str(e)}\n{traceback.format_exc()}'
            print(error_msg)
        
        serializer = UserSerializer(user)
        return Response(serializer.data)
    else:
        return Response(
            {'error': 'Invalid username or password'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )


from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])  # Allow logout even if session expired
def logout_view(request):
    import json
    import os
    from datetime import datetime
    
    log_path = r'c:\Users\HP\OneDrive\Desktop\ecommmer\.cursor\debug.log'
    
    try:
        # #region agent log
        session_key_before = request.session.session_key
        user_before = request.user.username if request.user.is_authenticated else None
        with open(log_path, 'a') as f:
            f.write(json.dumps({
                'location': 'views.py:297',
                'message': 'logout_view called',
                'data': {'session_key': session_key_before, 'user': user_before, 'is_authenticated': request.user.is_authenticated},
                'timestamp': int(datetime.now().timestamp() * 1000),
                'sessionId': 'debug-session',
                'runId': 'run1',
                'hypothesisId': 'A'
            }) + '\n')
        # #endregion
        
        # Get session key before flushing
        session_key = request.session.session_key
        
        # Flush the session completely
        request.session.flush()
        
        # #region agent log
        with open(log_path, 'a') as f:
            f.write(json.dumps({
                'location': 'views.py:310',
                'message': 'Session flushed',
                'data': {'session_key_before': session_key, 'session_key_after': request.session.session_key},
                'timestamp': int(datetime.now().timestamp() * 1000),
                'sessionId': 'debug-session',
                'runId': 'run1',
                'hypothesisId': 'A'
            }) + '\n')
        # #endregion
        
        # Also delete the session from database if it exists
        if session_key:
            from django.contrib.sessions.models import Session
            try:
                # Delete ALL sessions for this user, not just the current one
                user_id = request.user.id if request.user.is_authenticated else None
                deleted_count = Session.objects.filter(session_key=session_key).delete()[0]
                
                # Also delete any other sessions that might exist
                if user_id:
                    # Get all session data and check for this user
                    all_sessions = Session.objects.all()
                    additional_deleted = 0
                    for sess in all_sessions:
                        try:
                            session_data = sess.get_decoded()
                            if session_data.get('_auth_user_id') == str(user_id):
                                sess.delete()
                                additional_deleted += 1
                        except:
                            pass
                
                # #region agent log
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'location': 'views.py:318',
                        'message': 'Session deleted from DB',
                        'data': {'session_key': session_key, 'deleted_count': deleted_count, 'additional_deleted': additional_deleted if user_id else 0},
                        'timestamp': int(datetime.now().timestamp() * 1000),
                        'sessionId': 'debug-session',
                        'runId': 'run2',
                        'hypothesisId': 'A'
                    }) + '\n')
                # #endregion
            except Exception as db_error:
                # #region agent log
                with open(log_path, 'a') as f:
                    f.write(json.dumps({
                        'location': 'views.py:325',
                        'message': 'Session DB deletion error',
                        'data': {'error': str(db_error)},
                        'timestamp': int(datetime.now().timestamp() * 1000),
                        'sessionId': 'debug-session',
                        'runId': 'run2',
                        'hypothesisId': 'A'
                    }) + '\n')
                # #endregion
        
        # Call Django logout
        logout(request)
        
        # #region agent log
        with open(log_path, 'a') as f:
            f.write(json.dumps({
                'location': 'views.py:332',
                'message': 'Django logout called',
                'data': {'user_after': request.user.username if request.user.is_authenticated else None, 'is_authenticated': request.user.is_authenticated},
                'timestamp': int(datetime.now().timestamp() * 1000),
                'sessionId': 'debug-session',
                'runId': 'run1',
                'hypothesisId': 'A'
            }) + '\n')
        # #endregion
        
        # Delete the session cookie with proper settings
        response = Response({'message': 'Logged out successfully'})
        response.delete_cookie('sessionid', path='/', domain=None, samesite='Lax')
        response.delete_cookie('csrftoken', path='/', domain=None, samesite='Lax')
        
        # Also try to delete with different paths
        response.delete_cookie('sessionid', path='/api')
        response.delete_cookie('csrftoken', path='/api')
        
        # #region agent log
        with open(log_path, 'a') as f:
            f.write(json.dumps({
                'location': 'views.py:345',
                'message': 'Logout response created',
                'data': {'cookies_deleted': ['sessionid', 'csrftoken']},
                'timestamp': int(datetime.now().timestamp() * 1000),
                'sessionId': 'debug-session',
                'runId': 'run1',
                'hypothesisId': 'A'
            }) + '\n')
        # #endregion
        
        return response
    except Exception as e:
        # #region agent log
        with open(log_path, 'a') as f:
            f.write(json.dumps({
                'location': 'views.py:352',
                'message': 'Logout exception',
                'data': {'error': str(e), 'error_type': type(e).__name__},
                'timestamp': int(datetime.now().timestamp() * 1000),
                'sessionId': 'debug-session',
                'runId': 'run1',
                'hypothesisId': 'D'
            }) + '\n')
        # #endregion
        # Even if logout fails, return success to clear frontend state
        response = Response({'message': 'Logged out successfully'})
        response.delete_cookie('sessionid', path='/', domain=None, samesite='Lax')
        response.delete_cookie('csrftoken', path='/', domain=None, samesite='Lax')
        response.delete_cookie('sessionid', path='/api')
        response.delete_cookie('csrftoken', path='/api')
        return response


@api_view(['POST'])
@permission_classes([AllowAny])
def newsletter_subscribe_view(request):
    from django.core.mail import send_mail
    from django.conf import settings
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    
    email = request.data.get('email', '').strip().lower()
    
    if not email:
        return Response(
            {'error': 'Email is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate email format
    try:
        validate_email(email)
    except ValidationError:
        return Response(
            {'error': 'Invalid email format'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Send subscription confirmation email to user
    try:
        subject = 'Welcome to Veya Newsletter!'
        message = f'''Thank you for subscribing to Veya Newsletter!

You will now receive:
- Latest beauty tips and trends
- Exclusive offers and discounts
- New product launches
- Expert skincare advice
- Special promotions

We're excited to share our beauty journey with you!

Stay beautiful!
Team Veya
we have chemistry™

---
This is an automated email. Please do not reply to this email.
To unsubscribe, please contact us at {settings.DEFAULT_FROM_EMAIL}
'''
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        print(f'Newsletter subscription email sent successfully to {email}')
    except Exception as e:
        import traceback
        error_msg = f'Error sending newsletter subscription email: {str(e)}\n{traceback.format_exc()}'
        print(error_msg)
    
    # Send notification to admin
    try:
        from datetime import datetime
        admin_subject = 'New Newsletter Subscription'
        admin_message = f'''New Newsletter Subscription!

Email: {email}
Subscription Date: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}

---
This is an automated notification from Veya E-commerce System.
'''
        send_mail(
            admin_subject,
            admin_message,
            settings.DEFAULT_FROM_EMAIL,
            [settings.DEFAULT_FROM_EMAIL],  # Send to connect.veya@gmail.com
            fail_silently=False,
        )
        print(f'Newsletter subscription notification sent to admin')
    except Exception as e:
        import traceback
        error_msg = f'Error sending admin newsletter notification: {str(e)}\n{traceback.format_exc()}'
        print(error_msg)
    
    return Response({'status': 'success', 'message': 'Successfully subscribed to newsletter'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_send_otp_view(request):
    """
    Step 1 for registration: send OTP to email.
    """
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError

    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate email format
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)

    # If email already exists, inform user early
    if User.objects.filter(email__iexact=email).exists():
        return Response({'error': 'Email already exists. Please use a different email address.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Generate OTP and cache it
    otp = ''.join(random.choices(string.digits, k=6))
    cache_key = f'register_otp_{email}'
    cache.set(cache_key, otp, timeout=600)  # 10 minutes

    subject = 'Veya - Email Verification OTP'
    message = f'''Thank you for registering with Veya!

Your One-Time Password (OTP) for email verification is: {otp}

This OTP is valid for 10 minutes. Do not share it with anyone.

Team Veya
we have chemistry™
'''
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
    except Exception:
        # If email send fails, still show generic error
        return Response({'error': 'Could not send OTP. Please try again later.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': 'OTP sent to email.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_verify_otp_view(request):
    """
    Step 2 for registration: verify email OTP.
    """
    email = request.data.get('email', '').strip().lower()
    otp = request.data.get('otp', '').strip()

    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f'register_otp_{email}'
    expected_otp = cache.get(cache_key)
    if not expected_otp or expected_otp != otp:
        return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

    # Mark this email as verified and clear the OTP
    cache.delete(cache_key)
    verify_key = f'register_verified_{email}'
    cache.set(verify_key, True, timeout=900)  # 15 minutes

    return Response({'message': 'Email verified successfully.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def mobile_send_otp_view(request):
    """
    Send OTP to the provided mobile number.
    If Twilio credentials are present, an SMS is sent. Otherwise, logs for dev.
    """
    phone = request.data.get('phone', '').strip()

    # Basic validation for phone numbers (digits and + allowed, length 8-15)
    if not phone:
        return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.fullmatch(r'\+?\d{8,15}', phone):
        return Response({'error': 'Invalid phone number'}, status=status.HTTP_400_BAD_REQUEST)

    # Ensure phone starts with +
    if not phone.startswith('+'):
        phone = f'+{phone}'

    otp = ''.join(random.choices(string.digits, k=4))
    cache_key = f'mobile_otp_{phone}'
    cache.set(cache_key, otp, timeout=300)  # 5 minutes

    sent = False
    twilio_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    twilio_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    twilio_from = getattr(settings, 'TWILIO_FROM_NUMBER', '')

    if twilio_sid and twilio_token and twilio_from:
        try:
            url = f'https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json'
            data = {
                'To': phone,
                'From': twilio_from,
                'Body': f'Your OTP is {otp}. It expires in 5 minutes.'
            }
            resp = requests.post(url, data=data, auth=(twilio_sid, twilio_token), timeout=10)
            if resp.status_code >= 300:
                raise Exception(f'Twilio error {resp.status_code}: {resp.text}')
            sent = True
        except Exception as exc:
            print(f'[SMS] Failed to send via Twilio: {exc}')

    if not sent:
        # Dev fallback: log OTP
        print(f'[DEV] SMS OTP to {phone}: {otp}')

    return Response({'message': 'OTP sent to your mobile number.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_coupon_view(request):
    """
    Validate a coupon code for the authenticated user.
    Returns discount amount if valid.
    """
    coupon_code = request.data.get('code', '').strip().upper()
    
    if not coupon_code:
        return Response({'error': 'Coupon code is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        coupon = Coupon.objects.get(
            code=coupon_code,
            user=request.user,
            is_used=False
        )
        return Response({
            'valid': True,
            'discount_amount': float(coupon.discount_amount),
            'code': coupon.code
        }, status=status.HTTP_200_OK)
    except Coupon.DoesNotExist:
        return Response({
            'valid': False,
            'error': 'Invalid or already used coupon code'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_coupons_view(request):
    """
    Get all coupons for the authenticated user.
    """
    from .serializers import CouponSerializer
    coupons = Coupon.objects.filter(user=request.user).order_by('-created_at')
    serializer = CouponSerializer(coupons, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def email_send_otp_view(request):
    """
    Send OTP to the provided email address.
    """
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)

    otp = ''.join(random.choices(string.digits, k=4))
    cache_key = f'email_otp_{email}'
    cache.set(cache_key, otp, timeout=300)  # 5 minutes

    subject = 'Your verification OTP'
    message = f'Your OTP is {otp}. It expires in 5 minutes.'

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
    except Exception as exc:
        print(f'[Email OTP] Failed to send to {email}: {exc}')
        return Response({'error': 'Could not send OTP. Please try again later.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': 'OTP sent to your email address.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def email_verify_otp_view(request):
    """
    Verify OTP for email and return coupon details.
    """
    email = request.data.get('email', '').strip().lower()
    otp = request.data.get('otp', '').strip()

    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f'email_otp_{email}'
    expected = cache.get(cache_key)
    if not expected or expected != otp:
        return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

    cache.delete(cache_key)

    coupon = {
        'code': 'FIRST100',
        'description': 'Flat ₹100 off on your first purchase',
        'image': None,
    }

    return Response({'message': 'OTP verified successfully.', 'coupon': coupon}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def mobile_verify_otp_view(request):
    """
    Verify OTP for the given mobile number and return coupon details.
    """
    phone = request.data.get('phone', '').strip()
    otp = request.data.get('otp', '').strip()

    if not phone or not otp:
        return Response({'error': 'Phone and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f'mobile_otp_{phone}'
    expected_otp = cache.get(cache_key)
    if not expected_otp or expected_otp != otp:
        return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

    cache.delete(cache_key)

    coupon = {
        'code': 'FIRST100',
        'description': 'Flat ₹100 off on your first purchase',
        'image': None,  # Frontend shows the visual coupon
    }

    return Response({'message': 'OTP verified successfully.', 'coupon': coupon}, status=status.HTTP_200_OK)