// api/services/image.js
import apiClient from '../client';
import API_CONFIG from '../config';

export const imageService = {
    async generateImage(imageBlob, modelName) {
        const formData = new FormData();
        formData.append('image', imageBlob, 'image.png');
        formData.append('modelName', modelName);

        return apiClient.request(API_CONFIG.endpoints.image.generate, {
            method: 'POST',
            body: formData
        });
    },

    async checkStatus(requestHash) {
        return apiClient.request(API_CONFIG.endpoints.image.status(requestHash));
    },

    async retrieveImage(requestHash) {
        return apiClient.request(API_CONFIG.endpoints.image.retrieve(requestHash));
    }
};