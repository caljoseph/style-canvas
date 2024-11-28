import React, { useState } from 'react';

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, error: null, success: false });

        try {
            const response = await fetch('/forms/contact.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            setStatus({ loading: false, error: null, success: true });
            setFormData({
                name: '',
                email: '',
                subject: '',
                message: ''
            });
        } catch (error) {
            setStatus({ loading: false, error: error.message, success: false });
        }
    };

    return (
        <section id="contactus" className="contact section">
            <div className="container section-title" data-aos="fade-up">
                <h2>Contact US</h2>
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
                                        className="form-control"
                                        placeholder="Your Name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <input
                                        type="email"
                                        name="email"
                                        className="form-control"
                                        placeholder="Your Email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="col-md-12">
                                    <input
                                        type="text"
                                        name="subject"
                                        className="form-control"
                                        placeholder="Subject"
                                        required
                                        value={formData.subject}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="col-md-12">
                  <textarea
                      className="form-control"
                      name="message"
                      rows="6"
                      placeholder="Message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                  ></textarea>
                                </div>

                                <div className="col-md-12 text-center">
                                    {status.loading && <div className="loading">Loading</div>}
                                    {status.error && <div className="error-message">{status.error}</div>}
                                    {status.success && <div className="sent-message">Your message has been sent. Thank you!</div>}

                                    <button type="submit" disabled={status.loading}>
                                        Send Message
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