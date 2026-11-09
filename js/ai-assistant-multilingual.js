// Multilingual Realistic AI Assistant
class MultilingualAIAssistant {
    constructor() {
        this.conversationHistory = [];
        this.userPreferences = {};
        this.currentContext = {};
        this.currentLanguage = localStorage.getItem('ucc_language') || 'en';
        this.personalityTraits = {
            helpfulness: 0.9,
            friendliness: 0.8,
            casualness: 0.7,
            humor: 0.6
        };
        this.responses = this.initializeResponses();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserPreferences();
        this.updateLanguage();
        this.startConversation();
    }
    
    updateLanguage() {
        this.currentLanguage = localStorage.getItem('ucc_language') || 'en';
        // Listen for language changes
        document.addEventListener('languageChanged', () => {
            this.currentLanguage = localStorage.getItem('ucc_language') || 'en';
        });
    }

    initializeResponses() {
        const buddy = "Hey there! 👋 I'm your UCC 🚌 shuttle buddy. What's going on today?";
        const facts = {
            welcome: [buddy],
            emergency: [
                "Use the Emergency Alert button on the student dashboard. That sends an alert from the app."
            ],
            greeting: [buddy],
            location: [
                "Open the shuttle list or the map. Live UCC-BRT buses move on the campus loop. Tap a bus to follow it. Every bus stays on the map, and the one you pick is highlighted."
            ],
            booking: [
                "Students do not book rides in this app. Open My stop and choose West Gate, East Gate, Administration, Science, Library, Hospital, or Halls. Then tap a bus in the shuttle list to follow it. A banner appears on the screen once when a bus is about 5 minutes from your saved stop. It is not a phone alert."
            ],
            schedule: [
                "There is no timetable to book. The buses run on the campus loop, and the live list shows which ones are on the road. A banner appears once when a bus is about 5 minutes from your saved stop."
            ],
            help: [
                "I can explain My stop, following a bus, the 5 minute banner, messages, and your profile. What do you want to know?"
            ],
            thanks: [
                "You're welcome."
            ],
            casual: [
                "I'm your UCC shuttle buddy. Ask me about your stop, the live buses, or messages."
            ],
            fare: [
                "The fare is GH₵2. You do not book a ride in this app. Save My stop and follow a bus on the map."
            ],
            messages: [
                "You can message another student after they accept your friend request. You can message a driver directly. Admins are not in chat."
            ],
            profile: [
                "Login is your email and password. Signup and password reset use a 6-digit code from email. Your profile has your photo, details, password, and logout. There is no Google sign-in. If you have no photo, the default picture is used."
            ],
            default: [
                "I only know this shuttle app. Save a stop, follow a bus on the map, and message students after they accept a friend request, or message a driver directly."
            ]
        };
        return {
            en: facts,
            fr: facts,
            tw: facts,
            es: facts
        };
    }

