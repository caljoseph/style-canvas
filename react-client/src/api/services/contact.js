import apiClient from '../client';
import API_CONFIG from '../config';

export const contactService = {
    async sendMessage(formData) {
        return apiClient.request('/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
    }
};