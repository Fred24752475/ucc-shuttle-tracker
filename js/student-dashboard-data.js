/**
 * Student Dashboard Data Loader
 * Loads dynamic content for all dashboard sections using new API endpoints
 */

// API base URL
const API_BASE = '/api';

// Get auth token
function getAuthToken() {
    return localStorage.getItem('ucc_token') || localStorage.getItem('token');
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }


    return data;
}

// ============= MY DASHBOARD DATA LOADING =============
async function loadDashboardData() {
    try {
        const profileData = await apiRequest('/student/profile');
        if (profileData.success && profileData.profile) {
            const fullName = profileData.profile.name;
            const studentName = document.getElementById('studentName');
            const userName = document.getElementById('userName');
            if (studentName && fullName) studentName.textContent = fullName;
            if (userName && fullName) userName.textContent = fullName;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
    try {
        const ridesData = await apiRequest('/rides?status=active');
        if (ridesData.success) {
            const tripsEl = document.getElementById('todayTripsCount');
            if (tripsEl) tripsEl.textContent = ridesData.rides.length;
        }
    } catch (error) {
        console.error('Error loading trips:', error);
    }
    await loadShuttleList();
}

async function loadShuttleList() {
    const shuttleList = document.getElementById('shuttleList');
    try {
        const data = await apiRequest('/shuttles/active');
        const shuttles = (data && data.shuttles) || [];
        const countEl = document.getElementById('activeShuttlesCount');
        if (countEl) countEl.textContent = shuttles.length;
        if (!shuttleList) return;
        if (!shuttles.length) {
            shuttleList.innerHTML = '<p class="shuttle-empty">No shuttle is on the road right now.</p>';
            return;
        }
        shuttleList.innerHTML = shuttles.map((shuttle) => `
            <div class="shuttle-item">
                <div class="shuttle-info">
                    <span class="shuttle-name">${ticketText(shuttle.vehicle_number || shuttle.vehicleNumber || 'Shuttle')}</span>
                    <span class="shuttle-route">${ticketText(shuttle.routeName || 'Campus Express')} · ${ticketText(shuttle.driver_name || shuttle.driverName || 'Driver')}</span>
                </div>
                <span class="shuttle-status active">On road</span>
            </div>
        `).join('');
    } catch (error) {
        if (shuttleList) shuttleList.innerHTML = '<p class="shuttle-empty">Shuttles could not be loaded. Pull to refresh.</p>';
    }
}

function ticketText(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

window.renderRideTicket = function (ride, allowCancel) {
    const when = new Date(ride.created_at);
    const date = when.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const time = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const status = String(ride.status || 'pending');
    const fare = Number(ride.fare || 0).toFixed(2);
    const canCancel = allowCancel && status !== 'completed' && status !== 'cancelled';
    return `
        <article class="ticket ${ticketText(status)}">
            <header class="ticket-top">
                <span class="ticket-status ${ticketText(status)}">${ticketText(status)}</span>
                <strong class="ticket-fare">GH₵${fare}</strong>
            </header>
            <p class="ticket-when">${date} · ${time} <span>#${ticketText(ride.id)}</span></p>
            <div class="ticket-route">
                <div><i></i><b>${ticketText(ride.pickup_location || 'Pickup')}</b></div>
                <div><i></i><b>${ticketText(ride.destination || 'Destination')}</b></div>
            </div>
            <footer class="ticket-meta">
                <span>${ticketText(ride.driver_name || 'Driver')}</span>
                <span>${ticketText(ride.shuttle_number || ride.vehicle_number || 'Shuttle')}</span>
                ${canCancel ? `<button type="button" class="ticket-cancel" onclick="cancelRide(${Number(ride.id)})">Cancel</button>` : ''}
            </footer>
        </article>`;
};

// ============= MY RIDES DATA LOADING =============
async function loadRidesData() {
    try {
        const data = await apiRequest('/rides?status=upcoming');
        const ridesList = document.getElementById('ridesList');

        if (data.success && data.rides && data.rides.length > 0) {
            ridesList.innerHTML = data.rides.map((ride) => window.renderRideTicket(ride, true)).join('');
        } else {
            ridesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car" style="font-size: 48px; color: #ddd;"></i>
                    <p>No upcoming rides</p>
                    <button onclick="showBookingForm()" class="btn-primary">Book a Ride</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading rides:', error);
    }
}

window.showBookingForm = function () {
    const form = document.getElementById('bookRideForm');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bookRideForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const pickup = document.getElementById('bookPickup').value;
        const destination = document.getElementById('bookDestination').value;
        await bookRide({ pickup_location: pickup, destination });
    });
});

// Book a ride
async function bookRide(formData) {
    try {
        const data = await apiRequest('/rides/book', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (data.success) {
            if (typeof loadRidesForTab === 'function') loadRidesForTab('upcoming');
            else loadRidesData();
        } else {
            alert(data.message || 'Could not book that ride');
        }
    } catch (error) {
        alert(window.readableProblem ? window.readableProblem(error) : 'That ride could not be booked. Try again.');
    }
}

// Cancel a ride
window.cancelRide = async function (rideId) {
    if (!confirm('Are you sure you want to cancel this ride?')) return;

    try {
        const data = await apiRequest(`/rides/${rideId}`, { method: 'DELETE' });

        if (data.success) {
            alert('✅ Ride cancelled successfully');
            loadRidesData();
        }
    } catch (error) {
        alert('That ride could not be cancelled. Try again.');
    }
};

// ============= TRIP HISTORY DATA LOADING =============
async function loadTripHistoryData(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const data = await apiRequest(`/trips/history?${params}`);
        const historyList = document.getElementById('historyList');

        if (data.success && data.trips && data.trips.length > 0) {
            historyList.innerHTML = data.trips.map((trip) => window.renderRideTicket(trip, false)).join('');
        } else {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history" style="font-size: 48px; color: #ddd;"></i>
                    <p>No trip history available</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading trip history:', error);
        const historyList = document.getElementById('historyList');
        if (historyList) historyList.innerHTML = '<p style="padding:20px;">Could not load trips. Please try again.</p>';
    }
}

// ============= HELP/FAQ DATA LOADING =============
async function loadHelpData() {
    try {
        const data = await apiRequest('/help/faq');
        const faqSection = document.getElementById('faqSection');

        if (data.success && data.faqs) {
            const categories = [...new Set(data.faqs.map(f => f.category))];

            faqSection.innerHTML = categories.map(category => `
                <div class="faq-category">
                    <h3>${category}</h3>
                    ${data.faqs
                    .filter(f => f.category === category)
                    .map(faq => `
                            <div class="faq-item">
                                <h4>${faq.question}</h4>
                                <p>${faq.answer}</p>
                            </div>
                        `).join('')}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading help data:', error);
    }
}

// ============= PROFILE DATA LOADING =============
async function loadProfileData() {
    try {
        const data = await apiRequest('/student/profile');

        if (data.success && data.profile) {
            const profile = data.profile;

            // Populate profile form/display
            document.getElementById('profileName').value = profile.name || '';
            document.getElementById('profileEmail').value = profile.email || '';
            document.getElementById('profilePhone').value = profile.phone || '';
            document.getElementById('profileDepartment').value = profile.department || '';
            document.getElementById('profileYear').value = profile.year_of_study || '';
            document.getElementById('emergencyContact').value = profile.emergency_contact || '';
            document.getElementById('emergencyPhone').value = profile.emergency_phone || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Update profile
async function updateProfile(formData) {
    try {
        const data = await apiRequest('/student/profile', {
            method: 'PUT',
            body: JSON.stringify(formData)
        });

        if (data.success) {
            alert('✅ Profile updated successfully!');
            loadProfileData();
        }
    } catch (error) {
        alert('Your details could not be saved. Try again.');
    }
}

// ============= AI ASSISTANT =============
async function sendAIQuery(message) {
    // Use local AI responses instead of API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const lowerMessage = message.toLowerCase();
    let response = '';
    
    // Greetings
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
        const greetings = [
            "Hi there! 👋 How can I assist you with the UCC shuttle service today?",
            "Hello! Ready to help you get around campus. What do you need?",
            "Hey! 🚀 Looking for a shuttle? I'm here to help!",
            "Good day! What can I do for you today?"
        ];
        response = greetings[Math.floor(Math.random() * greetings.length)];
    }
    // Library
    else if (lowerMessage.includes('library')) {
        const libraryResponses = [
            `📚 The Library Shuttle is running smoothly! Next one arrives in about ${Math.floor(Math.random() * 8) + 2} minutes. It departs every 10 minutes from Main Campus.`,
            `🚌 Heading to the library? Perfect timing! A shuttle will be there in ${Math.floor(Math.random() * 8) + 2} minutes. They run every 10 minutes.`,
            `📖 Library shuttle coming up! ETA: ${Math.floor(Math.random() * 8) + 2} minutes. Regular service every 10 minutes from Main Campus.`
        ];
        response = libraryResponses[Math.floor(Math.random() * libraryResponses.length)];
    }
    // Hostel
    else if (lowerMessage.includes('hostel')) {
        const hostelResponses = [
            `🏠 Hostel shuttles serve both Hostel A and B every 20 minutes. Next one in about ${Math.floor(Math.random() * 12) + 5} minutes!`,
            `🛌 Going to the hostels? The shuttle runs every 20 minutes. Current wait time: ${Math.floor(Math.random() * 12) + 5} minutes.`,
            `🏘️ Hostel service is active! Both A and B are covered. Next shuttle arrives in ${Math.floor(Math.random() * 12) + 5} minutes.`
        ];
        response = hostelResponses[Math.floor(Math.random() * hostelResponses.length)];
    }
    // Science
    else if (lowerMessage.includes('science')) {
        const scienceResponses = [
            `🔬 Science Block Shuttle operates every 15 minutes during class hours. Next arrival: ${Math.floor(Math.random() * 10) + 3} minutes.`,
            `🧪 Heading to Science Block? Shuttle comes every 15 minutes. You'll catch one in about ${Math.floor(Math.random() * 10) + 3} minutes!`,
            `🔬 Science shuttle is on schedule! Running every 15 minutes. ETA: ${Math.floor(Math.random() * 10) + 3} minutes.`
        ];
        response = scienceResponses[Math.floor(Math.random() * scienceResponses.length)];
    }
    // Delays
    else if (lowerMessage.includes('delay') || lowerMessage.includes('late')) {
        const delayResponses = [
            "✅ Good news! No delays reported right now. All shuttles are running on time.",
            "🚀 Everything's on schedule! No delays at the moment. Would you like me to notify you if anything changes?",
            "✅ All clear! Shuttles are running smoothly with no delays reported."
        ];
        response = delayResponses[Math.floor(Math.random() * delayResponses.length)];
    }
    // Booking
    else if (lowerMessage.includes('book') || lowerMessage.includes('request') || lowerMessage.includes('ride')) {
        const bookingResponses = [
            "📱 Ready to book? Just tap the 'Request Ride' button on your dashboard. Pick your location and destination, and we'll find you a shuttle!",
            "🚌 Want to book a ride? Easy! Use the 'Request Ride' button, select pickup and drop-off points, and you're all set!",
            "📍 Booking is simple! Hit 'Request Ride' on your dashboard, choose your route, and I'll match you with the nearest shuttle."
        ];
        response = bookingResponses[Math.floor(Math.random() * bookingResponses.length)];
    }
    // Emergency
    else if (lowerMessage.includes('emergency')) {
        const emergencyResponses = [
            "🚨 For emergencies, use the Emergency Alert button immediately! You can also call campus security at +233-XXX-XXXX. Your safety is our top priority!",
            "⚠️ Emergency? Press the Emergency Alert button right away or call +233-XXX-XXXX. We're here to help!",
            "🚨 Safety first! Use the Emergency Alert button for immediate help, or contact campus security at +233-XXX-XXXX."
        ];
        response = emergencyResponses[Math.floor(Math.random() * emergencyResponses.length)];
    }
    // Schedule
    else if (lowerMessage.includes('time') || lowerMessage.includes('schedule') || lowerMessage.includes('hours')) {
        const scheduleResponses = [
            "⏰ Peak hours (7am-7pm): Shuttles every 10-15 minutes. Off-peak: Every 20-30 minutes. Real-time tracking on your dashboard!",
            "📅 Service hours: 7am-7pm with frequent shuttles (10-15 min). After hours: 20-30 min intervals. Check your dashboard for live updates!",
            "⏰ We run all day! Peak times: 10-15 min frequency. Quieter times: 20-30 min. Track shuttles in real-time on your dashboard."
        ];
        response = scheduleResponses[Math.floor(Math.random() * scheduleResponses.length)];
    }
    // Contact
    else if (lowerMessage.includes('contact') || lowerMessage.includes('help') || lowerMessage.includes('support')) {
        const contactResponses = [
            "📞 Need more help? Contact UCC Shuttle Support:\n📱 Hotline: +233-302-XXXX\n📧 Email: shuttle@ucc.edu.gh\n🏢 Office: Student Center, Room 101\n🕐 Hours: 6am-10pm daily",
            "👋 Here's how to reach us:\n📞 Hotline: +233-302-XXXX\n✉️ Email: shuttle@ucc.edu.gh\n🏛️ Office: Student Center, Room 101\nOpen 6am-10pm every day!",
            "📲 Get in touch with our team:\n📞 Call: +233-302-XXXX\n📧 Email: shuttle@ucc.edu.gh\n🏢 Visit: Student Center, Room 101 (6am-10pm)"
        ];
        response = contactResponses[Math.floor(Math.random() * contactResponses.length)];
    }
    // Cost/Fare
    else if (lowerMessage.includes('cost') || lowerMessage.includes('fare') || lowerMessage.includes('price') || lowerMessage.includes('pay')) {
        const fareResponses = [
            "💰 Current fares:\n• Regular routes: ₵5.00\n• Long-distance: ₵8.00\n• Special events: ₵10.00\nWe accept Cash, Mobile Money, and UCC ID Card!",
            "💳 Pricing:\n🚌 Regular: ₵5.00\n🚌 Long routes: ₵8.00\n🎉 Events: ₵10.00\nPayment: Cash, MoMo, or UCC ID!",
            "💵 Here's what it costs:\n• Campus routes: ₵5.00\n• Longer trips: ₵8.00\n• Special occasions: ₵10.00\nPay with Cash, Mobile Money, or your UCC ID Card."
        ];
        response = fareResponses[Math.floor(Math.random() * fareResponses.length)];
    }
    // Thanks
    else if (lowerMessage.match(/(thank|thanks|appreciate)/)) {
        const thanksResponses = [
            "You're welcome! 😊 Happy to help. Safe travels!",
            "Anytime! 👍 Have a great trip!",
            "My pleasure! ✨ Enjoy your ride!",
            "Glad I could help! 🚀 See you around campus!"
        ];
        response = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
    }
    // Default
    else {
        const defaultResponses = [
            "🤖 I can help you with shuttle schedules, booking rides, checking delays, emergencies, and more! What would you like to know?",
            "🚌 I'm here to assist! Ask me about shuttle times, how to book, fares, or anything else about UCC shuttle service.",
            "👋 Not sure what you need? I can help with schedules, bookings, delays, contact info, and more. Just ask!",
            "✨ I'm your shuttle assistant! I can tell you about routes, times, booking, costs, and emergency contacts. What interests you?"
        ];
        response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
    
    return {
        response: response,
        suggestions: []
    };
}

// Add AI response to chat
function displayAIResponse(response, suggestions) {
    const aiMessages = document.getElementById('simpleAIChat');
    if (!aiMessages) {
        console.error('❌ AI chat container not found');
        return;
    }

    // Add AI response
    const responseDiv = document.createElement('div');
    responseDiv.className = 'ai-message bot';
    responseDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-bubble">
            <p>${response}</p>
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
    aiMessages.appendChild(responseDiv);

    // Add suggestions if any
    if (suggestions && suggestions.length > 0) {
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'ai-suggestions';
        suggestionsDiv.innerHTML = suggestions.map(s =>
            `<button class="suggestion-btn" onclick="handleSuggestionClick('${s}')">${s}</button>`
        ).join('');
        aiMessages.appendChild(suggestionsDiv);
    }

    aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Handle suggestion clicks
window.handleSuggestionClick = function (suggestion) {
    document.getElementById('simpleAIInput').value = suggestion;
    sendAIMessage();
};

// Enhanced sendAIMessage function
window.sendAIMessage = async function () {
    const input = document.getElementById('simpleAIInput');
    const aiMessages = document.getElementById('simpleAIChat');
    
    if (!input || !input.value.trim() || !aiMessages) return;

    const message = input.value.trim();

    // Add user message
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-message user';
    userDiv.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-bubble">
            <p>${message}</p>
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
    aiMessages.appendChild(userDiv);

    // Clear input
    input.value = '';

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message bot typing';
    typingDiv.innerHTML = '<div class="message-avatar">🤖</div><div class="message-bubble"><p>Typing...</p></div>';
    typingDiv.id = 'typing-indicator';
    aiMessages.appendChild(typingDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;

    // Get AI response
    const result = await sendAIQuery(message);

    // Remove typing indicator
    document.getElementById('typing-indicator')?.remove();

    // Display response
    displayAIResponse(result.response, result.suggestions);
};

// ============= AUTO-LOAD DATA ON SECTION CHANGE =============
// Override existing navigation functions to auto-load data
const originalShowDashboard = window.showDashboard;
window.showDashboard = function () {
    originalShowDashboard?.();
    hideAllSections();
    document.getElementById('dashboardMain').style.display = 'block';
    loadDashboardData();
};

const originalShowRides = window.showRides;
window.showRides = function () {
    originalShowRides?.();
    hideAllSections();
    document.getElementById('ridesSection').style.display = 'block';
    loadRidesData();
};

// Enhanced map initialization
const originalShowMap = window.showMap;
window.showMap = function () {
    originalShowMap?.();
    hideAllSections();
    const mapSection = document.getElementById('mapSection');
    if (mapSection) {
        mapSection.style.display = 'block';

        // Initialize the UCCShuttleMap if not already initialized
        setTimeout(() => {
            if (!window.uccMap) {
                console.log('🗺️ Initializing UCC Shuttle Map...');
                window.uccMap = new UCCShuttleMap();
            } else {
                // Refresh shuttle data if map already exists
                window.uccMap.refreshShuttles();
                // Re-center map on UCC campus
                if (window.uccMap.map) {
                    window.uccMap.map.invalidateSize(); // Fix map rendering issues
                }
            }
        }, 100);
    }
};

const originalShowHistory = window.showHistory;
window.showHistory = function () {
    originalShowHistory?.();
    hideAllSections();
    document.getElementById('historySection').style.display = 'block';
    loadTripHistoryData();
};

const originalShowHelp = window.showHelp;
window.showHelp = function () {
    originalShowHelp?.();
    hideAllSections();
    document.getElementById('helpSection').style.display = 'block';
    loadHelpData();
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    loadDashboardData();
    if (typeof io === 'function') {
        const socket = io();
        socket.on('ride:update', () => {
            if (typeof loadRidesData === 'function') loadRidesData();
            if (typeof loadRidesForTab === 'function') loadRidesForTab('upcoming');
        });
    }

    console.log('✅ Dashboard data loader initialized');
});

console.log('📊 Student dashboard data loader script loaded');
