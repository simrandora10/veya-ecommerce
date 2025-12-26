import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [trackingOrderId, setTrackingOrderId] = useState(orderId || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrackOrder = async () => {
    if (!trackingOrderId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/orders/track/${trackingOrderId.trim()}/`);
      setOrder(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Order not found. Please check your order ID.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500';
      case 'shipped':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'pending':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusSteps = (status) => {
    const steps = [
      { key: 'pending', label: 'Order Placed' },
      { key: 'processing', label: 'Processing' },
      { key: 'shipped', label: 'Shipped' },
      { key: 'delivered', label: 'Delivered' },
    ];

    const statusIndex = steps.findIndex(s => s.key === status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= statusIndex,
      current: index === statusIndex,
    }));
  };

  return (
    <div className="min-h-screen relative overflow-hidden py-8" style={{
      background: 'linear-gradient(180deg, #581C87 0%, #6B21A8 25%, #7E22CE 50%, #6B21A8 75%, #581C87 100%)',
      backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(126, 34, 206, 0.4) 0%, transparent 50%)',
    }}>
      <div className="container mx-auto px-4 relative z-10 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:text-purple-200 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Track Your Order</h1>
          <p className="text-purple-200">Enter your order ID to track your order status</p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Order ID (e.g., ORD1234567890)"
              value={trackingOrderId}
              onChange={(e) => setTrackingOrderId(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTrackOrder();
                }
              }}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleTrackOrder}
              disabled={loading}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Tracking...' : 'Track Order'}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Order Details */}
        {order && (
          <div className="bg-white rounded-lg shadow-xl p-6 space-y-6">
            {/* Order Header */}
            <div className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Order #{order.order_number}</h2>
                  <p className="text-gray-600 mt-1">
                    Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-2 rounded-full text-white font-semibold ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tracking Steps */}
            <div className="py-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Order Status</h3>
              <div className="relative">
                {getStatusSteps(order.status).map((step, index) => (
                  <div key={step.key} className="flex items-center mb-6">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                          step.completed ? getStatusColor(order.status) : 'bg-gray-300'
                        }`}
                      >
                        {step.completed ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < getStatusSteps(order.status).length - 1 && (
                        <div
                          className={`w-1 h-16 ${
                            step.completed ? getStatusColor(order.status) : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${step.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                        {step.label}
                      </h4>
                      {step.current && (
                        <p className="text-sm text-gray-600 mt-1">
                          {order.status === 'pending' && 'Your order has been placed and is being processed'}
                          {order.status === 'processing' && 'Your order is being prepared for shipment'}
                          {order.status === 'shipped' && 'Your order has been shipped and is on the way'}
                          {order.status === 'delivered' && `Delivered on ${new Date(order.updated_at).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={item.product?.image || 'https://via.placeholder.com/100'}
                      alt={item.product?.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{item.product?.name}</h4>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-sm font-semibold text-purple-600 mt-1">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipping Details</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800">{order.full_name || 'N/A'}</p>
                <p className="text-gray-600 mt-1">{order.shipping_address}</p>
                <p className="text-gray-600">
                  {order.city}, {order.state} {order.pincode}
                </p>
                <p className="text-gray-600 mt-1">Phone: {order.phone}</p>
                {order.email && <p className="text-gray-600">Email: {order.email}</p>}
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">₹{parseFloat(order.total_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-semibold text-green-600">FREE</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-lg text-purple-600">₹{parseFloat(order.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-6 flex gap-4">
              <button
                onClick={() => navigate('/orders')}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                View All Orders
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;


