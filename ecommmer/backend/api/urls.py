from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProductViewSet, CartViewSet,
    OrderViewSet, UserViewSet, register_view, login_view, logout_view,
    newsletter_subscribe_view, bulk_order_request_view,
    password_reset_request_view, password_reset_verify_view, password_reset_confirm_view,
    google_login_view, register_send_otp_view, register_verify_otp_view,
    mobile_send_otp_view, mobile_verify_otp_view,
    email_send_otp_view, email_verify_otp_view,
    validate_coupon_view, my_coupons_view
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', register_view, name='register'),
    path('auth/register/send-otp/', register_send_otp_view, name='register_send_otp'),
    path('auth/register/verify-otp/', register_verify_otp_view, name='register_verify_otp'),
    path('auth/mobile/send-otp/', mobile_send_otp_view, name='mobile_send_otp'),
    path('auth/mobile/verify-otp/', mobile_verify_otp_view, name='mobile_verify_otp'),
    path('auth/email/send-otp/', email_send_otp_view, name='email_send_otp'),
    path('auth/email/verify-otp/', email_verify_otp_view, name='email_verify_otp'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/google/', google_login_view, name='google_login'),
    path('auth/password-reset/request/', password_reset_request_view, name='password_reset_request'),
    path('auth/password-reset/verify/', password_reset_verify_view, name='password_reset_verify'),
    path('auth/password-reset/confirm/', password_reset_confirm_view, name='password_reset_confirm'),
    path('newsletter/subscribe/', newsletter_subscribe_view, name='newsletter_subscribe'),
    path('bulk-orders/request/', bulk_order_request_view, name='bulk_order_request'),
    path('coupons/validate/', validate_coupon_view, name='validate_coupon'),
    path('coupons/my-coupons/', my_coupons_view, name='my_coupons'),
]

