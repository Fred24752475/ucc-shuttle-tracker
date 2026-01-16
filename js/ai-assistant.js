/**
 * UCC Shuttle Tracker - AI Assistant
 * Smart chatbot with natural language processing and automation
 */

class UCCAIAssistant {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.token = localStorage.getItem('ucc_token') || null;
        this.user = JSON.parse(localStorage.getItem('ucc_user') || 'null');
        this.conversationHistory = [];
        this.isTyping = false;
        this.suggestions = [];
        
        // Predefined responses for common queries
        this.responseTemplates = {
            greeting: [
                "Hello! I'm your UCC Shuttle Assistant. How can I help you today?",
                "Hi there! I'm here to help with shuttle information and booking.",
                "Welcome! I can assist you with rides, schedules, and campus navigation."
            ],
            shuttle_location: [
                "I'll help you find the nearest shuttle. Let me check current shuttle positions...",
                "Let me locate available shuttles for you. Checking the system now...",
                "I can help you track shuttle locations in real-time."
            ],
            booking_help: [
                "To book a ride, select your pickup location and destination from the dashboard.",
                "You can book rides by clicking 'Request Ride' and filling in your details.",
                "Ride booking is simple: choose pickup, destination, and number of passengers."
            ],
            schedule_info: [
                "Shuttles typically run every 10-15 minutes during peak hours.",
                "Current shuttle schedules: Main Gate → Library route every 10 minutes.",
                "Peak hours are 7AM-9AM and 4PM-7PM with increased frequency."
            ],
            emergency: [
                "Emergency support available 24/7. Call campus security at +233-123-4567.",
                "For immediate assistance, contact campus security or use the emergency alert system.",
                "Emergency buttons are located in the help section and dashboard."
            ],
            campus_info: [
                "UCC Main Campus coordinates: 5.6037°N, 0.1870°W",
                "Campus shuttle routes cover all major academic buildings and hostels.",
                "The library shuttle stops at Science Block, Administration, and Main Gate."
            ]
        };
        
