import apiClient from '../client';
import API_CONFIG from '../config';

export const contactService = {
    async sendMessage(formData) {
        return apiClient.request(API_CONFIG.endpoints.contact.send, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: formData.email,
                subject: formData.subject,
                message: formData.message,
                name: formData.name
            })
        });
    }
};