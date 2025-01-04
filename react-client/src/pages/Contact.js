import React, { useState } from 'react';
import { contactService } from '../api/services';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [status, setStatus] = useState({
        loading: false,
        error: null,
        success: false
    });

    // Basic email validation
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear errors when user starts typing again
        if (status.error) {
            setStatus(prev => ({ ...prev, error: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!formData.name.trim()) {
            setStatus({ loading: false, error: 'Please enter your name', success: false });
            return;
        }

        if (!isValidEmail(formData.email)) {
            setStatus({ loading: false, error: 'Please enter a valid email address', success: false });
            return;
        }

        if (!formData.message.trim()) {
            setStatus({ loading: false, error: 'Please enter a message', success: false });
            return;
        }

        setStatus({ loading: true, error: null, success: false });

        try {
            await contactService.sendMessage({
                ...formData,
                // Add any additional metadata
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                source: window.location.href
            });

            // Success
            setStatus({ loading: false, error: null, success: true });
            setFormData({
                name: '',
                email: '',
                subject: '',
                message: ''
            });

            // Reset success message after 5 seconds
            setTimeout(() => {
                setStatus(prev => ({ ...prev, success: false }));
            }, 5000);

        } catch (error) {
            setStatus({
                loading: false,
                error: error.message || 'Failed to send message. Please try again or email us directly.',
                success: false
            });
        }
    };

    return (
        <section id="contactus" className="contact section">
            <div className="container section-title" data-aos="fade-up">
                <h2>Contact Us</h2>
            </div>

            <div className="container position-relative" data-aos="fade-up" data-aos-delay="100">
                <div className="row gy-4">
                    <div className="col-lg-5">
                        <div className="info-item d-flex" data-aos="fade-up" data-aos-delay="200">
                            <div>
                                <h2>
                                    We'd love to hear from you! Whether you have questions, feedback, or need support,
                                    <br />
                                    please reach out to us at contact@stylecanvasai.com.
                                </h2>
                            </div>
                        </div>

                        <div className="info-item d-flex" data-aos="fade-up" data-aos-delay="400">
                            <i className="bi bi-envelope flex-shrink-0"></i>
                            <div>
                                <h3>Email Us</h3>
                                <p>contact@stylecanvasai.com</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-7">
                        <form onSubmit={handleSubmit} className="php-email-form" data-aos="fade-up" data-aos-delay="500">
                            <div className="row gy-4">
                                <div className="col-md-6">
                                    <input
                                        type="text"
                                        name="name"
                                        className={`form-control ${status.error && !formData.name.trim() ? 'is-invalid' : ''}`}
                                        placeholder="Your Name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="col-md-6">
                                    <input
                                        type="email"
                                        name="email"
                                        className={`form-control ${status.error && !isValidEmail(formData.email) ? 'is-invalid' : ''}`}
                                        placeholder="Your Email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="col-md-12">
                                    <input
                                        type="text"
                                        name="subject"
                                        className="form-control"
                                        placeholder="Subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="col-md-12">
                                    <textarea
                                        className={`form-control ${status.error && !formData.message.trim() ? 'is-invalid' : ''}`}
                                        name="message"
                                        rows="6"
                                        placeholder="Message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                    ></textarea>
                                </div>

                                <div className="col-md-12 text-center">
                                    {status.loading && <div className="loading">Sending message...</div>}
                                    {status.error && <div className="error-message">{status.error}</div>}
                                    {status.success && <div className="sent-message">Your message has been sent. Thank you!</div>}

                                    <button
                                        type="submit"
                                        disabled={status.loading}
                                        className={status.loading ? 'loading' : ''}
                                    >
                                        {status.loading ? 'Sending...' : 'Send Message'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contact;