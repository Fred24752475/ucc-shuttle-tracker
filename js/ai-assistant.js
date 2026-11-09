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
                "Hey there! 👋 I'm your UCC 🚌 shuttle buddy. What's going on today?"
            ],
            shuttle_location: [
                "Open the shuttle list or the map. Live UCC-BRT buses move on the campus loop. Tap a bus to follow it. Every bus stays on the map, and the one you pick is highlighted."
            ],
            booking_help: [
                "Students do not book rides in this app. Open My stop and choose West Gate, East Gate, Administration, Science, Library, Hospital, or Halls. Then tap a bus in the shuttle list to follow it. A banner appears on the screen once when a bus is about 5 minutes from your saved stop. It is not a phone alert."
            ],
            schedule_info: [
                "There is no timetable to book. The buses run on the campus loop, and the live list shows which ones are on the road. A banner appears once when a bus is about 5 minutes from your saved stop."
            ],
            emergency: [
                "Use the Emergency Alert button on the student dashboard. That sends an alert from the app."
            ],
            campus_info: [
                "My stop choices are West Gate, East Gate, Administration, Science, Library, Hospital, and Halls. Saving stores that stop. The map shows the live campus buses."
            ],
            fare: [
                "The fare is GH₵2. You do not book a ride in this app. Save My stop and follow a bus on the map."
            ],
            messages: [
                "You can message another student after they accept your friend request. You can message a driver directly. Admins are not in chat."
            ],
            profile: [
                "Login is your email and password. Signup and password reset use a 6-digit code from email. Your profile has your photo, details, password, and logout. There is no Google sign-in. If you have no photo, the default picture is used."
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
            'Where are the shuttles?',
            'How do I save my stop?',
            'How do I follow a bus?',
            'How does the 5 minute banner work?',
            'How do messages work?',
            'What is the fare?'
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
        
        if (this.containsEmergencyKeyword(lowerMessage)) {
            return this.responseTemplates.emergency[0];
        }

        if (/(fare|price|cost|pay|cedi)/.test(lowerMessage)) {
            return this.responseTemplates.fare[0];
        }

        if (/(message|chat|friend)/.test(lowerMessage)) {
            return this.responseTemplates.messages[0];
        }

        if (/(profile|photo|password|login|sign up|signup|code)/.test(lowerMessage)) {
            return this.responseTemplates.profile[0];
        }
        
        if (this.containsBookingKeyword(lowerMessage)) {
            return this.responseTemplates.booking_help[0];
        }
        
        // Check for location/shuttle keywords
        if (this.containsLocationKeyword(lowerMessage)) {
            return this.responseTemplates.shuttle_location[0];
        }
        
        if (this.containsScheduleKeyword(lowerMessage)) {
            return this.responseTemplates.schedule_info[0];
        }
        
        if (this.containsCampusKeyword(lowerMessage)) {
            return this.responseTemplates.campus_info[0];
        }
        
        if (this.containsGreetingKeyword(lowerMessage)) {
            return this.responseTemplates.greeting[0];
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
        const bookingKeywords = ['book', 'reserve', 'ride', 'request ride'];
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
        if (message.includes('library') || message.includes('gate') || message.includes('hospital') || message.includes('hall')) {
            return "That is one of the My stop choices: West Gate, East Gate, Administration, Science, Library, Hospital, and Halls. Open My stop to save it.";
        }
        
        if (message.includes('how long') || message.includes('wait') || message.includes('banner')) {
            return "A banner appears on the screen once when a bus is about 5 minutes from your saved stop. It is not a phone alert.";
        }
        
        if (message.includes('driver')) {
            return "Drivers have a live campus map and can start or stop their route. They do not accept bookings. You can message a driver directly.";
        }

        if (message.includes('admin')) {
            return "Admins see users, the fleet, drivers, a live tracking map, and reports. They are not in chat, and there is no booking queue.";
        }
        
        return "I only know this shuttle app. Save a stop, follow a bus on the map, or ask about messages and your profile.";
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
                        <span class="sender-name">UCC shuttle buddy</span>
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
        return message;
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
        return "Hey there! 👋 I'm your UCC 🚌 shuttle buddy. What's going on today?";
    }
}

// Initialize AI Assistant when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uccAIAssistant === 'undefined') {
        window.uccAIAssistant = new UCCAIAssistant();
    }
});