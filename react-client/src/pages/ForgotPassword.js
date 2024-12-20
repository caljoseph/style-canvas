import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                sessionStorage.setItem('resetEmail', email);
                setTimeout(() => {
                    navigate('/reset-password');
                }, 2000);
            } else {
                setError(data.message || 'Failed to initiate password reset');
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="registration-section">
            <div className="registration-container">
                <div className="tab-form">
                    <div className="tab-content">
                        <form onSubmit={handleSubmit}>
                            <h2 className="text-center mb-4">Forgot Password</h2>
                            <p className="text-center text-muted mb-4">
                                Enter your email address and we'll send you a code to reset your password
                            </p>

                            {error && (
                                <div className="alert alert-danger">{error}</div>
                            )}

                            {success && (
                                <div className="alert alert-success">
                                    Reset code sent! Redirecting you to enter the code...
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className={`form-control ${error ? 'is-invalid' : ''}`}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary w-100"
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Send Reset Code'}
                            </button>

                            <div className="form-group" style={{paddingTop: '0.5rem'}}>
                                <Link to="/registration" className="text-center d-block" style={{textDecoration: 'none'}}>Back
                                    to Login</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
        ;
};

export default ForgotPassword;