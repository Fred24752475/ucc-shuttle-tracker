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
        return {
            en: {
                welcome: [
                    "Hey there! 👋 I'm your UCC shuttle buddy. What's going on today?",
                    "Hi! Ready to get around campus? I'm here to help with all things shuttle-related!",
                    "Hello! 🚌 Your friendly campus transport assistant here. What can I help you with?"
                ],
                emergency: [
                    "Oh no! 🚨 This sounds urgent. For immediate help, call campus security at +233-123-4567. Are you safe right now?",
                    "That sounds serious! 😟 Please contact campus security right away at +233-123-4567. What's your current location?"
                ],
                greeting: [
                    "Good {timeOfDay}! 😊 How's your day going? Need help getting around campus?",
                    "Hey there! 👋 Hope you're having a good {timeOfDay}. What shuttle adventure can I help you with?"
                ],
                location: [
                    "Let me check the shuttle locations for you! 🔍 I can see 3 shuttles currently active. The closest one is at the Library stop - about 2-3 minutes away.",
                    "Good question! 🚌 Right now I'm tracking several shuttles around campus. There's one near the Science Block, another at Main Gate."
                ],
                booking: [
                    "Absolutely! I'd love to help you book a ride. 🎫 Where are you starting from and where do you want to go?",
                    "Sure thing! 🚌 Booking a ride is super easy. I'll need to know your pickup location and destination."
                ],
                schedule: [
                    "Great question! ⏰ Main shuttles run every 10-15 minutes during busy times (7-9 AM and 4-7 PM). Library route is every 10 minutes.",
                    "Here's the schedule info! 📅 Peak hours have shuttles every 10-15 minutes. Off-peak is about every 20 minutes."
                ],
                help: [
                    "I'm here to help! 🤝 I can assist with finding shuttles, booking rides, checking schedules, or anything transport-related.",
                    "Happy to help out! 😊 I know all about the shuttle system - locations, schedules, booking, routes, you name it."
                ],
                thanks: [
                    "You're so welcome! 😊 Happy to help anytime!",
                    "No problem at all! 👍 That's what I'm here for!"
                ],
                casual: [
                    "I hear you! 😊 Anything shuttle-related I can help with?",
                    "Totally! 👍 What's on your mind today?"
                ],
                default: [
                    "Hmm, let me think about that... 🤔 I'm really good with shuttle stuff. Could you tell me more about what you're looking for?",
                    "I want to help you out! 😊 I'm specialized in campus transportation. What specifically can I help with?"
                ]
            },
            fr: {
                welcome: [
                    "Salut ! 👋 Je suis votre assistant navette UCC. Comment ça va aujourd'hui ?",
                    "Bonjour ! Prêt à vous déplacer sur le campus ? Je suis là pour tout ce qui concerne les navettes !",
                    "Hello ! 🚌 Votre assistant transport amical du campus ici. Comment puis-je vous aider ?"
                ],
                emergency: [
                    "Oh non ! 🚨 Cela semble urgent. Pour une aide immédiate, appelez la sécurité du campus au +233-123-4567. Êtes-vous en sécurité ?",
                    "Cela semble sérieux ! 😟 Veuillez contacter immédiatement la sécurité du campus au +233-123-4567. Où êtes-vous actuellement ?"
                ],
                greeting: [
                    "Bon {timeOfDay} ! 😊 Comment se passe votre journée ? Besoin d'aide pour vous déplacer sur le campus ?",
                    "Salut ! 👋 J'espère que vous passez un bon {timeOfDay}. Quelle aventure en navette puis-je vous aider ?"
                ],
                location: [
                    "Laissez-moi vérifier les emplacements des navettes ! 🔍 Je peux voir 3 navettes actives. La plus proche est à l'arrêt Bibliothèque - environ 2-3 minutes.",
                    "Bonne question ! 🚌 En ce moment, je suis plusieurs navettes autour du campus. Il y en a une près du Bloc Sciences, une autre à la Porte Principale."
                ],
                booking: [
                    "Absolument ! J'aimerais vous aider à réserver un trajet. 🎫 D'où partez-vous et où voulez-vous aller ?",
                    "Bien sûr ! 🚌 Réserver un trajet est super facile. J'aurai besoin de connaître votre lieu de prise en charge et votre destination."
                ],
                schedule: [
                    "Excellente question ! ⏰ Les navettes principales circulent toutes les 10-15 minutes pendant les heures de pointe (7h-9h et 16h-19h). L'itinéraire Bibliothèque est toutes les 10 minutes.",
                    "Voici les infos sur les horaires ! 📅 Les heures de pointe ont des navettes toutes les 10-15 minutes. Hors pointe c'est environ toutes les 20 minutes."
                ],
                help: [
                    "Je suis là pour aider ! 🤝 Je peux vous assister pour trouver des navettes, réserver des trajets, vérifier les horaires, ou tout ce qui concerne le transport.",
                    "Heureux de vous aider ! 😊 Je connais tout sur le système de navettes - emplacements, horaires, réservations, itinéraires."
                ],
                thanks: [
                    "De rien ! 😊 Heureux d'aider à tout moment !",
                    "Pas de problème du tout ! 👍 C'est pour ça que je suis là !"
                ],
                casual: [
                    "Je vous entends ! 😊 Quelque chose lié aux navettes avec lequel je peux aider ?",
                    "Totalement ! 👍 Qu'avez-vous en tête aujourd'hui ?"
                ],
                default: [
                    "Hmm, laissez-moi réfléchir à ça... 🤔 Je suis vraiment bon avec les trucs de navettes. Pourriez-vous me dire plus sur ce que vous cherchez ?",
                    "Je veux vous aider ! 😊 Je suis spécialisé dans le transport du campus. En quoi puis-je vous aider spécifiquement ?"
                ]
            },
            tw: {
                welcome: [
                    "Ɛhe! 👋 Meyɛ wo UCC shuttle boafoɔ. Ɛdeɛn na ɛrekɔ so ɛnnɛ?",
                    "Akwaaba! Wosiesie sɛ wobɛkɔ sukuu mu? Mewɔ ha sɛ meboa wo wɔ shuttle ho nsɛm nyinaa mu!",
                    "Hello! 🚌 Wo sukuu akwantu boafoɔ a ɔyɛ anigye ni. Ɛdeɛn na metumi aboa wo?"
                ],
                emergency: [
                    "Ao! 🚨 Yei te sɛ ɛho hia. Sɛ wohia mmoa ntɛm a, frɛ sukuu banbɔ wɔ +233-123-4567. Wo ho ye anaa?",
                    "Yei yɛ den! 😟 Yɛ srɛ wo frɛ sukuu banbɔ ntɛm wɔ +233-123-4567. Wo wɔ he mprempren?"
                ],
                greeting: [
                    "{timeOfDay} pa! 😊 Wo da rekɔ sɛn? Wohia mmoa sɛ wobɛkɔ sukuu mu?",
                    "Ɛhe! 👋 M'ani da so sɛ wo {timeOfDay} rekɔ yie. Shuttle akwantu bɛn na metumi aboa wo?"
                ],
                location: [
                    "Ma menhwɛ shuttle baabi ma wo! 🔍 Metumi hu shuttle 3 a wɔyɛ adwuma mprempren. Deɛ ɛbɛn wo paa no gyina Library beaeɛ hɔ - ɛbɛyɛ simma 2-3.",
                    "Asɛm pa! 🚌 Seesei medi shuttle pii akyi wɔ sukuu mu. Ɛbaako wɔ Science Block nkyɛn, foforɔ wɔ Main Gate."
                ],
                booking: [
                    "Ampa ara! Mepɛ sɛ meboa wo ma wo fa akwantu. 🎫 He na wofiri na he nso na wopɛ sɛ wokɔ?",
                    "Ɛyɛ nokware! 🚌 Akwantu fa yɛ mmerɛ. Ɛsɛ sɛ minim baabi a wobɛfiri ne baabi a wokɔ."
                ],
                schedule: [
                    "Asɛm pa! ⏰ Shuttle akɛseɛ no tu kwan daa - simma 10-15 biara wɔ berɛ a nnipa pii wɔ hɔ (anɔpa 7-9 ne anwummerɛ 4-7). Library ɔkwan yɛ simma 10 biara.",
                    "Berɛ nhyehyɛeɛ ho nsɛm ni! 📅 Berɛ a nnipa pii wɔ hɔ no shuttle ba simma 10-15 biara. Berɛ foforɔ mu no ɛyɛ simma 20 bɛyɛ."
                ],
                help: [
                    "Mewɔ ha sɛ meboa! 🤝 Metumi aboa wo ma woahu shuttle, fa akwantu, hwɛ berɛ nhyehyɛeɛ, anaa biribiara a ɛfa akwantu ho.",
                    "M'ani gye sɛ meboa! 😊 Minim shuttle nhyehyɛeɛ no nyinaa - baabi a ɛwɔ, berɛ, akwantu fa, akwan, biribiara."
                ],
                thanks: [
                    "Ɛyɛ nokware! 😊 M'ani gye sɛ meboa berɛ biara!",
                    "Ɛnyɛ asɛm biara! 👍 Ɛno nti na mewɔ ha!"
                ],
                casual: [
                    "Mete aseɛ! 😊 Shuttle ho biribiara a metumi aboa?",
                    "Ɛyɛ nokware! 👍 Ɛdeɛn na ɛwɔ w'adwene mu ɛnnɛ?"
                ],
                default: [
                    "Hmm, ma mendwene ho... 🤔 Meyɛ adwuma pa wɔ shuttle ho nsɛm mu. Wobɛtumi aka deɛ worehwehwɛ no ho nsɛm kakra akyer ɛme?",
                    "Mepɛ sɛ meboa wo! 😊 Meyɛ adwuma titire wɔ sukuu akwantu mu. Ɛdeɛn pɔtee na metumi aboa wo?"
                ]
            },
            es: {
                welcome: [
                    "¡Hola! 👋 Soy tu asistente de transporte UCC. ¿Cómo va tu día?",
                    "¡Hola! ¿Listo para moverte por el campus? ¡Estoy aquí para ayudar con todo lo relacionado con el transporte!",
                    "¡Hola! 🚌 Tu asistente amigable de transporte del campus aquí. ¿En qué puedo ayudarte?"
                ],
                emergency: [
                    "¡Oh no! 🚨 Esto suena urgente. Para ayuda inmediata, llama a seguridad del campus al +233-123-4567. ¿Estás seguro ahora?",
                    "¡Eso suena serio! 😟 Por favor contacta a seguridad del campus inmediatamente al +233-123-4567. ¿Cuál es tu ubicación actual?"
                ],
                greeting: [
                    "¡Buenas {timeOfDay}! 😊 ¿Cómo va tu día? ¿Necesitas ayuda para moverte por el campus?",
                    "¡Hola! 👋 Espero que tengas una buena {timeOfDay}. ¿Con qué aventura de transporte puedo ayudarte?"
                ],
                location: [
                    "¡Déjame revisar las ubicaciones de transporte para ti! 🔍 Puedo ver 3 transportes actualmente activos. El más cercano está en la parada de la Biblioteca - aproximadamente 2-3 minutos.",
                    "¡Buena pregunta! 🚌 Ahora mismo estoy rastreando varios transportes alrededor del campus. Hay uno cerca del Bloque de Ciencias, otro en la Puerta Principal."
                ],
                booking: [
                    "¡Absolutamente! Me encantaría ayudarte a reservar un viaje. 🎫 ¿Desde dónde partes y adónde quieres ir?",
                    "¡Por supuesto! 🚌 Reservar un viaje es súper fácil. Necesitaré saber tu ubicación de recogida y destino."
                ],
                schedule: [
                    "¡Excelente pregunta! ⏰ Los transportes principales funcionan cada 10-15 minutos durante las horas ocupadas (7-9 AM y 4-7 PM). La ruta de la Biblioteca es cada 10 minutos.",
                    "¡Aquí tienes la información sobre horarios! 📅 Las horas pico tienen transportes cada 10-15 minutos. Fuera de horas pico es aproximadamente cada 20 minutos."
                ],
                help: [
                    "¡Estoy aquí para ayudar! 🤝 Puedo asistir con encontrar transportes, reservar viajes, verificar horarios, o cualquier cosa relacionada con transporte.",
                    "¡Feliz de ayudar! 😊 Sé todo sobre el sistema de transporte - ubicaciones, horarios, reservas, rutas, lo que sea."
                ],
                thanks: [
                    "¡De nada! 😊 ¡Feliz de ayudar en cualquier momento!",
                    "¡No hay problema! 👍 ¡Para eso estoy aquí!"
                ],
                casual: [
                    "¡Te escucho! 😊 ¿Algo relacionado con transporte en lo que pueda ayudar?",
                    "¡Totalmente! 👍 ¿Qué tienes en mente hoy?"
                ],
                default: [
                    "Hmm, déjame pensar en eso... 🤔 Soy realmente bueno con cosas de transporte. ¿Podrías decirme un poco más sobre lo que estás buscando?",
                    "¡Quiero ayudarte! 😊 Me especializo en transporte del campus. ¿En qué específicamente puedo ayudar?"
                ]
            }
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
        const welcomeMessages = this.responses[this.currentLanguage].welcome;
        
        setTimeout(() => {
            this.addMessage('bot', this.getRandomItem(welcomeMessages));
        }, 1000);
    }

    handleUserMessage() {
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
            const greetings = this.responses[this.currentLanguage].greeting;
            const response = this.getRandomItem(greetings);
            return response.replace('{timeOfDay}', this.getTimeOfDay());
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
            isEmergency: /emergency|urgent|help me|stuck|lost|accident|danger/.test(message),
            isGreeting: /^(hi|hello|hey|good morning|good afternoon|good evening|sup|what's up|salut|bonjour|hola|ɛhe|akwaaba)/.test(message),
            isLocationQuery: /(where|location|find|nearest|closest|track|shuttle.*is|où|ubicación|he|baabi)/.test(message),
            isBookingRequest: /(book|ride|trip|need.*shuttle|want.*ride|take me|go to|réserver|reservar|fa.*akwantu)/.test(message),
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
        const senderName = sender === 'user' ? 'You' : 'Chat Gpt';
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
        return message
            .replace(/shuttle/gi, '🚌 shuttle')
            .replace(/library/gi, '📚 library')
            .replace(/emergency/gi, '🆘 emergency')
            .replace(/schedule/gi, '⏰ schedule')
            .replace(/location/gi, '📍 location')
            .replace(/campus/gi, '🏫 campus');
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