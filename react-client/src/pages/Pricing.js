import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../api/services'

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
            // Make sure we have auth tokens
            if (!localStorage.getItem('accessToken')) {
                throw new Error('Not authenticated');
            }

            const data = await paymentService.verifySession(sessionId);

            let message;
            if (data.type === 'subscription') {
                message = 'Thank you for your purchase! Your subscription is now active.';
            } else {
                message = 'Thank you for your purchase! Credits have been added to your account.';
            }

            localStorage.setItem('justPurchased', JSON.stringify({
                message,
                type: 'success'
            }));

            // Instead of reloading the whole page, just change the URL
            window.history.replaceState({}, '', '/pricing');
            // Refresh the page only if specified
            if (data.shouldReload) {
                window.location.reload();
            }
        } catch (error) {
            console.error("[verifyPaymentSession] Error:", error);

            if (error.message === 'Not authenticated') {
                // Handle authentication error
                localStorage.setItem('justPurchased', JSON.stringify({
                    message: 'Session expired. Please log in again and check your account for updates.',
                    type: 'warning'
                }));
                navigate('/registration');
                return;
            }

            localStorage.setItem('justPurchased', JSON.stringify({
                message: 'Could not verify payment. Please contact support if credits are missing.',
                type: 'error'
            }));
            window.history.replaceState({}, '', '/pricing');
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
        try {
            const sessionUrl = plan.type === 'subscription'
                ? await paymentService.createSubscriptionCheckout(plan.lookupKey)
                : await paymentService.createOneTimeCheckout(plan.lookupKey);

            console.log("[handlePurchase] Received sessionUrl:", sessionUrl);
            window.location.href = sessionUrl;
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
                        await paymentService.cancelSubscription();

                        console.log("[handleAction/cancel callback] Subscription cancelled successfully...");
                        localStorage.setItem('justPurchased', JSON.stringify({
                            message: 'Subscription cancelled successfully! You will no longer be billed.',
                            type: 'success'
                        }));
                        console.log("[handleAction/cancel callback] Reloading page...");
                        window.location.href = '/pricing'; // Full reload
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
                            await paymentService.updateSubscription(plan.lookupKey);

                            console.log("[handleAction/change callback] Subscription updated successfully...");
                            localStorage.setItem('justPurchased', JSON.stringify({
                                message: 'Subscription updated successfully! Changes will take effect on your next billing cycle.',
                                type: 'success'
                            }));
                            console.log("[handleAction/change callback] Reloading page...");
                            window.location.href = '/pricing'; // Full reload
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
