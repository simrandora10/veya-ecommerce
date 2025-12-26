import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendMobileOtp, verifyMobileOtp } from '../services/api';

const RESEND_COOLDOWN = 30;

const PhoneOtpPage = () => {
  const [searchParams] = useSearchParams();
  const initialPhone = useMemo(() => searchParams.get('phone') || '', [searchParams]);

  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(initialPhone ? 'OTP sent. Please enter it below.' : '');
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (initialPhone) {
      setCooldown(RESEND_COOLDOWN);
    }
  }, [initialPhone]);

  useEffect(() => {
    if (!cooldown) return undefined;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSend = async () => {
    setError('');
    setInfo('');
    if (!phone.trim()) {
      setError('Please enter a mobile number.');
      return;
    }
    setLoading(true);
    try {
      await sendMobileOtp(phone.trim());
      setInfo('OTP sent. Please enter it below.');
      setCooldown(RESEND_COOLDOWN);
      setOtp(['', '', '', '']);
      navigate(`/verify-otp?phone=${encodeURIComponent(phone.trim())}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setInfo('');
    const code = otp.join('');
    if (code.length !== 4) {
      setError('Please enter the 4-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await verifyMobileOtp(phone.trim(), code);
      setVerified(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText('FIRST100').catch(() => {});
  };

  if (verified) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="coupon-card mt-6 mb-6">
          <div className="coupon-code">FIRST100</div>
          <div className="coupon-text">Flat ₹100 off on your first purchase</div>
        </div>
        <img
          src="https://dummyimage.com/640x200/7f5af0/ffffff&text=Your+Discount+Coupon"
          alt="Discount coupon"
          className="mx-auto rounded-lg shadow-lg mb-6"
        />
        <button className="otp-secondary" onClick={copyCode}>Copy Coupon Code</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold mb-2 text-center">Verify your mobile</h2>
      <p className="text-center text-gray-600 mb-6">We sent an OTP to your number.</p>

      <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
      <div className="otp-input-row mb-4">
        <span className="otp-prefix">+91</span>
        <input
          type="tel"
          className="otp-phone-input text-black"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter mobile number"
        />
      </div>

      <div className="flex justify-between mb-4">
        <button className="otp-secondary" onClick={handleSend} disabled={loading || cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send / Resend OTP'}
        </button>
      </div>

      <label className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP</label>
      <div className="otp-box-row">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            type="text"
            maxLength="1"
            value={digit}
            onChange={(e) => {
              if (!/^\d?$/.test(e.target.value)) return;
              const next = [...otp];
              next[idx] = e.target.value;
              setOtp(next);
            }}
            className="otp-digit text-black"
          />
        ))}
      </div>

      {error && <p className="otp-error text-red-500 text-sm mt-2">{error}</p>}
      {info && <p className="otp-info text-green-600 text-sm mt-2">{info}</p>}

      <button className="otp-primary mt-4" onClick={handleVerify} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>
    </div>
  );
};

export default PhoneOtpPage;



