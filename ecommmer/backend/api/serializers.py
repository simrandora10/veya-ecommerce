from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Product, Cart, Order, OrderItem, Coupon


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description']


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True
    )
    discount_percentage = serializers.ReadOnlyField()
    final_price = serializers.ReadOnlyField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price', 'discount_price',
            'category', 'category_id', 'image', 'images', 'stock', 'skin_type',
            'rating', 'review_count', 'is_trending', 'is_bestseller', 'is_new',
            'discount_percentage', 'final_price', 'created_at'
        ]
    
    def get_image(self, obj):
        """Ensure image is returned as a full URL"""
        # Handle None or empty image
        if not obj.image:
            return None
        
        try:
            # If it's a CloudinaryResource, use build_url to get the full URL
            from cloudinary import CloudinaryResource
            if isinstance(obj.image, CloudinaryResource):
                # CloudinaryResource has a build_url method or url property
                if hasattr(obj.image, 'build_url'):
                    return obj.image.build_url()
                elif hasattr(obj.image, 'url'):
                    return obj.image.url
                else:
                    # Try to build URL from public_id
                    public_id = getattr(obj.image, 'public_id', str(obj.image))
                    from django.conf import settings
                    if hasattr(settings, 'CLOUDINARY_CLOUD_NAME') and settings.CLOUDINARY_CLOUD_NAME:
                        cloud_name = settings.CLOUDINARY_CLOUD_NAME
                        return f"https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}"
            
            # If it's already a full URL string, return it
            if isinstance(obj.image, str):
                if obj.image.startswith('http://') or obj.image.startswith('https://'):
                    return obj.image
                # If it's a Cloudinary public_id string, build URL
                from django.conf import settings
                if hasattr(settings, 'CLOUDINARY_CLOUD_NAME') and settings.CLOUDINARY_CLOUD_NAME:
                    cloud_name = settings.CLOUDINARY_CLOUD_NAME
                    return f"https://res.cloudinary.com/{cloud_name}/image/upload/{obj.image}"
                return obj.image
                
        except Exception as e:
            # Fallback: try to get string representation
            pass
        
        # Final fallback: convert to string
        return str(obj.image) if obj.image else None


class CartSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'product', 'product_id', 'quantity', 'total_price', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'total_amount', 'full_name', 'email',
            'shipping_address', 'city', 'state', 'pincode', 'phone',
            'status', 'items', 'created_at', 'updated_at'
        ]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['username', 'date_joined']


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'discount_amount', 'is_used', 'created_at']
        read_only_fields = ['code', 'discount_amount', 'is_used', 'created_at']

