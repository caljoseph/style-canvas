import React from 'react';
import { Link } from 'react-router-dom';

const Welcome = () => {
    return (
        <section
            id="welcome"
            className="d-flex align-items-center justify-content-center"
            style={{
                minHeight: '100vh',
                /* More apparent gradient using the accent color */
                background: `linear-gradient(135deg, #ebf5ff 0%, var(--accent-color) 100%)`
            }}
        >
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-8 col-xl-6">
                        <div
                            className="card shadow-lg border-0"
                            style={{
                                minHeight: '60vh',
                                borderRadius: '10px', /* Subtle rounded corners */
                                backgroundColor: 'var(--surface-color)' /* Use your surface color */
                            }}
                        >
                            <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-5">
                                <h1 className="mb-4 fw-bold" style={{ color: 'var(--heading-color)' }}>
                                    Email Verification Required
                                </h1>
                                <p className="lead mb-4" style={{ color: 'var(--default-color)' }}>
                                    Thank you for registering with <strong>StyleCanvasAI</strong>!
                                </p>
                                <p className="mb-4" style={{ color: 'var(--default-color)' }}>
                                    We’ve sent a verification link to your email address. Please check your inbox
                                    and click the link to verify your email.
                                </p>
                                <p className="mb-4" style={{ color: 'var(--default-color)' }}>
                                    If you don’t receive an email within a few minutes, please check your spam folder or{' '}
                                    <Link to="/contact" style={{ color: 'var(--accent-color)' }}>
                                        contact us
                                    </Link>{' '}
                                    for assistance.
                                </p>
                                <Link
                                    to="/registration"
                                    className="btn d-flex align-items-center justify-content-center"
                                    style={{
                                        color: 'var(--contrast-color)',
                                        backgroundColor: 'var(--accent-color)',
                                        width: '200px',
                                        height: '50px',
                                        borderRadius: '50px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Return to Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Welcome;
