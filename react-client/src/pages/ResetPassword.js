import React, { useState, useEffect } from 'react';
import {Link, useNavigate} from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        code: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const resetEmail = sessionStorage.getItem('resetEmail');
        if (!resetEmail) {
            navigate('/forgot-password');
            return;
        }
        setEmail(resetEmail);
    }, [navigate]);

    const validatePassword = (password) => {
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        return { hasNumber, hasSpecialChar, hasUppercase, hasLowercase };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate password
        if (formData.newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        const passwordChecks = validatePassword(formData.newPassword);
        if (!Object.values(passwordChecks).every(Boolean)) {
            setError('Password does not meet all requirements.');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/confirm-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    code: formData.code,
                    newPassword: formData.newPassword,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.removeItem('resetEmail');
                alert('Password reset successful! Please login with your new password.');
                navigate('/registration');
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    return (
        <section className="registration-section">
            <div className="registration-container">
                <div className="tab-form">
                    <div className="tab-content">
                        <form onSubmit={handleSubmit}>
                            <h2 className="text-center mb-4">Reset Password</h2>
                            <p className="text-center text-muted mb-4">
                                Enter the code sent to your email and create a new password
                            </p>

                            {error && (
                                <div className="alert alert-danger">{error}</div>
                            )}

                            <div className="form-group">
                                <label htmlFor="code">Reset Code</label>
                                <input
                                    type="text"
                                    id="code"
                                    name="code"
                                    className={`form-control ${error && !formData.code ? 'is-invalid' : ''}`}
                                    value={formData.code}
                                    onChange={handleInputChange}
                                    placeholder="Enter reset code"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <div className="position-relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="newPassword"
                                        name="newPassword"
                                        className={`form-control ${error && !formData.newPassword ? 'is-invalid' : ''}`}
                                        value={formData.newPassword}
                                        onChange={handleInputChange}
                                        placeholder="Create new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{border: 'none', background: 'none'}}
                                    >
                                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                                    </button>
                                </div>
                                <ul className="password-requirements">
                                    <li className={formData.newPassword.match(/[0-9]/) ? 'valid' : ''}>
                                        Must contain at least one number
                                    </li>
                                    <li className={formData.newPassword.match(/[!@#$%^&*]/) ? 'valid' : ''}>
                                        Must contain at least one special character
                                    </li>
                                    <li className={formData.newPassword.match(/[A-Z]/) ? 'valid' : ''}>
                                        Must contain at least one uppercase letter
                                    </li>
                                    <li className={formData.newPassword.match(/[a-z]/) ? 'valid' : ''}>
                                        Must contain at least one lowercase letter
                                    </li>
                                    <li className={formData.newPassword.length >= 6 ? 'valid' : ''}>
                                        Must be at least 6 characters long
                                    </li>
                                </ul>
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <div className="position-relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        className={`form-control ${error && !formData.confirmPassword ? 'is-invalid' : ''}`}
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Confirm new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{border: 'none', background: 'none'}}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary w-100"
                                disabled={loading}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>

                            <div className="form-group" style={{paddingTop: '0.5rem'}}>
                                <Link to="/registration" className="text-center d-block"
                                      style={{textDecoration: 'none'}}>Back
                                    to Login</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ResetPassword;