import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import config from './config';

function MobileLogin() {
    const [step, setStep] = useState('mobile');
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const inputRefs = useRef([]);

    const fromCheckout = new URLSearchParams(location.search).get('redirect') === 'checkout';

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    useEffect(() => {
        if (step === 'otp') {
            inputRefs.current[0]?.focus();
        }
    }, [step]);

    const handleSendOTP = async () => {
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            setError('Enter valid 10-digit mobile number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${config.API_URL}/api/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile })
            });

            const data = await res.json();

            if (data.success) {
                setStep('otp');
                setTimer(60);
                if (data.debug?.otp) alert(`Dev OTP: ${data.debug.otp}`);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        const otpString = otp.join('');
        if (otpString.length < 6) {
            setError('Enter complete OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${config.API_URL}/api/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, otp: otpString })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('customerToken', data.data.token);
                localStorage.setItem('customer', JSON.stringify(data.data.customer));

                // Trigger storage event for other tabs
                window.dispatchEvent(new Event('storage'));

                const pendingCart = localStorage.getItem('pendingCart');
                
                if (pendingCart && fromCheckout) {
                    localStorage.removeItem('pendingCart');
                    navigate('/?checkout=true');
                } else {
                    navigate('/'); // Redirect to home page, not profile
                }
            } else {
                setError(data.message);
                setOtp(['', '', '', '', '', '']);
            }
        } catch (err) {
            setError('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (timer > 0) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.API_URL}/api/otp/resend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile })
            });
            const data = await res.json();
            if (data.success) {
                setTimer(60);
                if (data.debug?.otp) alert(`New OTP: ${data.debug.otp}`);
            }
        } catch (err) {
            setError('Failed to resend');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value[0];
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        if (value && index === 5) {
            const completeOtp = [...newOtp.slice(0, 5), value].join('');
            if (completeOtp.length === 6) {
                setTimeout(() => handleVerifyOTP(), 300);
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-orange-500">ABC Restaurant</h1>
                    <p className="text-gray-600 mt-2">
                        {fromCheckout ? 'Login to continue checkout' : 'Login to your account'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {step === 'mobile' ? (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mobile Number
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-4 bg-gray-100 border rounded-l-lg text-gray-600">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    placeholder="9876543210"
                                    className="flex-1 px-4 py-3 border rounded-r-lg focus:outline-none focus:border-orange-500"
                                    maxLength="10"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSendOTP}
                            disabled={loading || mobile.length < 10}
                            className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-600 text-center">
                            OTP sent to <span className="font-medium">+91 {mobile}</span>
                        </p>

                        <div className="flex justify-center gap-2">
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => (inputRefs.current[i] = el)}
                                    type="text"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    className="w-12 h-12 text-center text-xl border rounded-lg focus:outline-none focus:border-orange-500"
                                    maxLength="1"
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleVerifyOTP}
                            disabled={loading || otp.join('').length < 6}
                            className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>

                        {timer > 0 ? (
                            <p className="text-sm text-gray-500 text-center">
                                Resend in {timer}s
                            </p>
                        ) : (
                            <button
                                onClick={handleResendOTP}
                                className="w-full text-orange-500 text-sm hover:text-orange-600"
                            >
                                Resend OTP
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MobileLogin;