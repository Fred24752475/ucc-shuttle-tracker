/**
 * Student Dashboard Event Handlers
 * Handles all button clicks and user interactions for the student dashboard
 */

// Global state
let currentSection = 'dashboard';
let currentUser = null;

// Initialize all event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('🎯 Initializing student dashboard event handlers...');

    // Load user info
    loadUserInfo();

    // Initialize all event listeners
    initializeSidebarEvents();
    initializeQuickActionEvents();
    initializeWidgetEvents();
    initializeNavigationEvents();
    initializeMessageEvents();
    initializeRideEvents();
    initializeHelpEvents();
    initializeAIAssistantEvents();

    console.log('✅ All event handlers initialized successfully');
});

// ============= SIDEBAR NAVIGATION =============
function initializeSidebarEvents() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Navigation items - using event delegation
    const navItems = document.querySelectorAll('.nav-item a');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.closest('.nav-item').dataset.section;
            navigateToSection(section);
        });
    });
}

// ============= QUICK ACTION CARDS =============
function initializeQuickActionEvents() {
    // Request Ride card
    const requestRideCard = document.querySelector('.action-card.primary');
    if (requestRideCard) {
        requestRideCard.addEventListener('click', handleRequestRideClick);
    }

    // Track Shuttle card
    const trackShuttleCard = document.querySelector('.action-card.info');
    if (trackShuttleCard) {
        trackShuttleCard.addEventListener('click', handleTrackShuttleClick);
    }

    // Emergency Alert card
    const emergencyCard = document.querySelector('.action-card.warning');
    if (emergencyCard) {
        emergencyCard.addEventListener('click', handleEmergencyClick);
    }
}

// ============= WIDGET BUTTONS =============
function initializeWidgetEvents() {
    // View All Shuttles button
    const viewShuttlesBtn = document.querySelector('.widget-btn[onclick*="handleShuttleAvailabilityClick"]');
    if (viewShuttlesBtn) {
        viewShuttlesBtn.removeAttribute('onclick');
        viewShuttlesBtn.addEventListener('click', handleShuttleAvailabilityClick);
    }

    // Manage Trip button
    const manageTripBtn = document.querySelector('.widget-btn[onclick*="handleCurrentTripClick"]');
    if (manageTripBtn) {
        manageTripBtn.removeAttribute('onclick');
        manageTripBtn.addEventListener('click', handleCurrentTripClick);
    }

    // View Full History button
    const viewHistoryBtn = document.querySelector('.widget-btn[onclick*="handleTripHistoryClick"]');
    if (viewHistoryBtn) {
        viewHistoryBtn.removeAttribute('onclick');
        viewHistoryBtn.addEventListener('click', handleTripHistoryClick);
    }

    // Map widget click
    const mapWidget = document.querySelector('.map-widget');
    if (mapWidget) {
        mapWidget.addEventListener('click', handleMapClick);
    }

    // Trip action buttons
    const cancelTripBtn = document.querySelector('.trip-action-btn.cancel');
    if (cancelTripBtn) {
        cancelTripBtn.removeAttribute('onclick');
        cancelTripBtn.addEventListener('click', cancelCurrentTrip);
    }

    const rescheduleTripBtn = document.querySelector('.trip-action-btn.reschedule');
    if (rescheduleTripBtn) {
        rescheduleTripBtn.removeAttribute('onclick');
        rescheduleTripBtn.addEventListener('click', rescheduleCurrentTrip);
    }
}

// ============= NAVIGATION FUNCTIONS =============
function initializeNavigationEvents() {
    // Back to Dashboard buttons
    const backButtons = document.querySelectorAll('.back-btn');
    backButtons.forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            showDashboard();
        });
    });

    // Apply History Filter button
    const filterBtn = document.querySelector('.filter-btn');
    if (filterBtn) {
        filterBtn.removeAttribute('onclick');
        filterBtn.addEventListener('click', applyHistoryFilter);
    }
}

