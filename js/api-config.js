// Auto-detect API URL based on current host
const API_CONFIG = {
    getBaseURL: function() {
        const hostname = window.location.hostname;
        const port = '3001';
        
        // If accessing via localhost, use localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://localhost:${port}`;
        }
        
        // Otherwise use the current hostname (network IP)
        return `http://${hostname}:${port}`;
    },
    
    API_URL: null
};

// Initialize API URL
API_CONFIG.API_URL = API_CONFIG.getBaseURL();

console.log('🌐 API URL:', API_CONFIG.API_URL);

// Make it globally available
window.API_CONFIG = API_CONFIG;
