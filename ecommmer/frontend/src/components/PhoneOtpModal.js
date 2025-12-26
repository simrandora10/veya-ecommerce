import React, { useEffect, useState, useRef } from 'react';
import { sendEmailOtp, verifyEmailOtp } from '../services/api';

const PhoneOtpModal = () => {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('collect'); // collect -> otp -> success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const loadTimerRef = useRef(null);
  const couponCode = 'FIRST100';
  const otpRefs = useRef([]);

  // Always show modal after 10s from page load (no scroll needed)
  useEffect(() => {
    loadTimerRef.current = setTimeout(() => {
      if (!triggered) {
        setTriggered(true);
        setShow(true);
      }
    }, 10000);

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [triggered]);

  // Resend cooldown ticker
  useEffect(() => {
    if (!cooldown) return undefined;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSendOtp = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Please enter an email.');
      return;
    }
    setLoading(true);
    try {
      await sendEmailOtp(email.trim());
      setStep('otp');
      setInfo('OTP sent. Enter the 4 digits below.');
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setInfo('');
    const code = otp.join('');
    if (code.length !== 4) {
      setError('Please enter the 4-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await verifyEmailOtp(email.trim(), code);
      setStep('success');
      if (data?.coupon?.code) {
        navigator.clipboard?.writeText(data.coupon.code).catch(() => {});
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (cooldown || loading) return;
    handleSendOtp();
  };

  const copyCode = () => {
    setError('');
    const text = couponCode;
    const writeClipboard = async () => {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return false;
    };
    writeClipboard()
      .then((ok) => {
        if (!ok) {
          throw new Error('Clipboard unavailable');
        }
        setInfo('Code copied!');
      })
      .catch(() => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const success = document.execCommand('copy');
          document.body.removeChild(ta);
          setInfo(success ? 'Code copied!' : 'Copy failed. Please copy manually: FIRST100');
        } catch (e) {
          setInfo('Copy failed. Please copy manually: FIRST100');
        }
      });
  };

  const closeModal = () => {
    setShow(false);
    setError('');
    setEmail('');
    setOtp(['', '', '', '']);
    setStep('collect');
    setCooldown(0);
    setInfo('');
  };

  if (!show) return null;

  return (
    <div className="otp-backdrop">
      <div className="otp-modal">
        <button className="otp-close" onClick={closeModal} aria-label="Close">×</button>
        {step !== 'success' && (
          <>
            <h3 className="otp-title">flat ₹100 off on your first purchase.</h3>
            <p className="otp-subtitle">use code: FIRST100</p>
          </>
        )}

        {step === 'collect' && (
          <>
            <div className="otp-input-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="otp-phone-input"
              />
            </div>
            {error && <p className="otp-error">{error}</p>}
            {info && <p className="otp-info">{info}</p>}
            <button className="otp-primary" onClick={handleSendOtp} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <p className="otp-subtitle">We have sent verification code to</p>
            <p className="otp-subtitle break-all">{email}</p>
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
                    // auto-focus next box when a digit is entered
                    if (e.target.value && idx < otp.length - 1) {
                      otpRefs.current[idx + 1]?.focus();
                    }
                  }}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  className="otp-digit"
                />
              ))}
            </div>
            {error && <p className="otp-error">{error}</p>}
            {info && <p className="otp-info">{info}</p>}
            <button className="otp-primary" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button className="otp-secondary" onClick={handleResend} disabled={cooldown > 0 || loading}>
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
          </>
        )}

        {step === 'success' && (
          <div className="otp-success">
            <div className="coupon-card">
              <div className="coupon-code">Flat ₹100 Off</div>
              <div className="coupon-text">Code: {couponCode}</div>
              <div className="coupon-text">Will be available at checkout</div>
              <button
                className="otp-secondary"
                onClick={copyCode}
              >
                Copy Code
              </button>
            </div>
            <p className="otp-info">Access to personalized offers</p>
            {info && <p className="otp-info">{info}</p>}
            <button className="otp-primary" onClick={closeModal}>Start Shopping</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneOtpModal;

