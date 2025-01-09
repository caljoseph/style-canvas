import React, { useState } from 'react';
import { contactService } from '../api/services/contact';
import { useAuth } from '../context/AuthContext';
import { Modal } from 'react-bootstrap';

const Contact = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        subject: '',
        message: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(null);
    };

    const resetForm = () => {
        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            subject: '',
            message: ''
        });
    };

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 5000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!user && !isValidEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!formData.message.trim()) {
            setError('Please enter a message');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await contactService.sendMessage({
                ...formData,
                email: user?.email || formData.email
            });

            // Show success toast immediately
            showToast('Your message has been sent successfully!', 'success');

            // Clear form after a slight delay for better UX
            resetForm();

        } catch (error) {
            setError(error.response?.data?.message ||
                error.message ||
                'Failed to send message. Please try again or email us directly.');
        }

        // Always re-enable the form
        setIsSubmitting(false);
    };

    return (
        <section id="contactus" className="contact section">
            {toast && (
                <div className={`my-toast-container show`}>
                    <div className="my-toast">
                        <div className="my-toast-body">{toast.message}</div>
                        <button
                            className="my-toast-close"
                            onClick={() => setToast(null)}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}

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
                        {error && (
                            <div className="alert alert-danger mb-4" role="alert">
                                {error}
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            className={`php-email-form ${isSubmitting ? 'submitting' : ''}`}
                            data-aos="fade-up"
                            data-aos-delay="500"
                        >
                            <div className="row gy-4">
                                <div className="col-md-6">
                                    <input
                                        type="text"
                                        name="name"
                                        className={`form-control ${error && !formData.name.trim() ? 'is-invalid' : ''}`}
                                        placeholder="Your Name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>

                                <div className="col-md-6">
                                    <input
                                        type="email"
                                        name="email"
                                        className={`form-control ${error && !isValidEmail(formData.email) ? 'is-invalid' : ''} ${user ? 'bg-light text-muted' : ''}`}
                                        placeholder="Your Email"
                                        value={user?.email || formData.email}
                                        onChange={handleChange}
                                        required
                                        disabled={!!user || isSubmitting}
                                        style={user ? { cursor: 'not-allowed', backgroundColor: '#dde0e3' } : {}}
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
                                        disabled={isSubmitting}
                                        required
                                    />
                                </div>

                                <div className="col-md-12">
                                    <textarea
                                        className={`form-control ${error && !formData.message.trim() ? 'is-invalid' : ''}`}
                                        name="message"
                                        rows="6"
                                        placeholder="Message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        required
                                    ></textarea>
                                </div>

                                <div className="col-md-12 text-center">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Sending...
                                            </>
                                        ) : (
                                            'Send Message'
                                        )}
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