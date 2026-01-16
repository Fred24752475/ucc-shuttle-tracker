// Multi-Language Support System
class LanguageSwitcher {
    constructor() {
        this.currentLanguage = localStorage.getItem('ucc_language') || 'en';
        this.translations = {
            en: {
                // Navigation
                'dashboard': 'Dashboard',
                'my-rides': 'My Rides',
                'shuttle-map': 'Shuttle Map',
                'trip-history': 'Trip History',
                'ai-assistant': 'AI Assistant',
                'messages': 'Messages',
                'help': 'Help',
                'profile': 'Profile',
                'logout': 'Logout',
                
                // Common
                'welcome-back': 'Welcome back',
                'student': 'Student',
                'driver': 'Driver',
                'admin': 'Admin',
                'loading': 'Loading...',
                'save': 'Save',
                'cancel': 'Cancel',
                'submit': 'Submit',
                'close': 'Close',
                'yes': 'Yes',
                'no': 'No',
                
                // Dashboard
                'quick-actions': 'Quick Actions',
                'request-ride': 'Request Ride',
                'track-shuttle': 'Track Shuttle',
                'emergency-alert': 'Emergency Alert',
                'shuttle-availability': 'Shuttle Availability',
                'current-trip': 'Current Trip',
                'no-active-trip': 'No active trip',
                'book-shuttle': 'Book a shuttle to your destination',
                'see-real-time': 'See real-time shuttle locations',
                'send-emergency': 'Send emergency notification',
                
                // AI Assistant
                'ai-title': 'UCC Smart Assistant',
                'ai-subtitle': "I'm here to help with shuttles, routes, and campus info",
                'find-shuttle': 'Find Shuttle',
                'book-ride': 'Book Ride',
                'schedules': 'Schedules',
                'emergency': 'Emergency',
                'type-message': 'Ask me anything about shuttles, routes, or campus info...',
                
                // Driver specific
                'start-shift': 'Start Shift',
                'end-shift': 'End Shift',
                'active-route': 'Active Route',
                'completed-trips': 'Completed Trips',
                'notifications': 'Notifications',
                'support': 'Support',
                
                // Additional common terms
                'back': 'Back',
                'next': 'Next',
                'continue': 'Continue',
                'confirm': 'Confirm',
                'available': 'Available',
                'busy': 'Busy',
                'offline': 'Offline',
                'online': 'Online',
                'active': 'Active',
                'inactive': 'Inactive',
                'today': 'Today',
                'yesterday': 'Yesterday',
                'this-week': 'This Week',
                'this-month': 'This Month',
                'driver-profile': 'Driver Profile',
                'live-map': 'Live Shuttle Map',
                'begin-shift': 'Begin your driving shift',
                'complete-shift': 'Complete your driving shift',
                'search': 'Search'
            },
            
            fr: {
                // Navigation
                'dashboard': 'Tableau de bord',
                'my-rides': 'Mes trajets',
                'shuttle-map': 'Carte navette',
                'trip-history': 'Historique des trajets',
                'ai-assistant': 'Assistant IA',
                'messages': 'Messages',
                'help': 'Aide',
                'profile': 'Profil',
                'logout': 'Déconnexion',
                
                // Common
                'welcome-back': 'Bon retour',
                'student': 'Étudiant',
                'driver': 'Conducteur',
                'admin': 'Administrateur',
                'loading': 'Chargement...',
                'save': 'Enregistrer',
                'cancel': 'Annuler',
                'submit': 'Soumettre',
                'close': 'Fermer',
                'yes': 'Oui',
                'no': 'Non',
                
                // Dashboard
                'quick-actions': 'Actions rapides',
                'request-ride': 'Demander un trajet',
                'track-shuttle': 'Suivre la navette',
                'emergency-alert': 'Alerte d\'urgence',
                'shuttle-availability': 'Disponibilité navette',
                'current-trip': 'Trajet actuel',
                'no-active-trip': 'Aucun trajet actif',
                'book-shuttle': 'Réserver une navette vers votre destination',
                'see-real-time': 'Voir les emplacements des navettes en temps réel',
                'send-emergency': 'Envoyer une notification d\'urgence',
                
                // AI Assistant
                'ai-title': 'Assistant Intelligent UCC',
                'ai-subtitle': 'Je suis là pour aider avec les navettes, itinéraires et infos campus',
                'find-shuttle': 'Trouver navette',
                'book-ride': 'Réserver trajet',
                'schedules': 'Horaires',
                'emergency': 'Urgence',
                'type-message': 'Demandez-moi tout sur les navettes, itinéraires ou infos campus...',
                
                // Driver specific
                'start-shift': 'Commencer service',
                'end-shift': 'Terminer service',
                'active-route': 'Itinéraire actif',
                'completed-trips': 'Trajets terminés',
                'notifications': 'Notifications',
                'support': 'Support',
                
                // Additional common terms
                'back': 'Retour',
                'next': 'Suivant',
                'continue': 'Continuer',
                'confirm': 'Confirmer',
                'available': 'Disponible',
                'busy': 'Occupé',
                'offline': 'Hors ligne',
                'online': 'En ligne',
                'active': 'Actif',
                'inactive': 'Inactif',
                'today': 'Aujourd\'hui',
                'yesterday': 'Hier',
                'this-week': 'Cette semaine',
                'this-month': 'Ce mois',
                'driver-profile': 'Profil conducteur',
                'live-map': 'Carte en temps réel',
                'begin-shift': 'Commencer votre service',
                'complete-shift': 'Terminer votre service',
                'search': 'Rechercher'
            },
            
            tw: {
                // Navigation (Twi)
                'dashboard': 'Adwuma beae',
                'my-rides': 'Me akwantu',
                'shuttle-map': 'Shuttle mepɔ',
                'trip-history': 'Akwantu abakɔsɛm',
                'ai-assistant': 'AI ɔboafoɔ',
                'messages': 'Nkrasɛm',
                'help': 'Mmoa',
                'profile': 'Me ho nsɛm',
                'logout': 'Fi mu',
                
                // Common
                'welcome-back': 'Akwaaba bio',
                'student': 'Ɔsuani',
                'driver': 'Ɔkafoɔ',
                'admin': 'Ɔhwɛfoɔ',
                'loading': 'Ɛreboa...',
                'save': 'Kora',
                'cancel': 'Gyae',
                'submit': 'Fa kɔ',
                'close': 'To mu',
                'yes': 'Aane',
                'no': 'Daabi',
                
                // Dashboard
                'quick-actions': 'Ntɛm nneyɛe',
                'request-ride': 'Bisa akwantu',
                'track-shuttle': 'Hwɛ shuttle',
                'emergency-alert': 'Prɛko frɛ',
                'shuttle-availability': 'Shuttle wɔ hɔ',
                'current-trip': 'Akwantu a ɛkɔ so',
                'no-active-trip': 'Akwantu biara nni hɔ',
                'book-shuttle': 'Fa shuttle kɔ wo baabi',
                'see-real-time': 'Hwɛ shuttle baabi wɔ mprempren',
                'send-emergency': 'Fa prɛko nsɛm kɔ',
                
                // AI Assistant
                'ai-title': 'UCC Nyansa Ɔboafoɔ',
                'ai-subtitle': 'Mewɔ ha sɛ meboa wo wɔ shuttle, akwan ne sukuu ho nsɛm mu',
                'find-shuttle': 'Hwehwɛ shuttle',
                'book-ride': 'Fa akwantu',
                'schedules': 'Mmere nhyehyɛe',
                'emergency': 'Prɛko',
                'type-message': 'Bisa me biribiara fa shuttle, akwan anaa sukuu ho nsɛm ho...',
                
                // Driver specific
                'start-shift': 'Fi adwuma ase',
                'end-shift': 'Wie adwuma',
                'active-route': 'Ɔkwan a ɛkɔ so',
                'completed-trips': 'Akwantu a awie',
                'notifications': 'Amanneɛ',
                'support': 'Mmoa',
                
                // Additional common terms
                'back': 'San kɔ',
                'next': 'Ɛtoɔ so',
                'continue': 'Kɔ so',
                'confirm': 'Si so dua',
                'available': 'Ɛwɔ hɔ',
                'busy': 'Ɔyɛ adwuma',
                'offline': 'Ɛnni hɔ',
                'online': 'Ɛwɔ hɔ',
                'active': 'Ɛyɛ adwuma',
                'inactive': 'Ɛnyɛ adwuma',
                'today': 'Ɛnnɛ',
                'yesterday': 'Nnera',
                'this-week': 'Dapɛn yi',
                'this-month': 'Bosome yi',
                'driver-profile': 'Ɔkafoɔ ho nsɛm',
                'live-map': 'Mepɔ a ɛyɛ amono',
                'begin-shift': 'Fi w\'adwuma ase',
                'complete-shift': 'Wie w\'adwuma',
                'search': 'Hwehwɛ'
            },
            
            es: {
                // Navigation
                'dashboard': 'Panel de control',
                'my-rides': 'Mis viajes',
                'shuttle-map': 'Mapa de transporte',
                'trip-history': 'Historial de viajes',
                'ai-assistant': 'Asistente IA',
                'messages': 'Mensajes',
                'help': 'Ayuda',
                'profile': 'Perfil',
                'logout': 'Cerrar sesión',
                
                // Common
                'welcome-back': 'Bienvenido de vuelta',
                'student': 'Estudiante',
                'driver': 'Conductor',
                'admin': 'Administrador',
                'loading': 'Cargando...',
                'save': 'Guardar',
                'cancel': 'Cancelar',
                'submit': 'Enviar',
                'close': 'Cerrar',
                'yes': 'Sí',
                'no': 'No',
                
                // Dashboard
                'quick-actions': 'Acciones rápidas',
                'request-ride': 'Solicitar viaje',
                'track-shuttle': 'Rastrear transporte',
                'emergency-alert': 'Alerta de emergencia',
                'shuttle-availability': 'Disponibilidad transporte',
                'current-trip': 'Viaje actual',
                'no-active-trip': 'Sin viaje activo',
                'book-shuttle': 'Reservar transporte a tu destino',
                'see-real-time': 'Ver ubicaciones de transporte en tiempo real',
                'send-emergency': 'Enviar notificación de emergencia',
                
                // AI Assistant
                'ai-title': 'Asistente Inteligente UCC',
                'ai-subtitle': 'Estoy aquí para ayudar con transporte, rutas e información del campus',
                'find-shuttle': 'Encontrar transporte',
                'book-ride': 'Reservar viaje',
                'schedules': 'Horarios',
                'emergency': 'Emergencia',
                'type-message': 'Pregúntame sobre transporte, rutas o información del campus...',
                
                // Driver specific
                'start-shift': 'Iniciar turno',
                'end-shift': 'Terminar turno',
                'active-route': 'Ruta activa',
                'completed-trips': 'Viajes completados',
                'notifications': 'Notificaciones',
                'support': 'Soporte',
                
                // Additional common terms
                'back': 'Atrás',
                'next': 'Siguiente',
                'continue': 'Continuar',
                'confirm': 'Confirmar',
                'available': 'Disponible',
                'busy': 'Ocupado',
                'offline': 'Desconectado',
                'online': 'En línea',
                'active': 'Activo',
                'inactive': 'Inactivo',
                'today': 'Hoy',
                'yesterday': 'Ayer',
                'this-week': 'Esta semana',
                'this-month': 'Este mes',
                'driver-profile': 'Perfil del conductor',
                'live-map': 'Mapa en vivo',
                'begin-shift': 'Comenzar tu turno',
                'complete-shift': 'Completar tu turno',
                'search': 'Buscar'
            }
        };
        
        this.init();
    }
    