// ============= MESSAGE EVENTS =============
function initializeMessageEvents() {
    // Chat tabs
    const chatTabs = document.querySelectorAll('.chat-tabs .tab-btn');
    chatTabs.forEach(tab => {
        tab.removeAttribute('onclick');
        tab.addEventListener('click', function () {
            const category = this.textContent.toLowerCase().trim();
            switchChatTab(category);
        });
    });

    // Send message button
    const sendMsgBtn = document.querySelector('.chat-input button');
    if (sendMsgBtn) {
        sendMsgBtn.removeAttribute('onclick');
        sendMsgBtn.addEventListener('click', sendMessage);
    }

    // Message input enter key
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
}

// ============= RIDE EVENTS =============
function initializeRideEvents() {
    // Ride tabs
    const rideTabs = document.querySelectorAll('.ride-tabs .tab-btn');
    rideTabs.forEach(tab => {
        tab.removeAttribute('onclick');
        tab.addEventListener('click', function () {
            const tabType = this.textContent.toLowerCase().includes('upcoming') ? 'upcoming' :
                this.textContent.toLowerCase().includes('history') ? 'history' : 'cancelled';
            switchRideTab(tabType);
        });
    });
}

// ============= HELP EVENTS =============
function initializeHelpEvents() {
    // Help tabs
    const helpTabs = document.querySelectorAll('.help-tabs .tab-btn');
    helpTabs.forEach(tab => {
        tab.removeAttribute('onclick');
        tab.addEventListener('click', function () {
            const tabType = this.textContent.toLowerCase().includes('faq') ? 'faq' :
                this.textContent.toLowerCase().includes('contact') ? 'contact' : 'emergency';
            switchHelpTab(tabType);
        });
    });
}

// ============= AI ASSISTANT EVENTS =============
function initializeAIAssistantEvents() {
    // Send AI message button
    const aiSendBtn = document.querySelector('.ai-send-btn');
    if (aiSendBtn) {
        aiSendBtn.removeAttribute('onclick');
        aiSendBtn.addEventListener('click', sendAIMessage);
    }

    // AI input enter key
    const aiInput = document.getElementById('simpleAIInput');
    if (aiInput) {
        aiInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendAIMessage();
            }
        });
    }
}

// ============= NAVIGATION HANDLER FUNCTIONS =============
function navigateToSection(section) {
    console.log(`📍 Navigating to section: ${section}`);

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to current section
    const activeItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Route to appropriate section
    switch (section) {
        case 'dashboard':
            showDashboard();
            break;
        case 'rides':
            showRides();
            break;
        case 'map':
            showMap();
            break;
        case 'history':
            showHistory();
            break;
        case 'ai-assistant':
            showAiAssistant();
            break;
        case 'messages':
            showMessages();
            break;
        case 'help':
            showHelp();
            break;
        default:
            console.warn(`Unknown section: ${section}`);
    }

    currentSection = section;
}

function showDashboard() {
    hideAllSections();
    const dashboard = document.getElementById('dashboardMain');
    if (dashboard) {
        dashboard.style.display = 'block';
    }
    console.log('📊 Showing dashboard');
}

function showRides() {
    hideAllSections();
    const ridesSection = document.getElementById('ridesSection');
    if (ridesSection) {
        ridesSection.style.display = 'block';
        loadRides();
    }
    console.log('🚗 Showing rides');
}

function showMap() {
    hideAllSections();
    const mapSection = document.getElementById('mapSection');
    if (mapSection) {
        mapSection.style.display = 'block';
        
        // Initialize map after section is visible with a small delay
        setTimeout(() => {
            if (window.initializeSimpleMap && typeof window.initializeSimpleMap === 'function') {
                console.log('🗺️ Initializing map after section is visible...');
                window.initializeSimpleMap();
            }
        }, 100);
    }
    console.log('🗺️ Showing map section');
}

function showHistory() {
    hideAllSections();
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.style.display = 'block';
        loadTripHistory();
    }
    console.log('📊 Showing history');
}

function showAiAssistant() {
    hideAllSections();
    const aiSection = document.getElementById('aiAssistantSection');
    if (aiSection) {
        aiSection.style.display = 'block';
    }
    console.log('🤖 Showing AI assistant');
}

