import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/services';

const EmailConfirmation = () => {
    const navigate = useNavigate();

    const [userEmail, setUserEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Cooldown state (seconds remaining before resend is enabled)
    const [cooldown, setCooldown] = useState(0);

    // Loading state to show feedback while the request is being processed
    const [isLoading, setIsLoading] = useState(false);

    // Retrieve email from local storage on mount
    useEffect(() => {
        const storedEmail = localStorage.getItem('pendingEmail');
        if (storedEmail) {
            setUserEmail(storedEmail);
        }
    }, []);

    // Countdown effect for cooldown
    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [cooldown]);

    const handleResendEmail = async () => {
        // Prevent resending if currently loading or in cooldown
        if (cooldown > 0 || isLoading) return;

        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const result = await authService.resendConfirmationEmail(userEmail);
            if (!result?.message) {
                throw new Error('Failed to resend confirmation code');
            }
            setCooldown(60);
            setMessage('Verification email resent. Please check your inbox.');
        } catch (err) {
            console.error('Resend error:', err);
            setError(err.message);
        } finally {
            // Stop the loading animation regardless of success or failure
            setIsLoading(false);
        }
    };

    const handleGoBackToLogin = () => {
        navigate('/registration');
    };

    return (
        <section
            id="email-confirmation"
            className="d-flex align-items-center justify-content-center"
            style={{
                minHeight: '100vh',
                background: `linear-gradient(135deg, #ebf5ff 0%, var(--accent-color) 100%)`,
            }}
        >
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-8 col-xl-6">
                        <div
                            className="card shadow-lg border-0"
                            style={{
                                minHeight: '60vh',
                                borderRadius: '10px',
                                backgroundColor: 'var(--surface-color)',
                            }}
                        >
                            <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-5">
                                <h1
                                    className="mb-4 fw-bold"
                                    style={{ color: 'var(--heading-color)' }}
                                >
                                    Verify Your Email
                                </h1>
                                <p className="lead mb-4" style={{ color: 'var(--default-color)' }}>
                                    A verification link has been sent to:
                                </p>
                                <p className="mb-4" style={{ color: 'var(--default-color)' }}>
                                    <strong>{userEmail || 'unknown'}</strong>
                                </p>

                                {/* Shorter Step-by-Step Instructions */}
                                <div className="text-start mb-4" style={{ color: 'var(--default-color)' }}>
                                    <ul style={{ paddingLeft: '1rem' }}>
                                        <li>Check your inbox or spam folder for our email.</li>
                                        <li>Click the verification link.</li>
                                        <li>Return here or log back in once verified.</li>
                                    </ul>
                                </div>

                                {/* Success / Error Messages */}
                                {message && <div className="alert alert-success w-100">{message}</div>}
                                {error && <div className="alert alert-danger w-100">{error}</div>}

                                {/* Resend Verification Email Button */}
                                <button
                                    onClick={handleResendEmail}
                                    className="btn d-flex align-items-center justify-content-center"
                                    disabled={!userEmail || cooldown > 0 || isLoading}
                                    style={{
                                        color: 'var(--contrast-color)',
                                        backgroundColor: 'var(--accent-color)',
                                        width: '240px',
                                        height: '50px',
                                        borderRadius: '50px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                    }}
                                >
                                    {isLoading
                                        ? 'Sending...'
                                        : cooldown > 0
                                            ? `Resend in ${cooldown}s`
                                            : 'Resend Email'}
                                </button>

                                <div className="mt-4">
                                    <button
                                        onClick={handleGoBackToLogin}
                                        className="btn btn-link"
                                        style={{ color: 'var(--accent-color)', fontWeight: '600' }}
                                    >
                                        Go Back to Login
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default EmailConfirmation;
