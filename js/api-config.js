// Same origin as the page. On Render the Node server serves both the
// pages and /api, so requests stay relative.
const API_CONFIG = {
    getBaseURL: function() {
        return '';
    },
    
    API_URL: null
};

// Initialize API URL
API_CONFIG.API_URL = API_CONFIG.getBaseURL();

console.log('🌐 API URL:', API_CONFIG.API_URL);

// Make it globally available
window.API_CONFIG = API_CONFIG;