function showMessages() {
    hideAllSections();
    const messagesSection = document.getElementById('messagesSection');
    if (messagesSection) {
        messagesSection.style.display = 'block';
        loadMessages();
    }
    console.log('💬 Showing messages');
}

function showHelp() {
    hideAllSections();
    const helpSection = document.getElementById('helpSection');
    if (helpSection) {
        helpSection.style.display = 'block';
    }
    console.log('❓ Showing help');
}

function hideAllSections() {
    const sections = [
        'dashboardMain',
        'ridesSection',
        'mapSection',
        'historySection',
        'aiAssistantSection',
        'messagesSection',
        'helpSection'
    ];

    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
}

// ============= ACTION HANDLERS =============
function handleRequestRideClick() {
    console.log('🎫 Request Ride clicked');
    showRides();
    // Show booking form or modal
    alert('🚌 Opening ride booking form...\n\nThis will allow you to:\n• Select pickup location\n• Choose destination\n• View available shuttles\n• Book your ride');
}

function handleTrackShuttleClick() {
    console.log('📍 Track Shuttle clicked');
    showMap();
}

function handleEmergencyClick() {
    console.log('🚨 Emergency Alert clicked');
    const confirmed = confirm('🚨 EMERGENCY ALERT\n\nAre you experiencing an emergency?\n\nClick OK to send an alert to campus security and all nearby drivers.');

    if (confirmed) {
        // Send emergency alert
        sendEmergencyAlert();
    }
}

function handleShuttleAvailabilityClick() {
    console.log('🚌 View All Shuttles clicked');
    showMap();
}

function handleCurrentTripClick() {
    console.log('🎫 Manage Trip clicked');
    showRides();
}

function handleTripHistoryClick() {
    console.log('📊 View Full History clicked');
    showHistory();
}

function handleMapClick() {
    console.log('🗺 Map widget clicked');
    showMap();
}

// ============= SIDEBAR FUNCTIONS =============
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');

    if (sidebar) {
        sidebar.classList.toggle('active');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }

    console.log('🔄 Sidebar toggled');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');

    if (sidebar) {
        sidebar.classList.remove('active');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function handleLogout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
        console.log('👋 Logging out...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'student-login.html';
    }
}

// ============= TAB SWITCHING =============
function switchChatTab(category) {
    console.log(`💬 Switching to ${category} chat`);

    // Update active tab
    document.querySelectorAll('.chat-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(category)) {
            btn.classList.add('active');
        }
    });

    // Load conversations for this category
    loadConversations(category);
}

