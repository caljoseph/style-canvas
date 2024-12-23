// api/services/auth.js
import apiClient from '../client';
import API_CONFIG from '../config';

export const authService = {
    async login(email, password) {
        try {
            const data = await apiClient.request(API_CONFIG.endpoints.auth.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            // Save tokens on successful login
            if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
            }

            return data;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },

    async register(email, password) {
        try {
            const data = await apiClient.request(API_CONFIG.endpoints.auth.register, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            // Save tokens on successful registration
            if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
            }

            return data;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    },

    async forgotPassword(email) {
        try {
            return await apiClient.request(API_CONFIG.endpoints.auth.forgotPassword, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
        } catch (error) {
            console.error('Forgot password failed:', error);
            throw error;
        }
    },

    async resetPassword(email, code, newPassword) {
        try {
            return await apiClient.request(API_CONFIG.endpoints.auth.resetPassword, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    confirmationCode: code.toString(),
                    newPassword
                }),
            });
        } catch (error) {
            console.error('Reset password failed:', error);
            throw error;
        }
    },

    async refreshToken(refreshToken) {
        try {
            const data = await apiClient.request(API_CONFIG.endpoints.auth.refreshToken, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
            }

            return data;
        } catch (error) {
            console.error('Token refresh failed:', error);
            throw error;
        }
    },

    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },

    isAuthenticated() {
        return !!localStorage.getItem('accessToken');
    },

    getAccessToken() {
        return localStorage.getItem('accessToken');
    },

    getRefreshToken() {
        return localStorage.getItem('refreshToken');
    }
};