    setupEventListeners() {
        const input = document.getElementById('aiInput');
        const sendBtn = document.getElementById('aiSendBtn');

        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleUserMessage();
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.handleUserMessage());
        }
    }

    startConversation() {
        const list = document.getElementById('aiMessages');
        if (list && list.textContent.indexOf('shuttle buddy') !== -1) return;
        this.addMessage('bot', "Hey there! 👋 I'm your UCC 🚌 shuttle buddy. What's going on today?");
    }

    handleUserMessage() {
        if (window.sendSimpleAI) return;
        const input = document.getElementById('aiInput');
        const message = input?.value.trim();
        
        if (!message) return;

        this.addMessage('user', message);
        input.value = '';
        
        this.conversationHistory.push({ role: 'user', content: message });
        this.showTyping();
        
        setTimeout(() => {
            this.hideTyping();
            const response = this.generateRealisticResponse(message);
            this.addMessage('bot', response);
            this.conversationHistory.push({ role: 'bot', content: response });
        }, this.getTypingDelay());
    }

    generateRealisticResponse(message) {
        // Update current language
        this.currentLanguage = localStorage.getItem('ucc_language') || 'en';
        
        const lowerMessage = message.toLowerCase();
        const context = this.analyzeContext(lowerMessage);
        
        if (context.isEmergency) {
            return this.getRandomItem(this.responses[this.currentLanguage].emergency);
        }
        
        if (context.isGreeting) {
            return "Hey there! 👋 I'm your UCC 🚌 shuttle buddy. What's going on today?";
        }

        if (context.isFare) {
            return this.getRandomItem(this.responses[this.currentLanguage].fare);
        }

        if (context.isMessage) {
            return this.getRandomItem(this.responses[this.currentLanguage].messages);
        }

        if (context.isProfile) {
            return this.getRandomItem(this.responses[this.currentLanguage].profile);
        }
        
        if (context.isLocationQuery) {
            return this.getRandomItem(this.responses[this.currentLanguage].location);
        }
        
        if (context.isBookingRequest) {
            return this.getRandomItem(this.responses[this.currentLanguage].booking);
        }
        
        if (context.isScheduleQuery) {
            return this.getRandomItem(this.responses[this.currentLanguage].schedule);
        }
        
        if (context.isHelpRequest) {
            return this.getRandomItem(this.responses[this.currentLanguage].help);
        }
        
        if (context.isCasualChat) {
            if (lowerMessage.includes('thank')) {
                return this.getRandomItem(this.responses[this.currentLanguage].thanks);
            }
            return this.getRandomItem(this.responses[this.currentLanguage].casual);
        }
        
        return this.getRandomItem(this.responses[this.currentLanguage].default);
    }

    analyzeContext(message) {
        return {
            isEmergency: /emergency|urgent|help me|stuck|accident|danger/.test(message),
            isGreeting: /^(hi|hello|hey|good morning|good afternoon|good evening|sup|what's up|salut|bonjour|hola|ɛhe|akwaaba)/.test(message),
            isFare: /(fare|price|cost|pay|cedi)/.test(message),
            isMessage: /(message|chat|friend|driver)/.test(message),
            isProfile: /(profile|photo|password|login|sign up|signup|code)/.test(message),
            isLocationQuery: /(where|location|find|nearest|closest|track|shuttle|map|follow|stop)/.test(message),
            isBookingRequest: /(book|ride|trip|request ride|reserve)/.test(message),
            isScheduleQuery: /(schedule|time|when|how often|frequency|next shuttle|horaire|horario|berɛ|nhyehyɛeɛ)/.test(message),
            isHelpRequest: /(help|how|what can|assist|support|guide|aide|ayuda|mmoa|boa)/.test(message),
            isCasualChat: /(how are you|thanks|thank you|good|great|awesome|cool|nice|merci|gracias|medaase)/.test(message)
        };
    }

    getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    getTimeOfDay() {
        const hour = new Date().getHours();
        const timeWords = {
            en: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
            fr: hour < 12 ? 'matin' : hour < 17 ? 'après-midi' : 'soir',
            tw: hour < 12 ? 'anɔpa' : hour < 17 ? 'awia' : 'anwummerɛ',
            es: hour < 12 ? 'mañana' : hour < 17 ? 'tarde' : 'noche'
        };
        return timeWords[this.currentLanguage] || timeWords.en;
    }

    getTypingDelay() {
        return Math.random() * 2000 + 1000; // 1-3 seconds
    }

    addMessage(sender, message) {
        const messagesContainer = document.getElementById('aiMessages');
        if (!messagesContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `ai-message ${sender}`;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const senderName = sender === 'user' ? 'You' : 'UCC shuttle buddy';
        const avatar = sender === 'user' ? '👤' : '🤖';

        messageEl.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-bubble">
                <div class="message-sender">${senderName}</div>
                <div class="message-text">${this.formatMessage(message)}</div>
            </div>
        `;

        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessage(message) {
        return message;
    }

    showTyping() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) {
            indicator.style.display = 'flex';
            const messagesContainer = document.getElementById('aiMessages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    hideTyping() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    loadUserPreferences() {
        const saved = localStorage.getItem('ucc_ai_preferences');
        if (saved) {
            this.userPreferences = JSON.parse(saved);
        }
    }

    saveUserPreferences() {
        localStorage.setItem('ucc_ai_preferences', JSON.stringify(this.userPreferences));
    }
}

// Quick message function for buttons
function sendQuickMessage(message) {
    const input = document.getElementById('aiInput');
    if (input) {
        input.value = message;
        if (window.multilingualAI) {
            window.multilingualAI.handleUserMessage();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.multilingualAI = new MultilingualAIAssistant();
});