import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [passwords, setPasswords] = useState({ new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/password-reset/request/', { email });
      setMessage('If this email is registered, an OTP has been sent.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/password-reset/verify/', { email, otp });
      setMessage('OTP verified. Please set your new password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!passwords.new_password || passwords.new_password !== passwords.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password-reset/confirm/', {
        email,
        otp,
        new_password: passwords.new_password,
        confirm_password: passwords.confirm_password,
      });
      setMessage('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{
      background: 'linear-gradient(180deg, #581C87 0%, #6B21A8 25%, #7E22CE 50%, #6B21A8 75%, #581C87 100%)',
      backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(126, 34, 206, 0.4) 0%, transparent 50%)',
      animation: 'gradientShift 15s ease infinite',
      backgroundSize: '200% 200%'
    }}>
      <div className="max-w-lg w-full space-y-6 bg-white/95 rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-purple-700 mb-2">Reset Password</h1>
        <p className="text-center text-gray-600 mb-4">
          {step === 1 && 'Enter your registered email to receive an OTP.'}
          {step === 2 && 'Enter the OTP sent to your email.'}
          {step === 3 && 'Create a new password for your account.'}
        </p>

        {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
        {message && <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-md text-sm">{message}</div>}

        {step === 1 && (
          <form className="space-y-4" onSubmit={handleRequestOtp}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Registered Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50"
                value={email}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">OTP</label>
              <input
                type="text"
                maxLength="6"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form className="space-y-4" onSubmit={handleSetPassword}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

