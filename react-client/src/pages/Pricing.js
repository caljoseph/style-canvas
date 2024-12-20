import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Config from "../config";
import './Pricing.css'; // Add CSS for toast styling

const Pricing = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ type: '', plan: '', callback: null });
    const [subscriptionType, setSubscriptionType] = useState(null);
    const [toast, setToast] = useState(null);

    const plans = [
        {
            title: "Standard Plan",
            credits: "70 credits per month",
            price: "$20/month ($0.29 per credit)",
            type: "subscription",
            lookupKey: "standard_monthly",
        },
        {
            title: "Pro Plan",
            credits: "150 credits per month",
            price: "$35/month ($0.23 per credit)",
            type: "subscription",
            lookupKey: "pro_monthly",
        },
        {
            title: "Premium Plan",
            credits: "200 credits per month",
            price: "$50/month ($0.25 per credit)",
            type: "subscription",
            lookupKey: "premium_monthly",
        },
        {
            title: "Pay-As-You-Go (Single Credit)",
            credits: "1 credit",
            price: "$1.99 USD per credit",
            type: "one_time",
            lookupKey: "single_token",
        },
        {
            title: "Pay-As-You-Go (10 Credits)",
            credits: "10 credits",
            price: "$14.99 USD ($1.49 per credit)",
            type: "one_time",
            lookupKey: "ten_tokens",
        },
    ];

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const payment = params.get('payment');
        const sessionId = params.get('session_id');

        console.log('Current URL:', window.location.href); // Debug log
        console.log('Payment:', payment, 'Session ID:', sessionId); // Debug log

        if (payment === 'success' && sessionId) {
            verifyPaymentSession(sessionId);
        } else if (payment === 'cancelled') {
            showToast('Payment cancelled.', 'info');
            setTimeout(() => {
                navigate(location.pathname, { replace: true });
            }, 5000);
        }
    }, [location, navigate]);

    const verifyPaymentSession = async (sessionId) => {
        try {
            const response = await fetch(`${Config.apiUrl}/payments/verify-session/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.type === 'subscription') {
                    showToast('Thank you for your purchase! Your subscription is now active.', 'success');
                } else {
                    showToast('Thank you for your purchase! Credits have been added to your account.', 'success');
                }
            } else {
                throw new Error('Payment verification failed.');
            }
        } catch (error) {
            showToast('Could not verify payment. Please contact support if credits are missing.', 'error');
            console.error('Verification error:', error);
        } finally {
            setTimeout(() => {
                navigate(location.pathname, { replace: true });
            }, 5000);
        }
    };

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 5000);
    };

    const handlePurchase = async (plan) => {
        const endpoint = plan.type === 'subscription'
            ? '/payments/create-subscription-checkout-session'
            : '/payments/create-one-time-checkout-session';

        try {
            const response = await fetch(Config.apiUrl + endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({ lookup_key: plan.lookupKey }),
            });

            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }

            const data = await response.json();
            window.location.href = data.sessionUrl;
        } catch (error) {
            showToast('An error occurred while processing your request.', 'error');
            console.error(error);
        }
    };

    const handleAction = (action, plan) => {
        let callback;

        switch (action) {
            case 'cancel':
                callback = async () => {
                    try {
                        const response = await fetch(Config.apiUrl + '/payments/cancel-subscription', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                            },
                        });

                        if (response.ok) {
                            showToast('Subscription cancelled successfully.', 'success');
                            setTimeout(() => {
                                navigate(location.pathname, { replace: true });
                            }, 5000);
                        } else {
                            throw new Error('Failed to cancel subscription');
                        }
                    } catch (error) {
                        showToast('An error occurred while cancelling the subscription.', 'error');
                    }
                };
                break;

            case 'change':
                callback = async () => {
                    try {
                        const response = await fetch(Config.apiUrl + '/payments/update-subscription', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                            },
                            body: JSON.stringify({ lookup_key: plan.lookupKey }),
                        });

                        if (response.ok) {
                            showToast('Subscription updated successfully.', 'success');
                            setTimeout(() => {
                                navigate(location.pathname, { replace: true });
                            }, 5000);
                        } else {
                            throw new Error('Failed to change subscription');
                        }
                    } catch (error) {
                        showToast('An error occurred while changing the subscription.', 'error');
                    }
                };
                break;

            default:
                callback = () => handlePurchase(plan);
        }

        setConfirmAction({ type: action, plan: plan.title, callback });
        setShowConfirmModal(true);
    };

    const renderPlanButton = (plan) => {
        const isCurrentPlan = plan.lookupKey === subscriptionType;
        const isSubscription = plan.type === "subscription";
        const hasNoSubscription = subscriptionType === "none";

        if (!user) {
            return <button className="buy-btn" disabled>Log in to Purchase</button>;
        }

        if (isCurrentPlan) {
            return (
                <button
                    className="buy-btn"
                    onClick={() => handleAction('cancel', plan)}
                >
                    Cancel Subscription
                </button>
            );
        }

        if (isSubscription) {
            return (
                <button
                    className="buy-btn"
                    onClick={() => handleAction('change', plan)}
                >
                    {hasNoSubscription ? 'Add Subscription' : 'Change Subscription'}
                </button>
            );
        }

        return (
            <button
                className="buy-btn"
                onClick={() => handlePurchase(plan)}
            >
                Buy Now
            </button>
        );
    };

    const renderPlanBadge = (plan) => {
        if (!user) return null;
        if (plan.lookupKey === subscriptionType) {
            return <span className="badge current-badge">Your Plan</span>;
        }
        if (plan.type === "subscription") {
            return <span className="badge upgrade-badge">Upgrade</span>;
        }
        return null;
    };

    return (
        <section id="pricing" className="pricing section">
            <div className="container section-title" data-aos="fade-up">
                <h2>Pricing</h2>
                {!user && <p>Please log in to purchase a plan. You can still view the pricing below.</p>}
                {user && <p>Choose the package that suits you best:</p>}
            </div>

            {toast && (
                <div className={`toast toast-${toast.type} slide-in`}>{toast.message}</div>
            )}

            <div className="container">
                <div className="row gy-4">
                    {plans.map((plan, index) => {
                        const isCurrentPlan = plan.lookupKey === subscriptionType;

                        return (
                            <div key={index} className="col-lg-4">
                                <div className={`pricing-item featured ${isCurrentPlan ? 'current-plan' : 'other-plan'}`}>
                                    <h3>{plan.title}</h3>
                                    <h4>
                                        <span>{plan.credits}</span>
                                        {plan.price}
                                    </h4>
                                    {renderPlanButton(plan)}
                                    {renderPlanBadge(plan)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {confirmAction.type === 'cancel'
                            ? 'Cancel Subscription'
                            : (subscriptionType === "none" ? 'Add Subscription' : 'Change Subscription')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {confirmAction.type === 'cancel'
                        ? `Are you sure you want to cancel your subscription for the ${confirmAction.plan}?`
                        : (subscriptionType === "none"
                            ? `Are you sure you want to add the ${confirmAction.plan}?`
                            : `Are you sure you want to change your subscription to the ${confirmAction.plan}? This will go into effect on your next billing cycle.`)}
                </Modal.Body>
                <Modal.Footer>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            confirmAction.callback();
                            setShowConfirmModal(false);
                        }}
                    >
                        Confirm
                    </button>
                </Modal.Footer>
            </Modal>
        </section>
    );
};

export default Pricing;
