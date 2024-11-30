import React from 'react';
import { Link } from 'react-router-dom';

const Welcome = () => {
    return (
        <section className="section">
            <div className="container text-center">
                <h1 className="mb-4">Email Verification Required</h1>
                <p className="lead">Thank you for registering with <strong>StyleCanvasAI</strong>!</p>
                <p className="mb-4">
                    We've sent a verification link to your email address. Please check your inbox
                    and click on the link to verify your email.
                </p>
                <p>
                    If you don't receive an email within a few minutes, please check your spam folder or{' '}
                    <Link to="/contact">contact us</Link> for assistance.
                </p>
                <Link to="/registration" className="btn btn-primary mt-3">
                    Return to Login
                </Link>
            </div>
        </section>
    );
};

export default Welcome;