        this.init();
    }

    init() {
        console.log('🤖 Initializing AI Assistant...');
        
        if (!this.token || !this.user) {
            console.warn('❌ No authentication found for AI Assistant');
            return;
        }
        
        this.setupEventListeners();
        this.loadConversationHistory();
        this.initializeSuggestions();
        console.log('✅ AI Assistant ready');
    }

    // Setup event listeners
    setupEventListeners() {
        const sendBtn = document.getElementById('aiSendBtn');
        const input = document.getElementById('aiInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.handleUserMessage());
        }
        
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleUserMessage();
                }
            });
            
            // Show suggestions on input focus
            input.addEventListener('focus', () => this.showSuggestions());
            input.addEventListener('blur', () => this.hideSuggestions());
            
            // Auto-suggest as user types
            input.addEventListener('input', (e) => {
                this.updateSuggestions(e.target.value);
            });
        }
    }

    // Load conversation history
    loadConversationHistory() {
        const history = localStorage.getItem('ucc_ai_history');
        if (history) {
            this.conversationHistory = JSON.parse(history);
        }
    }

    // Save conversation history
    saveConversationHistory() {
        localStorage.setItem('ucc_ai_history', JSON.stringify(this.conversationHistory.slice(-20))); // Keep last 20 messages
    }

    // Initialize AI suggestions
    initializeSuggestions() {
        this.suggestions = [
            'Where is the shuttle now?',
            'Book a ride to library',
            'Emergency contact',
            'Shuttle schedule',
            'Campus directions',
            'How long until next shuttle?',
            'Report issue',
            'Lost and found'
        ];
    }

    // Handle user message
    async handleUserMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message to conversation
        this.addMessageToConversation('user', message);
        this.addMessageToUI('user', message);
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Process with AI
        await this.processWithAI(message);
        
        this.hideTypingIndicator();
    }

    // Process message with AI
    async processWithAI(userMessage) {
        try {
            const response = await this.generateAIResponse(userMessage);
            
            // Add AI response to conversation
            this.addMessageToConversation('ai', response);
            this.addMessageToUI('ai', response);
            
            console.log('🤖 AI Response:', response);
        } catch (error) {
            console.error('❌ AI processing error:', error);
            
            // Fallback response
            const fallback = this.getFallbackResponse(userMessage);
            this.addMessageToConversation('ai', fallback);
            this.addMessageToUI('ai', fallback);
        }
    }

    // Generate AI response
    async generateAIResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check for emergency keywords
        if (this.containsEmergencyKeyword(lowerMessage)) {
            return this.responseTemplates.emergency[Math.floor(Math.random() * this.responseTemplates.emergency.length)];
        }
        
        // Check for booking-related keywords
        if (this.containsBookingKeyword(lowerMessage)) {
            return this.responseTemplates.booking_help[Math.floor(Math.random() * this.responseTemplates.booking_help.length)];
        }
        
        // Check for location/shuttle keywords
        if (this.containsLocationKeyword(lowerMessage)) {
            return this.responseTemplates.shuttle_location[Math.floor(Math.random() * this.responseTemplates.shuttle_location.length)];
        }
        
        // Check for schedule keywords
        if (this.containsScheduleKeyword(lowerMessage)) {
            return this.responseTemplates.schedule_info[Math.floor(Math.random() * this.responseTemplates.schedule_info.length)];
        }
        
        // Check for campus info keywords
        if (this.containsCampusKeyword(lowerMessage)) {
            return this.responseTemplates.campus_info[Math.floor(Math.random() * this.responseTemplates.campus_info.length)];
        }
        
        // Default greeting or general response
        if (this.containsGreetingKeyword(lowerMessage)) {
            return this.responseTemplates.greeting[Math.floor(Math.random() * this.responseTemplates.greeting.length)];
        }
        
        // Generate contextual response based on message content
        return this.generateContextualResponse(lowerMessage);
    }

    // Check for emergency keywords
    containsEmergencyKeyword(message) {
        const emergencyKeywords = ['emergency', 'help urgent', 'danger', 'police', 'security', 'accident', 'sick', 'medical'];
        return emergencyKeywords.some(keyword => message.includes(keyword));
    }

    // Check for booking keywords
    containsBookingKeyword(message) {
        const bookingKeywords = ['book', 'reserve', 'ride', 'request', 'pickup', 'destination'];
        return bookingKeywords.some(keyword => message.includes(keyword));
    }

    // Check for location keywords
    containsLocationKeyword(message) {
        const locationKeywords = ['where', 'location', 'shuttle', 'track', 'find', 'position'];
        return locationKeywords.some(keyword => message.includes(keyword));
    }

    // Check for schedule keywords
    containsScheduleKeyword(message) {
        const scheduleKeywords = ['schedule', 'time', 'when', 'frequency', 'arrival', 'departure'];
        return scheduleKeywords.some(keyword => message.includes(keyword));
    }

    // Check for campus keywords
    containsCampusKeyword(message) {
        const campusKeywords = ['campus', 'directions', 'building', 'library', 'gate', 'hostel'];
        return campusKeywords.some(keyword => message.includes(keyword));
    }

    // Check for greeting keywords
    containsGreetingKeyword(message) {
        const greetingKeywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
        return greetingKeywords.some(keyword => message.includes(keyword));
    }

    // Generate contextual response
    generateContextualResponse(message) {
        // Natural language processing simulation
        if (message.includes('library')) {
            return "The library shuttle runs every 10 minutes from Main Gate. Current wait time is approximately 5 minutes.";
        }
        
        if (message.includes('how long') || message.includes('wait')) {
            return "Based on current shuttle tracking, the next available shuttle should arrive within 5-10 minutes depending on your location.";
        }
        
        if (message.includes('emergency')) {
            return "For emergencies, please call campus security at +233-123-4567 or press the emergency button in your dashboard.";
        }
        
        if (message.includes('lost')) {
            return "If you're lost, I can help guide you. What's your current location or destination?";
        }
        
        // Default helpful response
        const defaultResponses = [
            "I'm here to help with your UCC shuttle needs. You can ask me about schedules, locations, or booking assistance.",
            "I can help you navigate campus services and find the best shuttle routes for your needs.",
            "Feel free to ask about shuttle times, campus directions, or report any issues you're experiencing."
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }

    // Add message to conversation
    addMessageToConversation(sender, message) {
        this.conversationHistory.push({
            sender,
            message,
            timestamp: new Date().toISOString()
        });
        this.saveConversationHistory();
    }

    // Add message to UI
    addMessageToUI(sender, message) {
        const messagesContainer = document.getElementById('aiMessages');
        if (!messagesContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `ai-message ${sender}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (sender === 'user') {
            messageEl.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="sender-name">You</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-text">${message}</div>
                </div>
            `;
        } else {
            messageEl.innerHTML = `
                <div class="ai-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="sender-name">AI Assistant</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-text">${this.formatMessageWithEmojis(message)}</div>
                </div>
            `;
        }
        
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Format message with emojis
    formatMessageWithEmojis(message) {
        // Add contextual emojis
        return message
            .replace(/shuttle/gi, '🚌')
            .replace(/bus/gi, '🚌')
            .replace(/emergency/gi, '🚨')
            .replace(/help/gi, '🆘')
            .replace(/time/gi, '⏰')
            .replace(/location/gi, '📍')
            .replace(/direction/gi, '🧭');
    }

    // Show typing indicator
    showTypingIndicator() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) {
            indicator.style.display = 'flex';
        }
    }

    // Hide typing indicator
    hideTypingIndicator() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Update suggestions based on input
    updateSuggestions(input) {
        const suggestionsContainer = document.getElementById('aiSuggestions');
        if (!suggestionsContainer) return;

        const filteredSuggestions = this.suggestions.filter(suggestion => 
            suggestion.toLowerCase().includes(input.toLowerCase())
        );

        if (input.length > 0 && filteredSuggestions.length > 0) {
            suggestionsContainer.innerHTML = filteredSuggestions
                .slice(0, 5)
                .map(suggestion => `<span class="suggestion-item">${suggestion}</span>`)
                .join('');
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    }

    // Show suggestions
    showSuggestions() {
        const suggestionsContainer = document.getElementById('aiSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = this.suggestions
                .map(suggestion => `<span class="suggestion-item">${suggestion}</span>`)
                .join('');
            suggestionsContainer.style.display = 'block';
        }
    }

    // Hide suggestions
    hideSuggestions() {
        const suggestionsContainer = document.getElementById('aiSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    // Get fallback response
    getFallbackResponse(message) {
        return "I'm here to help with your UCC shuttle needs. Please try asking about schedules, locations, or booking assistance.";
    }
}

// Initialize AI Assistant when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uccAIAssistant === 'undefined') {
        window.uccAIAssistant = new UCCAIAssistant();
    }
});