    init() {
        this.createLanguageButton();
        this.translatePage();
    }
    
    createLanguageButton() {
        // Create language switcher button
        const langButton = document.createElement('div');
        langButton.className = 'language-switcher';
        langButton.innerHTML = `
            <button class="lang-btn" id="langBtn">
                <i class="fas fa-globe"></i>
                <span class="lang-text">${this.getLanguageName(this.currentLanguage)}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="lang-dropdown" id="langDropdown">
                <div class="lang-option ${this.currentLanguage === 'en' ? 'active' : ''}" data-lang="en">
                    <span class="flag">🇺🇸</span> English
                </div>
                <div class="lang-option ${this.currentLanguage === 'fr' ? 'active' : ''}" data-lang="fr">
                    <span class="flag">🇫🇷</span> Français
                </div>
                <div class="lang-option ${this.currentLanguage === 'tw' ? 'active' : ''}" data-lang="tw">
                    <span class="flag">🇬🇭</span> Twi
                </div>
                <div class="lang-option ${this.currentLanguage === 'es' ? 'active' : ''}" data-lang="es">
                    <span class="flag">🇪🇸</span> Español
                </div>
            </div>
        `;
        
        // Add CSS
        const style = document.createElement('style');
        style.textContent = `
            .language-switcher {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
            }
            
            .lang-btn {
                background: white;
                border: 2px solid #1565c0;
                border-radius: 25px;
                padding: 8px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 14px;
                color: #1565c0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            
            .lang-btn:hover {
                background: #1565c0;
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(21,101,192,0.3);
            }
            
            .lang-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 2px solid #1565c0;
                border-radius: 12px;
                margin-top: 8px;
                min-width: 160px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                display: none;
                overflow: hidden;
            }
            
            .lang-dropdown.show {
                display: block;
                animation: slideDown 0.3s ease;
            }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .lang-option {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                transition: background 0.2s ease;
                font-size: 14px;
            }
            
            .lang-option:hover {
                background: #f5f5f5;
            }
            
            .lang-option.active {
                background: #1565c0;
                color: white;
            }
            
            .flag {
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);
        
        // Insert at top of page
        document.body.insertBefore(langButton, document.body.firstChild);
        
        // Add event listeners
        document.getElementById('langBtn').addEventListener('click', () => {
            document.getElementById('langDropdown').classList.toggle('show');
        });
        
        document.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                this.changeLanguage(lang);
                document.getElementById('langDropdown').classList.remove('show');
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.language-switcher')) {
                document.getElementById('langDropdown').classList.remove('show');
            }
        });
    }
    
    getLanguageName(lang) {
        const names = {
            'en': 'EN',
            'fr': 'FR', 
            'tw': 'TW',
            'es': 'ES'
        };
        return names[lang] || 'EN';
    }
    
    changeLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('ucc_language', lang);
        
        // Update button text
        document.querySelector('.lang-text').textContent = this.getLanguageName(lang);
        
        // Update active state
        document.querySelectorAll('.lang-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === lang);
        });
        
        // Translate page immediately
        this.translatePage();
    }
    
    translatePage() {
        const translations = this.translations[this.currentLanguage];
        
        // Translate elements with data-translate attribute
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[key]) {
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.placeholder = translations[key];
                } else {
                    element.textContent = translations[key];
                }
            }
        });
        
        // Translate ALL common text elements automatically
        this.translateAllText(translations);
    }
    
    translateAllText(translations) {
        // Create comprehensive text mapping
        const textMappings = {
            // Navigation and UI
            'Dashboard': translations['dashboard'] || 'Dashboard',
            'My Dashboard': translations['dashboard'] || 'My Dashboard',
            'Admin Dashboard': translations['dashboard'] || 'Admin Dashboard',
            'My Rides': translations['my-rides'] || 'My Rides',
            'Shuttle Map': translations['shuttle-map'] || 'Shuttle Map',
            'View Map': translations['shuttle-map'] || 'View Map',
            'Trip History': translations['trip-history'] || 'Trip History',
            'AI Assistant': translations['ai-assistant'] || 'AI Assistant',
            'Messages': translations['messages'] || 'Messages',
            'Help': translations['help'] || 'Help',
            'Profile': translations['profile'] || 'Profile',
            'Logout': translations['logout'] || 'Logout',
            'Home': translations['dashboard'] || 'Home',
            'Active Route': translations['active-route'] || 'Active Route',
            'Completed Trips': translations['completed-trips'] || 'Completed Trips',
            'Notifications': translations['notifications'] || 'Notifications',
            'Support': translations['support'] || 'Support',
            
            // Actions and buttons
            'Quick Actions': translations['quick-actions'] || 'Quick Actions',
            'Request Ride': translations['request-ride'] || 'Request Ride',
            'Track Shuttle': translations['track-shuttle'] || 'Track Shuttle',
            'Emergency Alert': translations['emergency-alert'] || 'Emergency Alert',
            'Start Shift': translations['start-shift'] || 'Start Shift',
            'End Shift': translations['end-shift'] || 'End Shift',
            'Book a shuttle to your destination': translations['book-shuttle'] || 'Book a shuttle to your destination',
            'See real-time shuttle locations': translations['see-real-time'] || 'See real-time shuttle locations',
            'Send emergency notification': translations['send-emergency'] || 'Send emergency notification',
            'Begin your driving shift': translations['begin-shift'] || 'Begin your driving shift',
            'Complete your driving shift': translations['complete-shift'] || 'Complete your driving shift',
            
            // Widget titles
            'Shuttle Availability': translations['shuttle-availability'] || 'Shuttle Availability',
            'Current Trip': translations['current-trip'] || 'Current Trip',
            'No active trip': translations['no-active-trip'] || 'No active trip',
            'Live Shuttle Map': translations['live-map'] || 'Live Shuttle Map',
            'Driver Profile': translations['driver-profile'] || 'Driver Profile',
            
            // AI Assistant
            'UCC Smart Assistant': translations['ai-title'] || 'UCC Smart Assistant',
            'Find Shuttle': translations['find-shuttle'] || 'Find Shuttle',
            'Book Ride': translations['book-ride'] || 'Book Ride',
            'Schedules': translations['schedules'] || 'Schedules',
            'Emergency': translations['emergency'] || 'Emergency',
            
            // Common words
            'Loading...': translations['loading'] || 'Loading...',
            'Save': translations['save'] || 'Save',
            'Cancel': translations['cancel'] || 'Cancel',
            'Submit': translations['submit'] || 'Submit',
            'Close': translations['close'] || 'Close',
            'Yes': translations['yes'] || 'Yes',
            'No': translations['no'] || 'No',
            'Back': translations['back'] || 'Back',
            'Next': translations['next'] || 'Next',
            'Continue': translations['continue'] || 'Continue',
            'Confirm': translations['confirm'] || 'Confirm',
            
            // Status and labels
            'Student': translations['student'] || 'Student',
            'Driver': translations['driver'] || 'Driver',
            'Admin': translations['admin'] || 'Admin',
            'Administrator': translations['admin'] || 'Administrator',
            'Available': translations['available'] || 'Available',
            'Busy': translations['busy'] || 'Busy',
            'Offline': translations['offline'] || 'Offline',
            'Online': translations['online'] || 'Online',
            'Active': translations['active'] || 'Active',
            'Inactive': translations['inactive'] || 'Inactive',
            
            // Time and dates
            'Today': translations['today'] || 'Today',
            'Yesterday': translations['yesterday'] || 'Yesterday',
            'This Week': translations['this-week'] || 'This Week',
            'This Month': translations['this-month'] || 'This Month',
            'Last Week': translations['last-week'] || 'Last Week',
            'Last Month': translations['last-month'] || 'Last Month'
        };
        
        // Find and replace all text nodes
        this.replaceTextInNodes(document.body, textMappings);
        
        // Handle welcome messages with names
        this.translateWelcomeMessages(translations);
        
        // Handle placeholders
        this.translatePlaceholders(translations);
    }
    
    replaceTextInNodes(node, textMappings) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (textMappings[text]) {
                node.textContent = textMappings[text];
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip script and style elements
            if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                // For elements with only text content (no child elements)
                if (node.children.length === 0 && node.textContent.trim()) {
                    const text = node.textContent.trim();
                    if (textMappings[text]) {
                        node.textContent = textMappings[text];
                    }
                } else {
                    // Recursively process child nodes
                    Array.from(node.childNodes).forEach(child => {
                        this.replaceTextInNodes(child, textMappings);
                    });
                }
            }
        }
    }
    
    translateWelcomeMessages(translations) {
        // Handle "Welcome back, [Name]!" messages
        const welcomeElements = document.querySelectorAll('h1, h2, h3');
        welcomeElements.forEach(el => {
            const text = el.innerHTML;
            if (text.includes('Welcome back,')) {
                const nameMatch = text.match(/Welcome back,\s*<span[^>]*>([^<]+)<\/span>/);
                if (nameMatch) {
                    const name = nameMatch[1];
                    const welcomeText = translations['welcome-back'] || 'Welcome back';
                    el.innerHTML = text.replace('Welcome back,', welcomeText + ',');
                }
            }
        });
    }
    
    translatePlaceholders(translations) {
        // Translate input placeholders
        const inputs = document.querySelectorAll('input[placeholder]');
        inputs.forEach(input => {
            const placeholder = input.placeholder;
            if (placeholder.includes('Ask me anything')) {
                input.placeholder = translations['type-message'] || placeholder;
            } else if (placeholder.includes('Type a message')) {
                input.placeholder = translations['type-message'] || placeholder;
            } else if (placeholder.includes('Search')) {
                input.placeholder = translations['search'] || placeholder;
            }
        });
    }
}

// Initialize language switcher when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.languageSwitcher = new LanguageSwitcher();
});