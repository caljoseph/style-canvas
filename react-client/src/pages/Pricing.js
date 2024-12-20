import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Config from "../config";

const Pricing = () => {
    console.log("[Pricing.js] Rendering component...");

    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ type: '', plan: '', callback: null });
    const subscriptionType = user?.subscriptionType || "none";
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

    // Check localStorage whenever the location changes to show toast
    useEffect(() => {
        console.log("[useEffect - location] Checking localStorage for justPurchased on each navigation...");
        const justPurchased = localStorage.getItem('justPurchased');
        console.log("[useEffect - location] justPurchased in localStorage:", justPurchased);
        if (justPurchased) {
            const parsed = JSON.parse(justPurchased);
            console.log("[useEffect - location] Found justPurchased:", parsed);
            showToast(parsed.message, parsed.type);
            console.log("[useEffect - location] Removing justPurchased from localStorage...");
            localStorage.removeItem('justPurchased');
        } else {
            console.log("[useEffect - location] No justPurchased found in localStorage.");
        }
    }, [location]);

    // Check query params for payment verification
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const payment = params.get('payment');
        const sessionId = params.get('session_id');

        console.log("[useEffect - location change] Current URL:", window.location.href);
        console.log("[useEffect - location change] Payment:", payment, "Session ID:", sessionId);

        if (payment === 'success' && sessionId) {
            console.log("[useEffect - location change] Detected success payment with session_id. Verifying session...");
            verifyPaymentSession(sessionId);
        } else if (payment === 'cancelled') {
            console.log("[useEffect - location change] Payment cancelled. Setting localStorage and reloading...");
            localStorage.setItem('justPurchased', JSON.stringify({
                message: 'Payment cancelled.',
                type: 'info'
            }));
            window.location.href = '/pricing'; // Full reload
        } else {
            console.log("[useEffect - location change] No payment success or cancelled detected.");
        }
    }, [location]);

    const verifyPaymentSession = async (sessionId) => {
        console.log("[verifyPaymentSession] Verifying session:", sessionId);
        try {
            const response = await fetch(`${Config.apiUrl}/payments/verify-session/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                }
            });

            console.log("[verifyPaymentSession] Response status:", response.status);
            if (response.ok) {
                const data = await response.json();
                console.log("[verifyPaymentSession] Session data:", data);
                let message;
                if (data.type === 'subscription') {
                    message = 'Thank you for your purchase! Your subscription is now active.';
                } else {
                    message = 'Thank you for your purchase! Credits have been added to your account.';
                }

                console.log("[verifyPaymentSession] Setting justPurchased in localStorage with message:", message);
                localStorage.setItem('justPurchased', JSON.stringify({
                    message: message,
                    type: 'success'
                }));
                console.log("[verifyPaymentSession] Reloading page...");
                window.location.href = '/pricing';
            } else {
                throw new Error('Payment verification failed.');
            }
        } catch (error) {
            console.error("[verifyPaymentSession] Error verifying payment:", error);
            console.log("[verifyPaymentSession] Setting error in justPurchased and reloading...");
            localStorage.setItem('justPurchased', JSON.stringify({
                message: 'Could not verify payment. Please contact support if credits are missing.',
                type: 'error'
            }));
            window.location.href = '/pricing';
        }
    };

    const showToast = (message, type) => {
        console.log("[showToast] Showing toast with message:", message, "type:", type);
        setToast({ message, type });
        setTimeout(() => {
            console.log("[showToast] Hiding toast after timeout");
            setToast(null);
        }, 5000);
    };

    useEffect(() => {
        console.log("[useEffect - toast change] Current toast state:", toast);
    }, [toast]);

    const handlePurchase = async (plan) => {
        console.log("[handlePurchase] Initiating purchase for plan:", plan);
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

            console.log("[handlePurchase] Response status:", response.status);

            if (!response.ok) {
                console.error("[handlePurchase] Failed to create checkout session");
                throw new Error('Failed to create checkout session');
            }

            const data = await response.json();
            console.log("[handlePurchase] Received sessionUrl:", data.sessionUrl);
            window.location.href = data.sessionUrl;
        } catch (error) {
            console.error("[handlePurchase] Error:", error);
            showToast('An error occurred while processing your request.', 'error');
        }
    };

    const handleAction = (action, plan) => {
        console.log("[handleAction] Action:", action, "Plan:", plan.title);
        let callback;

        switch (action) {
            case 'cancel':
                console.log("[handleAction] Preparing to cancel subscription...");
                callback = async () => {
                    console.log("[handleAction/cancel callback] Attempting to cancel subscription...");
                    try {
                        const response = await fetch(Config.apiUrl + '/payments/cancel-subscription', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                            },
                        });

                        console.log("[handleAction/cancel callback] Response status:", response.status);
                        if (response.ok) {
                            console.log("[handleAction/cancel callback] Subscription cancelled successfully...");
                            localStorage.setItem('justPurchased', JSON.stringify({
                                message: 'Subscription cancelled successfully. You will no longer be billed.',
                                type: 'success'
                            }));
                            console.log("[handleAction/cancel callback] Reloading page...");
                            window.location.href = '/pricing'; // Full reload
                        } else {
                            console.error("[handleAction/cancel callback] Failed to cancel subscription");
                            throw new Error('Failed to cancel subscription');
                        }
                    } catch (error) {
                        console.error("[handleAction/cancel callback] Error:", error);
                        showToast('An error occurred while cancelling the subscription.', 'error');
                    }
                };
                break;

            case 'change':
                // If user has no subscription, "change" means "add" a new subscription.
                if (subscriptionType === 'none') {
                    console.log("[handleAction/change] User has no subscription, treating as new subscription purchase...");
                    callback = () => handlePurchase(plan);
                } else {
                    console.log("[handleAction/change] User has a subscription, updating it...");
                    callback = async () => {
                        console.log("[handleAction/change callback] Attempting to update subscription...");
                        try {
                            const response = await fetch(Config.apiUrl + '/payments/update-subscription', {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                                },
                                body: JSON.stringify({ lookup_key: plan.lookupKey }),
                            });

                            console.log("[handleAction/change callback] Response status:", response.status);
                            if (response.ok) {
                                console.log("[handleAction/change callback] Subscription updated successfully...");
                                localStorage.setItem('justPurchased', JSON.stringify({
                                    message: 'Subscription updated successfully. Changes will take effect on your next billing cycle.',
                                    type: 'success'
                                }));
                                console.log("[handleAction/change callback] Reloading page...");
                                window.location.href = '/pricing'; // Full reload
                            } else {
                                console.error("[handleAction/change callback] Failed to change subscription");
                                throw new Error('Failed to change subscription');
                            }
                        } catch (error) {
                            console.error("[handleAction/change callback] Error:", error);
                            showToast('An error occurred while changing the subscription.', 'error');
                        }
                    };
                }
                break;

            default:
                console.log("[handleAction] Default action - will purchase plan.");
                callback = () => handlePurchase(plan);
        }

        console.log("[handleAction] Setting confirmAction state and showing modal...");
        setConfirmAction({ type: action, plan: plan.title, callback });
        setShowConfirmModal(true);
    };

    const renderPlanButton = (plan) => {
        const isCurrentPlan = plan.lookupKey === subscriptionType;
        const isSubscription = plan.type === "subscription";
        const hasNoSubscription = subscriptionType === "none";

        if (!user) {
            // Redirect to login when not logged in
            return (
                <button className="buy-btn" onClick={() => navigate('/login')}>
                    Log in to Purchase
                </button>
            );
        }

        if (isCurrentPlan) {
            // Current subscription plan: show Cancel Subscription
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
            // Different subscription plan: show Add or Change Subscription depending on if user has one
            return (
                <button
                    className="buy-btn"
                    onClick={() => handleAction('change', plan)}
                >
                    {hasNoSubscription ? 'Add Subscription' : 'Change Subscription'}
                </button>
            );
        }

        // For one-time purchase plans
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

    console.log("[Pricing.js] Ready to render JSX...");
    return (
        <section id="pricing" className="pricing section">
            <div className="container section-title" data-aos="fade-up">
                <h2>Pricing</h2>
                {!user && <p>Please log in to purchase a plan. You can still view the pricing below.</p>}
                {user && <p>Choose the package that suits you best:</p>}
            </div>

            {toast && (
                <div className={`my-toast-container show`}>
                    {console.log("[Pricing.js] Rendering toast:", toast)}
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
                        ? `Are you sure you want to cancel your subscription for the ${confirmAction.plan}? You will no longer be billed.`
                        : (subscriptionType === "none"
                            ? `Are you sure you want to add the ${confirmAction.plan}?`
                            : `Are you sure you want to change your subscription to the ${confirmAction.plan}? Changes will take effect on your next billing cycle.`)}
                </Modal.Body>
                <Modal.Footer>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            console.log("[Modal Confirm] User confirmed action:", confirmAction.type, "on plan:", confirmAction.plan);
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
