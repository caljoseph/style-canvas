// config.js

// Create a global object to hold our configuration
window.AppConfig = {
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',

    get API_BASE_URL() {
        return this.isDevelopment ? 'http://localhost:3000' : 'https://stylecanvasai.com';
    },

    getApiUrl: function(endpoint) {
        return `${this.API_BASE_URL}${endpoint}`;
    }
};