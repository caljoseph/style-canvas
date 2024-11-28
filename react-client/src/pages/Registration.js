// src/pages/Registration.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Registration = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoginView, setIsLoginView] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        passwordConfirm: '',
        termsAccepted: false,
        notificationsAccepted: false
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validatePassword = (password) => {
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        return { hasNumber, hasSpecialChar, hasUppercase, hasLowercase };
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear errors when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formData.email) {
            newErrors.email = 'Please enter your email.';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address.';
        }

        if (!formData.password) {
            newErrors.password = 'Please enter a password.';
        } else if (!isLoginView) {
            if (formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters.';
            } else {
                const passwordChecks = validatePassword(formData.password);
                if (!Object.values(passwordChecks).every(Boolean)) {
                    newErrors.password = 'Password does not meet all requirements.';
                }
            }

            if (!formData.passwordConfirm) {
                newErrors.passwordConfirm = 'Please confirm your password.';
            } else if (formData.password !== formData.passwordConfirm) {
                newErrors.passwordConfirm = 'Passwords do not match.';
            }

            if (!formData.termsAccepted) {
                newErrors.terms = 'You must agree to the terms and conditions.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            if (isLoginView) {
                const result = await login(formData.email, formData.password);
                if (result.success) {
                    navigate('/');
                } else {
                    setErrors({ submit: result.message || 'Invalid email or password' });
                }
            } else {
                const response = await fetch('http://localhost:3000/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                    }),
                });

                const data = await response.json();
                if (response.ok) {
                    navigate('/welcome');
                } else {
                    setErrors({ submit: data.message || 'Registration failed' });
                }
            }
        } catch (error) {
            setErrors({ submit: 'An error occurred. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

    const renderPasswordRequirements = () => {
        if (isLoginView) return null;

        return (
            <ul className="password-requirements">
                <li className={formData.password.match(/[0-9]/) ? 'valid' : ''}>
                    Must contain at least one number
                </li>
                <li className={formData.password.match(/[!@#$%^&*]/) ? 'valid' : ''}>
                    Must contain at least one special character
                </li>
                <li className={formData.password.match(/[A-Z]/) ? 'valid' : ''}>
                    Must contain at least one uppercase letter
                </li>
                <li className={formData.password.match(/[a-z]/) ? 'valid' : ''}>
                    Must contain at least one lowercase letter
                </li>
            </ul>
        );
    };

    return (
        <section className="registration-section">
            <div className="registration-container">
                <div className="tab-form">
                    <nav>
                        <div className="nav nav-tabs" role="tablist">
                            <button
                                className={`nav-link ${isLoginView ? 'active' : ''}`}
                                type="button"
                                onClick={() => setIsLoginView(true)}
                            >
                                Login
                            </button>
                            <button
                                className={`nav-link ${!isLoginView ? 'active' : ''}`}
                                type="button"
                                onClick={() => setIsLoginView(false)}
                            >
                                Sign Up
                            </button>
                        </div>
                    </nav>

                    <div className="tab-content">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    autoComplete="username"
                                    placeholder="Enter your email"
                                    required
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    className={`form-control ${errors.password && !isLoginView ? 'is-invalid' : ''}`}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    autoComplete={isLoginView ? "current-password" : "new-password"}
                                    placeholder={isLoginView ? "Enter your password" : "Create a password"}
                                    required
                                />
                                {errors.password && !isLoginView &&
                                    <div className="invalid-feedback">{errors.password}</div>
                                }
                                {renderPasswordRequirements()}
                            </div>

                            {!isLoginView && (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="passwordConfirm">Confirm Password</label>
                                        <input
                                            type="password"
                                            id="passwordConfirm"
                                            name="passwordConfirm"
                                            className={`form-control ${errors.passwordConfirm ? 'is-invalid' : ''}`}
                                            value={formData.passwordConfirm}
                                            onChange={handleInputChange}
                                            autoComplete="new-password"
                                            placeholder="Confirm your password"
                                            required
                                        />
                                        {errors.passwordConfirm &&
                                            <div className="invalid-feedback">{errors.passwordConfirm}</div>
                                        }
                                    </div>

                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            id="termsAccepted"
                                            name="termsAccepted"
                                            className={`form-check-input ${errors.terms ? 'is-invalid' : ''}`}
                                            checked={formData.termsAccepted}
                                            onChange={handleInputChange}
                                        />
                                        <label className="form-check-label" htmlFor="termsAccepted">
                                            I agree to the terms and conditions
                                        </label>
                                        {errors.terms && <div className="invalid-feedback">{errors.terms}</div>}
                                    </div>

                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            id="notificationsAccepted"
                                            name="notificationsAccepted"
                                            className="form-check-input"
                                            checked={formData.notificationsAccepted}
                                            onChange={handleInputChange}
                                        />
                                        <label className="form-check-label" htmlFor="notificationsAccepted">
                                            Send me updates about StyleCanvasAI products and services
                                        </label>
                                    </div>
                                </>
                            )}

                            {isLoginView && (
                                <div className="form-group text-end">
                                    <a href="./forgot-password.html">Forgot Password?</a>
                                </div>
                            )}

                            {errors.submit && (
                                <div className="alert alert-danger">{errors.submit}</div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : isLoginView ? 'Login' : 'Create Account'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Registration;