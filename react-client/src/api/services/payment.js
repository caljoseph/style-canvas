import apiClient from '../client';
import API_CONFIG from '../config';

const checkAuth = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        throw new Error('Not authenticated');
    }
};

export const paymentService = {
    async createSubscriptionCheckout(lookupKey) {
        checkAuth();
        const data = await apiClient.request(API_CONFIG.endpoints.payment.createSubscription, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lookup_key: lookupKey }),
        });
        return data.sessionUrl;
    },

    async createOneTimeCheckout(lookupKey) {
        checkAuth();
        const data = await apiClient.request(API_CONFIG.endpoints.payment.createOneTimePayment, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lookup_key: lookupKey }),
        });
        return data.sessionUrl;
    },

    async cancelSubscription() {
        checkAuth();
        return apiClient.request(API_CONFIG.endpoints.payment.cancelSubscription, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
    },

    async updateSubscription(lookupKey) {
        checkAuth();
        return apiClient.request(API_CONFIG.endpoints.payment.updateSubscription, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lookup_key: lookupKey }),
        });
    },

    async verifySession(sessionId) {
        checkAuth();
        return apiClient.request(API_CONFIG.endpoints.payment.verifySession(sessionId));
    }
};