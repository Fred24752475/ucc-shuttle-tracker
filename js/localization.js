/**
 * UCC Shuttle Tracker - Multi-Language Support
 * Complete localization system with instant language switching
 */

class UCCLocalization {
    constructor() {
        this.currentLanguage = localStorage.getItem('ucc_language') || 'en';
        this.fallbackLanguage = 'en';
        
        // Translations for all supported languages
        this.translations = {
            en: {
                // Navigation
                nav_dashboard: 'Dashboard',
                nav_rides: 'My Rides',
                nav_map: 'Shuttle Map',
                nav_history: 'Trip History',
                nav_ai_assistant: 'AI Assistant',
                nav_messages: 'Messages',
                nav_help: 'Help',
                nav_logout: 'Logout',
                
                // Common UI elements
                btn_request_ride: 'Request Ride',
                btn_book_now: 'Book Now',
                btn_cancel: 'Cancel',
                btn_send: 'Send',
                btn_refresh: 'Refresh',
                btn_login: 'Login',
                btn_register: 'Register',
                loading: 'Loading...',
                error_required: 'This field is required',
                error_invalid: 'Invalid information',
                success_saved: 'Saved successfully',
                
                // Dashboard elements
                welcome_student: 'Welcome to your UCC Shuttle Dashboard',
                current_location: 'Current Location',
                available_shuttles: 'Available Shuttles',
                nearest_shuttle: 'Nearest Shuttle',
                eta_arrival: 'ETA Arrival',
                status_active: 'Active',
                status_busy: 'Busy',
                status_offline: 'Offline',
                
                // Messages
                chat_placeholder: 'Type your message...',
                online_now: 'Online Now',
                typing: 'Typing...',
                no_messages: 'No messages yet',
                
                // AI Assistant
                ai_greeting: 'Hello! How can I help you today?',
                ai_typing: 'AI is typing...',
                send_help: 'Send help request',
                
                // Emergency
                emergency_title: 'Emergency Alert',
                emergency_description: 'Send emergency notification to campus security',
                
                // Forms
                email: 'Email',
                password: 'Password',
                confirm_password: 'Confirm Password',
                phone: 'Phone Number',
                full_name: 'Full Name',
                role: 'Role',
                
                // Time
                minutes: 'minutes',
                seconds: 'seconds',
                hours: 'hours',
                days: 'days',
                ago: 'ago',
                
                // Shuttle types
                shuttle_type_express: 'Campus Express',
                shuttle_type_library: 'Library Shuttle',
                shuttle_type_hostel: 'Hostel Shuttle',
                shuttle_type_science: 'Science Block Shuttle',
                shuttle_type_sports: 'Sports Complex Shuttle',
                
                // Status messages
                ride_requested: 'Ride requested',
                ride_accepted: 'Ride accepted',
                driver_assigned: 'Driver assigned',
                shuttle_arriving: 'Shuttle arriving',
                trip_completed: 'Trip completed',
                trip_cancelled: 'Trip cancelled'
            },
            
            fr: {
                // Navigation
                nav_dashboard: 'Tableau de bord',
                nav_rides: 'Mes trajets',
                nav_map: 'Carte des navettes',
                nav_history: 'Historique des trajets',
                nav_ai_assistant: 'Assistant IA',
                nav_messages: 'Messages',
                nav_help: 'Aide',
                nav_logout: 'Déconnexion',
                
                // Common UI elements
                btn_request_ride: 'Demander une course',
                btn_book_now: 'Réserver maintenant',
                btn_cancel: 'Annuler',
                btn_send: 'Envoyer',
                btn_refresh: 'Actualiser',
                btn_login: 'Connexion',
                btn_register: 'S\'inscrire',
                loading: 'Chargement...',
                error_required: 'Ce champ est requis',
                error_invalid: 'Information invalide',
                success_saved: 'Enregistré avec succès',
                
                // Dashboard elements
                welcome_student: 'Bienvenue sur votre tableau de bord UCC',
                current_location: 'Position actuelle',
                available_shuttles: 'Navettes disponibles',
                nearest_shuttle: 'Navette la plus proche',
                eta_arrival: 'Heure d\'arrivée prévue',
                status_active: 'Actif',
                status_busy: 'Occupé',
                status_offline: 'Hors ligne',
                
                // Messages
                chat_placeholder: 'Tapez votre message...',
                online_now: 'En ligne maintenant',
                typing: 'En train d\'écrire...',
                no_messages: 'Aucun message pour le moment',
                
                // AI Assistant
                ai_greeting: 'Bonjour! Comment puis-je vous aider aujourd\'hui?',
                ai_typing: 'L\'IA écrit...',
                send_help: 'Envoyer une demande d\'aide',
                
                // Emergency
                emergency_title: 'Alerte d\'urgence',
                emergency_description: 'Envoyer une notification d\'urgence à la sécurité du campus',
                
                // Forms
                email: 'Email',
                password: 'Mot de passe',
                confirm_password: 'Confirmer le mot de passe',
                phone: 'Numéro de téléphone',
                full_name: 'Nom complet',
                role: 'Rôle',
                
                // Time
                minutes: 'minutes',
                seconds: 'secondes',
                hours: 'heures',
                days: 'jours',
                ago: 'depuis',
                
                // Shuttle types
                shuttle_type_express: 'Navette Campus Express',
                shuttle_type_library: 'Navette Bibliothèque',
                shuttle_type_hostel: 'Navette dortoir',
                shuttle_type_science: 'Navette Bloc Sciences',
                shuttle_type_sports: 'Navette Complexe Sportif',
                
                // Status messages
                ride_requested: 'Course demandée',
                ride_accepted: 'Course acceptée',
                driver_assigned: 'Conducteur assigné',
                shuttle_arriving: 'Navette en approche',
                trip_completed: 'Course terminée',
                trip_cancelled: 'Course annulée'
            },
            
            tw: {
                // Navigation
                nav_dashboard: 'Dashibɔɔd',
                nav_rides: 'Ɔoɖa',
                nav_map: 'Ka Mapa',
                nav_history: 'Abakɔɔ HIsitɔri',
                nav_ai_assistant: 'AI Fofonomu',
                nav_messages: 'Nsɛmuaho',
                nav_help: 'Mmoa',
                nav_logout: 'Firiwɛ',
                
                // Common UI elements
                btn_request_ride: 'Bɔɔ Ɔoɖa',
                btn_book_now: 'Bɔɔ Seisei',
                btn_cancel: 'Pɛ',
                btn_send: 'Tumi',
                btn_refresh: 'Hwɛ',
                btn_login: 'Log in',
                btn_register: 'Hyɛre',
                loading: 'Loadi...',
                error_required: 'Ɛho na hia',
                error_invalid: 'Ntɔfo ho',
                success_saved: 'Esiɛ afoara',
                
                // Dashboard elements
                welcome_student: 'Akwaaba wo Dashboard a UCC',
                current_location: 'Beaeɛ',
                available_shuttles: 'Shuttle a wɔ hɔ',
                nearest_shuttle: 'Shuttle a pɛ/close',
                eta_arrival: 'Berɛ Amanyan',
                status_active: 'Wɔ ho te',
                status_busy: 'Wɔ ho trɛw',
                status_offline: 'Wɔ afi hɔ',
                
                // Messages
                chat_placeholder: 'Kratawo nkombo...',
                online_now: 'Enka sim',
                typing: 'Sre Kɛka...',
                no_messages: 'Nka nkombo a mfei...',
                
                // AI Assistant
                ai_greeting: 'Meda! Etɔ sɛ bɔtɔ? Meka wo mmoa?',
                ai_typing: 'AI de reka...',
                send_help: 'Tumi mmoa',
                
                // Emergency
                emergency_title: 'Hweeɛ Mme Mmoa',
                emergency_description: 'Tumi hweeɛ mmoa kyerɛw a sɔkratinfɔfo UCC',
                
                // Forms
                email: 'Email',
                password: 'Password',
                confirm_password: 'Confirm Password',
                phone: 'Phone Number',
                full_name: 'Full Name',
                role: 'Role',
                
                // Time
                minutes: 'simin',
                seconds: 'sekan',
                hours: 'sra',
                days: 'ɛfɔ',
                ago: 'firiwɛ',
                
                // Shuttle types
                shuttle_type_express: 'UCC Express Shuttle',
                shuttle_type_library: 'UCC Library Shuttle',
                shuttle_type_hostel: 'UCC Hostel Shuttle',
                shuttle_type_science: 'UCC Science Block Shuttle',
                shuttle_type_sports: 'UCC Sports Complex Shuttle',
                
                // Status messages
                ride_requested: 'Ride requested',
                ride_accepted: 'Ride accepted',
                driver_assigned: 'Driver assigned',
                shuttle_arriving: 'Shuttle arriving',
                trip_completed: 'Trip completed',
                trip_cancelled: 'Trip cancelled'
            }
        };
        
        this.init();
    }

