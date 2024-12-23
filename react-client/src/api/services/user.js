import apiClient from '../client';
import API_CONFIG from '../config';

export const userService = {
    async getProfile() {
        return apiClient.request(API_CONFIG.endpoints.user.profile);
    },
};