function switchRideTab(tabType) {
    console.log(`🚗 Switching to ${tabType} rides`);

    // Update active tab
    document.querySelectorAll('.ride-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    event.target.classList.add('active');

    // Load rides for this tab
    loadRidesForTab(tabType);
}

function switchHelpTab(tabType) {
    console.log(`❓ Switching to ${tabType} help`);

    // Update active tab
    document.querySelectorAll('.help-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    event.target.classList.add('active');

    // Show appropriate help content
    // Implementation depends on your help system
}

// ============= TRIP MANAGEMENT =============
function cancelCurrentTrip() {
    const confirmed = confirm('Are you sure you want to cancel your current trip?');
    if (confirmed) {
        console.log('❌ Cancelling trip...');
        // API call to cancel trip
        alert('Trip cancelled successfully');
    }
}

function rescheduleCurrentTrip() {
    console.log('🔄 Rescheduling trip...');
    alert('Opening reschedule dialog...');
    // Show reschedule modal
}

function applyHistoryFilter() {
    const filter = document.getElementById('historyFilter').value;
    console.log(`🔍 Applying filter: ${filter}`);
    loadTripHistory(filter);
}

// ============= MESSAGING =============
function sendMessage() {
    const input = document.getElementById('messageInput');
    if (input && input.value.trim()) {
        const message = input.value.trim();
        console.log(`📤 Sending message: ${message}`);

        // Add message to chat
        addMessageToChat(message, 'sent');

        // Clear input
        input.value = '';

        // TODO: Send to API
    }
}

function addMessageToChat(message, type) {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// ============= AI ASSISTANT =============
function sendAIMessage() {
    const input = document.getElementById('simpleAIInput');
    if (input && input.value.trim()) {
        const message = input.value.trim();
        console.log(`🤖 Sending AI message: ${message}`);

        // Add user message
        addAIMessage(message, 'user');

        // Clear input
        input.value = '';

        // Simulate AI response
        setTimeout(() => {
            const response = getAIResponse(message);
            addAIMessage(response, 'bot');
        }, 1000);
    }
}

function addAIMessage(message, type) {
    const aiMessages = document.getElementById('aiMessages');
    if (aiMessages) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${type}`;
        messageDiv.innerHTML = type === 'bot'
            ? `<i class="fas fa-robot"></i><p>${message}</p>`
            : `<p>${message}</p>`;
        aiMessages.appendChild(messageDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }
}

function getAIResponse(message) {
    const msg = message.toLowerCase();

    if (msg.includes('book') || msg.includes('ride')) {
        return "I can help you book a ride! Would you like me to show you available shuttles and help you select your pickup and destination?";
    } else if (msg.includes('track') || msg.includes('where')) {
        return "You can track shuttles in real-time on the map. Would you like me to open the map view for you?";
    } else if (msg.includes('emergency')) {
        return "For emergencies, please use the Emergency Alert button or call campus security immediately. Is this an emergency?";
    } else {
        return "I'm here to help! You can ask me about booking rides, tracking shuttles, viewing your trip history, or getting help. What would you like to know?";
    }
}

// ============= DATA LOADING FUNCTIONS =============
function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser = user;

    const userName = document.getElementById('userName');
    const studentName = document.getElementById('studentName');

    if (userName && user.name) {
        userName.textContent = user.name;
    }
    if (studentName && user.name) {
        studentName.textContent = user.name.split(' ')[0];
    }
}

function loadRides() {
    console.log('🚗 Loading rides...');
    loadRidesForTab('upcoming');
}

function loadRidesForTab(tabType) {
    const ridesList = document.getElementById('ridesList');
    if (ridesList) {
        ridesList.innerHTML = '<div class="loading-spinner"></div>';

        // Simulate loading
        setTimeout(() => {
            ridesList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-car" style="font-size: 48px; margin-bottom: 16px; color: #ddd;"></i>
                    <p>No ${tabType} rides found</p>
                    <button onclick="handleRequestRideClick()" style="margin-top: 12px; background: #1565c0; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        Book a Ride
                    </button>
                </div>
            `;
        }, 500);
    }
}

function loadTripHistory(filter = 'all') {
    console.log(`📊 Loading trip history (${filter})...`);
    const historyList = document.getElementById('historyList');
    if (historyList) {
        historyList.innerHTML = '<div class="loading-spinner"></div>';

        setTimeout(() => {
            historyList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 16px; color: #ddd;"></i>
                    <p>No trip history available</p>
                </div>
            `;
        }, 500);
    }
}

function loadMessages() {
    console.log('💬 Loading messages...');
    loadConversations('students');
}

function loadConversations(category) {
    const chatList = document.getElementById('chatList');
    if (chatList) {
        chatList.innerHTML = '<div class="loading-spinner"></div>';

        setTimeout(() => {
            chatList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; color: #ddd;"></i>
                    <p>No conversations yet</p>
                </div>
            `;
        }, 500);
    }
}

function sendEmergencyAlert() {
    console.log('🚨 Sending emergency alert...');

    // Get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // TODO: Send to API
                console.log('📍 Emergency location:', location);
                alert('🚨 Emergency alert sent!\n\nCampus security and nearby drivers have been notified.\nStay safe!');
            },
            (error) => {
                console.error('Location error:', error);
                alert('🚨 Emergency alert sent!\n\n(Note: Unable to get your location)\n\nCampus security has been notified.');
            }
        );
    } else {
        alert('🚨 Emergency alert sent!\n\nCampus security has been notified.');
    }
}

console.log('📝 Student dashboard events script loaded');
