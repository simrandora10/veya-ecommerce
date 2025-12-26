import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useNotification } from './Notification';

const PaymentModal = ({ isOpen, onClose, cartItems, totalAmount, originalTotal, discount, couponDiscount, appliedCoupon }) => {
  const navigate = useNavigate();
  const { fetchCart } = useCart();
  const { showNotification } = useNotification();
  const [user, setUser] = useState(null);
  const [deliveryDetails, setDeliveryDetails] = useState({
    full_name: '',
    email: '',
    phone: '',
    shipping_address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const response = await api.get('/users/me/');
      setUser(response.data);
      setDeliveryDetails({
        full_name: response.data.full_name || response.data.username || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        shipping_address: response.data.shipping_address || '',
        city: response.data.city || '',
        state: response.data.state || '',
        pincode: response.data.pincode || '',
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleInputChange = (e) => {
    setDeliveryDetails({
      ...deliveryDetails,
      [e.target.name]: e.target.value,
    });
  };

  const handlePlaceOrder = async () => {
    if (!deliveryDetails.full_name || !deliveryDetails.phone || !deliveryDetails.shipping_address) {
      showNotification('Please fill in all required delivery details', 'error');
      return;
    }

    setLoading(true);
    try {
      // Create order with coupon code if applied
      const orderData = {
        ...deliveryDetails,
        total_amount: totalAmount,
      };
      if (appliedCoupon && appliedCoupon.code) {
        orderData.coupon_code = appliedCoupon.code;
      }
      
      const orderResponse = await api.post('/orders/', orderData);

      const order = orderResponse.data;

      if (paymentMethod === 'online') {
        // Create payment
        const paymentResponse = await api.post(`/orders/${order.id}/create_payment/`);
        
        if (paymentResponse.data.payment_required) {
          // Redirect to Razorpay payment
          const options = {
            key: paymentResponse.data.key_id,
            amount: paymentResponse.data.amount,
            currency: paymentResponse.data.currency,
            name: 'Veya',
            description: `Order ${order.order_number}`,
            order_id: paymentResponse.data.razorpay_order_id,
            handler: async (response) => {
              try {
                await api.post(`/orders/${order.id}/verify_payment/`, {
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                });
                await fetchCart();
                showNotification('Order placed successfully!', 'success');
                onClose();
                navigate(`/orders/${order.id}`);
              } catch (error) {
                console.error('Payment verification error:', error);
                showNotification('Payment verification failed. Please contact support.', 'error');
              }
            },
            prefill: {
              name: deliveryDetails.full_name,
              email: deliveryDetails.email,
              contact: deliveryDetails.phone,
            },
            theme: {
              color: '#6B21A8',
            },
          };

          const razorpay = new window.Razorpay(options);
          razorpay.open();
        } else {
          // COD or manual payment
          await fetchCart();
          showNotification('Order placed successfully!', 'success');
          onClose();
          navigate(`/orders/${order.id}`);
        }
      } else {
        // COD
        await fetchCart();
        showNotification('Order placed successfully!', 'success');
        onClose();
        navigate(`/orders/${order.id}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      showNotification('Failed to place order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalSaved = originalTotal - totalAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-700 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold">veya</h2>
            <p className="text-xs text-purple-200">we have chemistry</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-purple-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary Bar */}
        <div className="bg-purple-600 text-white p-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span>₹{totalSaved.toFixed(2)} saved so far</span>
            <span>•</span>
            <span>{itemCount} items</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="line-through text-purple-200">₹{originalTotal.toFixed(2)}</span>
            <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-purple-700 text-white p-2 text-center text-sm">
          real chemistry is just a step away! checkout now.
        </div>

        <div className="p-6 space-y-6">
          {/* Delivery Details */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">DELIVERY DETAILS</h3>
              {!showDeliveryForm && (
                <button
                  onClick={() => setShowDeliveryForm(true)}
                  className="text-purple-600 hover:text-purple-700 text-sm font-semibold"
                >
                  Change
                </button>
              )}
            </div>

            {showDeliveryForm ? (
              <div className="space-y-3">
                <input
                  type="text"
                  name="full_name"
                  placeholder="Full Name"
                  value={deliveryDetails.full_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={deliveryDetails.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={deliveryDetails.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <textarea
                  name="shipping_address"
                  placeholder="Shipping Address"
                  value={deliveryDetails.shipping_address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={deliveryDetails.city}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={deliveryDetails.state}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    name="pincode"
                    placeholder="Pincode"
                    value={deliveryDetails.pincode}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={() => setShowDeliveryForm(false)}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  Save Details
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800">
                  Deliver To {deliveryDetails.full_name || user?.username || 'User'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {deliveryDetails.shipping_address || 'No address provided'}
                </p>
                {deliveryDetails.city && (
                  <p className="text-sm text-gray-600">
                    {deliveryDetails.city}, {deliveryDetails.state} {deliveryDetails.pincode}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {deliveryDetails.phone && `Phone: ${deliveryDetails.phone}`}
                </p>
                <p className="text-sm text-gray-600">
                  {deliveryDetails.email && `Email: ${deliveryDetails.email}`}
                </p>
                <div className="mt-3">
                  <span className="text-sm font-semibold text-gray-800">Delivery Option: </span>
                  <span className="text-sm text-green-600 font-semibold">Standard Shipping - Free</span>
                </div>
              </div>
            )}
          </div>

          {/* Offers & Rewards */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">OFFERS & REWARDS</h3>
            <div className="space-y-3">
              {totalSaved > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-700 font-bold">%</span>
                    <span className="text-sm text-green-700">You saved ₹{totalSaved.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {appliedCoupon ? (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700">"{appliedCoupon.name}" applied</span>
                    <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Save ₹{(totalAmount * 0.05).toFixed(2)} with "SAVE5"</span>
                    <button className="text-purple-600 hover:text-purple-700 text-sm font-semibold">
                      Apply
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Redeem Charms worth ₹{Math.floor(totalAmount * 0.01)}</span>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">You're earning {Math.floor(totalAmount * 0.1)} Charms on this order</p>
                    <button className="text-purple-600 hover:text-purple-700 text-sm font-semibold mt-1">
                      Redeem
                    </button>
                  </div>
                </div>
              </div>

              <a href="#" className="text-purple-600 hover:text-purple-700 text-sm font-semibold">
                View all coupons &gt;
              </a>
            </div>
          </div>

          {/* Payment Options */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">PAYMENT OPTIONS</h3>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <span className="font-semibold">Online Payment</span>
                  <p className="text-xs text-gray-600">Upto 12% cashback in reward points</p>
                </div>
              </label>
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <span className="font-semibold">Cash on Delivery (COD)</span>
                  <p className="text-xs text-gray-600">Pay when you receive</p>
                </div>
              </label>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total MRP:</span>
                <span className="line-through text-gray-500">₹{originalTotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-green-600">- ₹{discount.toFixed(2)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Coupon Discount:</span>
                  <span className="text-green-600">- ₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total Amount:</span>
                  <div className="text-right">
                    <span className="font-bold text-lg text-purple-600">₹{totalAmount.toFixed(2)}</span>
                    {originalTotal > totalAmount && (
                      <span className="text-sm text-gray-500 line-through ml-2">
                        ₹{originalTotal.toFixed(2)}
                      </span>
                    )}
                    {originalTotal > totalAmount && (
                      <span className="text-sm text-green-600 ml-2">
                        ({Math.round(((originalTotal - totalAmount) / originalTotal) * 100)}% off)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full bg-purple-700 text-white py-4 rounded-lg font-bold text-lg hover:bg-purple-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Placing Order...' : `PLACE ORDER - ₹${totalAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

