import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Registration = () => {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const [isLoginView, setIsLoginView] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        passwordConfirm: ''
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
                const result = await register(formData.email, formData.password);
                if (result.success) {
                    localStorage.setItem('pendingEmail', formData.email);
                    navigate('/email-confirmation');
                } else {
                    setErrors({ submit: result.message || 'Registration failed' });
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
                                <div className="position-relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        name="password"
                                        className={`form-control ${errors.password && !isLoginView ? 'is-invalid' : ''}`}
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        autoComplete={isLoginView ? "current-password" : "new-password"}
                                        placeholder={isLoginView ? "Enter your password" : "Create a password"}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ border: 'none', background: 'none' }}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.password && !isLoginView &&
                                    <div className="invalid-feedback">{errors.password}</div>
                                }
                                {renderPasswordRequirements()}
                            </div>

                            {!isLoginView && (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="passwordConfirm">Confirm Password</label>
                                        <div className="position-relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                id="passwordConfirm"
                                                name="passwordConfirm"
                                                className={`form-control ${errors.passwordConfirm ? 'is-invalid' : ''}`}
                                                value={formData.passwordConfirm}
                                                onChange={handleInputChange}
                                                autoComplete="new-password"
                                                placeholder="Confirm your password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                style={{ border: 'none', background: 'none' }}
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                        {errors.passwordConfirm &&
                                            <div className="invalid-feedback">{errors.passwordConfirm}</div>
                                        }
                                    </div>
                                </>
                            )}

                            {isLoginView && (
                                <div className="form-group text-end">
                                    <Link to="/forgot-password">Forgot Password?</Link>
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