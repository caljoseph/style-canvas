import API_CONFIG from "./config";

class ApiClient {
    constructor() {
        this.baseUrl = API_CONFIG.baseUrl;
        this.refreshPromise = null;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const accessToken = localStorage.getItem('accessToken');

        // Set up headers
        const headers = {
            ...options.headers,
        };

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        try {
            let response = await fetch(url, {
                ...options,
                headers,
            });

            // Handle 401 with token refresh
            if (response.status === 401 && accessToken) {
                console.log('Got 401, attempting token refresh...');
                const newAccessToken = await this.refreshAccessToken();

                if (!newAccessToken) {
                    console.log('Token refresh failed, redirecting to login...');
                    this.clearTokens();
                    window.location.href = '/registration';
                    throw new Error('Session expired');
                }

                console.log('Token refreshed, retrying original request...');
                // Retry the original request with new token
                headers.Authorization = `Bearer ${newAccessToken}`;
                response = await fetch(url, {
                    ...options,
                    headers,
                });
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Request failed');
            }

            // Handle binary responses (like images)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            }
            return response.blob();

        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        // Prevent multiple refresh calls
        if (this.refreshPromise) {
            console.log('Using existing refresh promise...');
            return this.refreshPromise;
        }

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            console.log('No refresh token found');
            return null;
        }

        console.log('Starting token refresh...');
        this.refreshPromise = (async () => {
            try {
                const response = await fetch(`${this.baseUrl}${API_CONFIG.endpoints.auth.refreshToken}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refreshToken }),
                });

                if (!response.ok) {
                    throw new Error('Failed to refresh token');
                }

                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem('refreshToken', data.refreshToken);
                }
                console.log('Token refresh successful');
                return data.accessToken;
            } catch (error) {
                console.error('Token refresh failed:', error);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                return null;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    clearTokens() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }
}

export default new ApiClient();