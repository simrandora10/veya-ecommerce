import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PaymentModal from './PaymentModal';
import { useNotification } from './Notification';

const CartSidebar = () => {
  const {
    cartItems,
    updateCartItem,
    removeFromCart,
    getCartTotal,
    isCartSidebarOpen,
    setIsCartSidebarOpen,
  } = useCart();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleQuantityChange = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      await removeFromCart(cartItemId);
    } else {
      await updateCartItem(cartItemId, newQuantity);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      showNotification('Please enter a coupon code', 'error');
      return;
    }
    
    try {
      const response = await api.post('/coupons/validate/', { code: couponCode.trim() });
      if (response.data.valid) {
        const discount = response.data.discount_amount;
        const coupon = {
          code: response.data.code,
          discount: discount,
          name: response.data.code
        };
      setAppliedCoupon(coupon);
        // Apply fixed discount amount (not percentage)
        setCouponDiscount(discount);
        showNotification(`Coupon ${coupon.name} applied! You saved ₹${discount}`, 'success');
    } else {
        showNotification(response.data.error || 'Invalid coupon code', 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Invalid coupon code';
      showNotification(errorMessage, 'error');
    }
  };

  const handleClearCart = async () => {
    // Simple confirmation - user can undo by adding items back
    try {
      for (const item of cartItems) {
        await removeFromCart(item.id);
      }
      showNotification('Cart cleared successfully', 'success');
    } catch (error) {
      console.error('Error clearing cart:', error);
      showNotification('Error clearing cart', 'error');
    }
  };

  const calculateDiscounts = () => {
    const subtotal = getCartTotal();
    const originalTotal = cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    const productDiscount = originalTotal - subtotal;
    return { subtotal, originalTotal, productDiscount };
  };

  const { subtotal, originalTotal, productDiscount } = calculateDiscounts();
  const shippingFee = subtotal >= 999 ? 0 : 199;
  const totalDiscount = productDiscount + couponDiscount;
  const finalTotal = subtotal - couponDiscount + shippingFee;
  const totalSaved = originalTotal - finalTotal;

  if (!isCartSidebarOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setIsCartSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-700 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setIsCartSidebarOpen(false)}
            className="flex items-center gap-2 hover:text-purple-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-semibold">Your cart</span>
          </button>
          <button
            onClick={handleClearCart}
            className="text-sm hover:text-purple-200 underline"
          >
            clear cart
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Cart Items */}
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-600">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={item.product.image || 'https://via.placeholder.com/100'}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gray-800 line-clamp-2">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Size: {item.product.size || '50g'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-200"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-200"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          {item.product.discount_price ? (
                            <div>
                              <span className="text-sm font-bold text-purple-600">
                                ₹{item.product.discount_price * item.quantity}
                              </span>
                              <span className="text-xs text-gray-500 line-through ml-1">
                                ₹{item.product.price * item.quantity}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-purple-600">
                              ₹{item.product.price * item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="mt-2 text-red-600 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Savings Banner */}
              {totalSaved > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-700 font-bold">%</span>
                    <span className="text-sm text-green-700">
                      ₹{totalSaved.toFixed(2)} saved. Extra offers with coupons & charms at checkout.
                    </span>
                  </div>
                </div>
              )}

              {/* Gift Banner */}
              {finalTotal >= 1999 && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎁</span>
                      <span className="text-sm font-semibold text-yellow-800">
                        You've hit ₹1999! choose your season's grand gift
                      </span>
                    </div>
                    <svg className="w-5 h-5 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Coupon Section */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Apply Coupon</h3>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-100 p-2 rounded mb-2">
                    <span className="text-sm text-green-700">
                      "{appliedCoupon.name}" applied
                    </span>
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponDiscount(0);
                        setCouponCode('');
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      disabled={!couponCode.trim()}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Order summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total MRP:</span>
                    <span className="line-through text-gray-500">₹{originalTotal.toFixed(2)}</span>
                  </div>
                  {productDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="text-green-600">- ₹{productDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coupon Discount:</span>
                      <span className="text-green-600">- ₹{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping Fee:</span>
                    <span className={shippingFee === 0 ? 'text-green-600 font-semibold' : ''}>
                      {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Total Amount:</span>
                      <div className="text-right">
                        <span className="font-bold text-lg text-purple-600">₹{finalTotal.toFixed(2)}</span>
                        {originalTotal > finalTotal && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            ₹{originalTotal.toFixed(2)}
                          </span>
                        )}
                        {originalTotal > finalTotal && (
                          <span className="text-sm text-green-600 ml-2">
                            ({Math.round(((originalTotal - finalTotal) / originalTotal) * 100)}% off)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Have Queries Section */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Have queries? reach out to us at:</h3>
                <div className="flex gap-4 justify-center mt-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-purple-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-purple-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-purple-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-purple-700 text-white py-4 rounded-lg font-bold text-lg hover:bg-purple-800 transition-colors flex items-center justify-center gap-2"
              >
                CHECKOUT NOW
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          cartItems={cartItems}
          totalAmount={finalTotal}
          originalTotal={originalTotal}
          discount={totalSaved}
          couponDiscount={couponDiscount}
          appliedCoupon={appliedCoupon}
        />
      )}
    </>
  );
};

export default CartSidebar;

