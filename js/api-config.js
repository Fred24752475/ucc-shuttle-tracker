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
window.API_CONFIG = API_CONFIG;

window.readableProblem = function (error) {
    const raw = String((error && error.message) || '');
    if (/failed to fetch|network|abort|timeout|offline/i.test(raw)) {
        return 'We could not reach the shuttle service. Check your internet and try again.';
    }
    if (/sql|token|stack|ECONN|syntax|column|relation|HTTP \d|status code|undefined/i.test(raw)) {
        return 'Something went wrong. Try again in a moment.';
    }
    if (raw && raw.length < 140) return raw;
    return 'Something went wrong. Try again in a moment.';
};
