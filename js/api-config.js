// Auto-detect API URL based on current host
const API_CONFIG = {
    getBaseURL: function() {
        const hostname = window.location.hostname;
        
        // If accessing via localhost, use localhost with port
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://localhost:3001`;
        }
        
        // For Render or other hosting, use the hostname without port
        // Render handles the port automatically
        const protocol = window.location.protocol; // http: or https:
        return `${protocol}//${hostname}`;
    },
    
    API_URL: null
};

// Initialize API URL
API_CONFIG.API_URL = API_CONFIG.getBaseURL();

console.log('🌐 API URL:', API_CONFIG.API_URL);

// Make it globally available
window.API_CONFIG = API_CONFIG;