    init() {
        console.log('🌐 Initializing localization system...');
        
        this.setupEventListeners();
        this.updateAllText();
        console.log(`✅ Localization ready for language: ${this.currentLanguage}`);
    }

    // Setup event listeners
    setupEventListeners() {
        // Language switcher buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-lang-switch]')) {
                const newLanguage = e.target.dataset.langSwitch;
                this.switchLanguage(newLanguage);
            }
        });
    }

    // Switch language
    switchLanguage(languageCode) {
        if (!this.translations[languageCode]) {
            console.warn(`⚠️ Language ${languageCode} not supported`);
            return;
        }
        
        this.currentLanguage = languageCode;
        localStorage.setItem('ucc_language', languageCode);
        
        this.updateAllText();
        console.log(`🌐 Language switched to: ${languageCode}`);
        
        // Emit language change event
        if (typeof window.uccEvents !== 'undefined') {
            window.uccEvents.emit('languageChanged', { 
                language: languageCode, 
                translations: this.translations[languageCode] 
            });
        }
    }

    // Update all text on the page
    updateAllText() {
        const translations = this.translations[this.currentLanguage] || this.translations[this.fallbackLanguage];
        
        // Update navigation
        this.updateText('[data-translate]', translations);
        
        // Update buttons
        this.updateText('[data-btn-translate]', translations);
        
        // Update labels
        this.updateText('[data-label-translate]', translations);
        
        // Update forms
        this.updateText('[data-form-translate]', translations);
        
        // Update messages
        this.updateText('[data-message-translate]', translations);
        
        // Update status indicators
        this.updateText('[data-status-translate]', translations);
    }

    // Update text elements
    updateText(selector, translations) {
        document.querySelectorAll(selector).forEach(element => {
            const key = element.dataset.translate || element.dataset.btnTranslate || 
                          element.dataset.labelTranslate || element.dataset.formTranslate || 
                          element.dataset.messageTranslate || element.dataset.statusTranslate;
            
            if (key && translations[key]) {
                element.textContent = translations[key];
            }
        });
    }

    // Get translation for a key
    t(key) {
        const translations = this.translations[this.currentLanguage] || this.translations[this.fallbackLanguage];
        return translations[key] || key;
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Get all supported languages
    getSupportedLanguages() {
        return [
            { code: 'en', name: 'English', native: 'English' },
            { code: 'fr', name: 'French', native: 'Français' },
            { code: 'tw', name: 'Twi', native: 'Twi' }
        ];
    }

    // Format date/time according to language
    formatDateTime(date, type = 'relative') {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        const t = this.translations[this.currentLanguage] || this.translations[this.fallbackLanguage];
        
        if (type === 'relative') {
            if (days > 0) return `${days} ${t.days} ${t.ago}`;
            if (hours > 0) return `${hours} ${t.hours} ${t.ago}`;
            if (minutes > 0) return `${minutes} ${t.minutes} ${t.ago}`;
            return 'Just now';
        }
        
        return date.toLocaleString();
    }
}

// Initialize localization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uccLocalization === 'undefined') {
        window.uccLocalization = new UCCLocalization();
    }
});