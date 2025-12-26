from django.contrib import admin
from .models import Category, Product, Cart, Order, OrderItem, Coupon


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock', 'is_trending', 'is_bestseller']
    list_filter = ['category', 'is_trending', 'is_bestseller', 'skin_type']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'description', 'category')
        }),
        ('Pricing', {
            'fields': ('price', 'discount_price')
        }),
        ('Images', {
            'fields': ('image', 'images'),
            'description': 'Image field is optional. You can add images later.'
        }),
        ('Inventory & Details', {
            'fields': ('stock', 'skin_type', 'rating', 'review_count')
        }),
        ('Flags', {
            'fields': ('is_trending', 'is_bestseller', 'is_new')
        }),
    )


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'quantity', 'created_at']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'total_amount', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    inlines = [OrderItemInline]


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'user', 'discount_amount', 'is_used', 'created_at', 'used_at']
    list_filter = ['is_used', 'created_at']
    search_fields = ['code', 'user__username', 'user__email']

