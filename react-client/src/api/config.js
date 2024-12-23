const API_CONFIG = {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
    endpoints: {
        auth: {
            login: '/auth/login',
            register: '/auth/register',
            refreshToken: '/auth/refresh-token',
            forgotPassword: '/auth/forgot-password',
            resetPassword: '/auth/confirm-password',
        },
        user: {
            profile: '/users/profile',
        },
        payment: {
            createSubscription: '/payments/create-subscription-checkout-session',
            createOneTimePayment: '/payments/create-one-time-checkout-session',
            cancelSubscription: '/payments/cancel-subscription',
            updateSubscription: '/payments/update-subscription',
            verifySession: (sessionId) => `/payments/verify-session/${sessionId}`,
        },
        image: {
            generate: '/image/generate',
            status: (hash) => `/image/status/${hash}`,
            retrieve: (hash) => `/image/retrieve/${hash}`,
        },
    },
};

export default API_CONFIG;