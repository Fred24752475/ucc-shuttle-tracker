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

let lastShuttles = [];

async function loadShuttleList() {
    const shuttleList = document.getElementById('shuttleList');
    try {
        const data = await apiRequest('/shuttles/active');
        const shuttles = (data && data.shuttles) || [];
        lastShuttles = shuttles;
        const countEl = document.getElementById('activeShuttlesCount');
        if (countEl) countEl.textContent = shuttles.length;
        if (!shuttleList) return;
        if (!shuttles.length) {
            shuttleList.innerHTML = '<p class="shuttle-empty">No shuttle is on the road right now.</p>';
            updateFollowedTripPanel([]);
            return;
        }
        const followed = window.CampusLiveMap && window.CampusLiveMap.getFollowed ? window.CampusLiveMap.getFollowed() : null;
        shuttleList.innerHTML = shuttles.map((shuttle) => {
            const active = followed != null && String(shuttle.id) === String(followed);
            return `
            <button type="button" class="shuttle-item${active ? ' is-followed' : ''}" data-shuttle-id="${ticketText(shuttle.id)}">
                <div class="shuttle-info">
                    <span class="shuttle-name">${ticketText(shuttle.vehicle_number || shuttle.vehicleNumber || 'Shuttle')}</span>
                    <span class="shuttle-route">${ticketText(shuttle.routeName || 'Campus Express')} · ${ticketText(shuttle.driver_name || shuttle.driverName || 'Driver')}</span>
                </div>
                <span class="shuttle-status active">${active ? 'Following' : 'On road'}</span>
            </button>`;
        }).join('');
        if (!shuttleList.dataset.bound) {
            shuttleList.dataset.bound = '1';
            shuttleList.addEventListener('click', (event) => {
                const item = event.target.closest('[data-shuttle-id]');
                if (!item) return;
                window.followShuttle(item.dataset.shuttleId);
            });
        }
        updateFollowedTripPanel(shuttles);
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
            </footer>
        </article>`;
};

// ============= MY STOP AND FOLLOW =============
const CAMPUS_STOPS = [
    { name: 'West Gate', latitude: 5.1085, longitude: -1.2980 },
    { name: 'East Gate', latitude: 5.1160, longitude: -1.2795 },
    { name: 'Administration', latitude: 5.1155, longitude: -1.2909 },
    { name: 'Science', latitude: 5.1125, longitude: -1.2865 },
    { name: 'Library', latitude: 5.1210, longitude: -1.2860 },
    { name: 'Hospital', latitude: 5.1095, longitude: -1.2810 },
    { name: 'Halls', latitude: 5.1110, longitude: -1.2765 }
];
const BUS_KMH = 25;
let savedStop = null;
const seenApproaches = new Set();

/* approach-alert */
function kmBetweenPoints(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minutesToStop(shuttle, stop) {
    const lat = Number(shuttle.latitude);
    const lng = Number(shuttle.longitude);
    if (!stop || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return (kmBetweenPoints(lat, lng, Number(stop.latitude), Number(stop.longitude)) / BUS_KMH) * 60;
}

function nextApproachAlert(seen, key, minutes) {
    const aboutFive = minutes >= 4 && minutes <= 6;
    if (aboutFive && !seen.has(key)) {
        seen.add(key);
        return true;
    }
    if (minutes < 3 || minutes > 7) seen.delete(key);
    return false;
}
/* /approach-alert */

function renderMyStop() {
    const list = document.getElementById('campusStopList');
    const summary = document.getElementById('savedStopSummary');
    const home = document.getElementById('currentPickupLocation');
    if (list) {
        list.innerHTML = CAMPUS_STOPS.map((stop) => {
            const selected = savedStop && savedStop.name === stop.name;
            return `<button type="button" class="stop-choice${selected ? ' is-saved' : ''}" data-stop="${ticketText(stop.name)}">${ticketText(stop.name)}</button>`;
        }).join('');
        if (!list.dataset.bound) {
            list.dataset.bound = '1';
            list.addEventListener('click', (event) => {
                const button = event.target.closest('[data-stop]');
                if (button) saveCampusStop(button.dataset.stop);
            });
        }
    }
    const sentence = savedStop
        ? `Waiting at ${savedStop.name}. You will see one banner when a shuttle is about 5 minutes away.`
        : 'Choose the stop where you wait. A banner appears when a live shuttle is about 5 minutes away.';
    if (summary) summary.textContent = sentence;
    if (home) home.innerHTML = `<div class="no-location">${ticketText(sentence)}</div>`;
    const followed = window.CampusLiveMap && window.CampusLiveMap.getFollowed ? window.CampusLiveMap.getFollowed() : null;
    const shuttle = lastShuttles.find((item) => String(item.id) === String(followed));
    const followLine = document.getElementById('followedShuttleSummary');
    if (followLine) {
        followLine.textContent = shuttle
            ? `Following ${shuttle.vehicle_number || shuttle.vehicleNumber || 'the shuttle'}. The other buses stay on the map.`
            : 'Tap a shuttle on the home list to follow it. Every other bus stays on the map.';
    }
}

async function loadRidesData() {
    renderMyStop();
}

window.renderMyStop = renderMyStop;
window.loadRidesData = loadRidesData;

window.openMyStop = function () {
    if (window.StudentDashboardSimple && typeof window.StudentDashboardSimple.showSection === 'function') {
        window.StudentDashboardSimple.showSection('rides');
        return;
    }
    if (typeof showRides === 'function') showRides();
    else renderMyStop();
};

window.followShuttle = function (id) {
    try { sessionStorage.setItem('ucc_follow_shuttle', String(id)); } catch (error) {}
    if (window.CampusLiveMap && window.CampusLiveMap.setFollowed) window.CampusLiveMap.setFollowed(id);
    document.querySelectorAll('#shuttleList .shuttle-item').forEach((item) => {
        const active = item.dataset.shuttleId === String(id);
        item.classList.toggle('is-followed', active);
        const badge = item.querySelector('.shuttle-status');
        if (badge) badge.textContent = active ? 'Following' : 'On road';
    });
    updateFollowedTripPanel(lastShuttles);
    renderMyStop();
};

function updateFollowedTripPanel(shuttles) {
    const id = window.CampusLiveMap && window.CampusLiveMap.getFollowed ? window.CampusLiveMap.getFollowed() : null;
    const shuttle = (shuttles || []).find((item) => String(item.id) === String(id));
    const status = document.getElementById('tripStatusValue');
    const driver = document.getElementById('tripDriverName');
    const name = document.getElementById('tripShuttleName');
    const route = document.getElementById('tripRoute');
    const eta = document.getElementById('tripETA');
    if (!shuttle) {
        if (status) status.textContent = 'Not following a shuttle';
        if (driver) driver.textContent = '--';
        if (name) name.textContent = '--';
        if (route) route.textContent = '--';
        if (eta) eta.textContent = savedStop ? savedStop.name : '--';
        return;
    }
    if (status) status.textContent = 'Following';
    if (driver) driver.textContent = shuttle.driver_name || shuttle.driverName || 'Driver';
    if (name) name.textContent = shuttle.vehicle_number || shuttle.vehicleNumber || 'Shuttle';
    if (route) route.textContent = shuttle.routeName || 'Campus Express';
    if (eta) eta.textContent = savedStop ? `Watching ${savedStop.name}` : 'Choose a stop';
}

async function saveCampusStop(name) {
    const stop = CAMPUS_STOPS.find((item) => item.name === name);
    if (!stop) return;
    const summary = document.getElementById('savedStopSummary');
    try {
        await apiRequest('/student/pickup-location', {
            method: 'POST',
            body: JSON.stringify({
                location_name: stop.name,
                latitude: stop.latitude,
                longitude: stop.longitude
            })
        });
        savedStop = { name: stop.name, latitude: stop.latitude, longitude: stop.longitude };
        seenApproaches.clear();
        const banner = document.getElementById('arrivalBanner');
        if (banner) {
            banner.hidden = true;
            delete banner.dataset.key;
        }
        renderMyStop();
    } catch (error) {
        if (summary) summary.textContent = 'That stop could not be saved. Try again.';
    }
}

async function loadSavedStop() {
    try {
        const data = await apiRequest('/student/pickup-location');
        const pref = data && data.preference;
        if (pref && pref.location_name) {
            const known = CAMPUS_STOPS.find((stop) => stop.name === pref.location_name);
            const latitude = Number(pref.latitude);
            const longitude = Number(pref.longitude);
            savedStop = {
                name: pref.location_name,
                latitude: Number.isFinite(latitude) ? latitude : known && known.latitude,
                longitude: Number.isFinite(longitude) ? longitude : known && known.longitude
            };
        }
    } catch (error) {
        console.error('Could not load saved stop', error);
    }
    renderMyStop();
}

function showArrivalBanner(shuttle, stop, minutes, key) {
    const banner = document.getElementById('arrivalBanner');
    if (!banner) return false;
    if (!banner.hidden && banner.dataset.key !== key) return false;
    if (banner.dataset.key === key && !banner.hidden) return true;
    const bus = shuttle.vehicle_number || shuttle.vehicleNumber || 'Shuttle';
    const mins = Math.max(1, Math.round(minutes));
    banner.hidden = false;
    banner.dataset.key = key;
    banner.innerHTML = `<span><strong>${ticketText(bus)}</strong> is ${mins} minutes from ${ticketText(stop.name)}.</span><button type="button">Dismiss</button>`;
    banner.querySelector('button').onclick = () => {
        banner.hidden = true;
    };
    return true;
}

function checkArrivals() {
    if (!savedStop || !window.CampusLiveMap || typeof window.CampusLiveMap.getFleet !== 'function') return;
    window.CampusLiveMap.getFleet().forEach((shuttle) => {
        const minutes = minutesToStop(shuttle, savedStop);
        if (!Number.isFinite(minutes)) return;
        const key = `${shuttle.id}:${savedStop.name}`;
        if (nextApproachAlert(seenApproaches, key, minutes) && !showArrivalBanner(shuttle, savedStop, minutes, key)) {
            seenApproaches.delete(key);
        }
    });
}

window.addEventListener('campus-shuttle-follow', (event) => {
    const id = event.detail && event.detail.id;
    if (!id) return;
    document.querySelectorAll('#shuttleList .shuttle-item').forEach((item) => {
        const active = item.dataset.shuttleId === String(id);
        item.classList.toggle('is-followed', active);
        const badge = item.querySelector('.shuttle-status');
        if (badge) badge.textContent = active ? 'Following' : 'On road';
    });
    updateFollowedTripPanel(lastShuttles);
    const followLine = document.getElementById('followedShuttleSummary');
    const shuttle = lastShuttles.find((item) => String(item.id) === String(id));
    if (followLine && shuttle) {
        followLine.textContent = `Following ${shuttle.vehicle_number || shuttle.vehicleNumber || 'the shuttle'}. The other buses stay on the map.`;
    }
});

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
    const greeting = "Hey there! 👋 I'm your UCC 🚌 shuttle buddy. What's going on today?";
    let response = '';
    
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
        response = greeting;
    }
    else if (lowerMessage.includes('cost') || lowerMessage.includes('fare') || lowerMessage.includes('price') || lowerMessage.includes('pay')) {
        response = "The fare is GH₵2. You do not book a ride in this app. Save My stop and follow a bus on the map.";
    }
    else if (lowerMessage.includes('message') || lowerMessage.includes('chat') || lowerMessage.includes('friend')) {
        response = "You can message another student after they accept your friend request. You can message a driver directly. Admins are not in chat.";
    }
    else if (lowerMessage.includes('profile') || lowerMessage.includes('photo') || lowerMessage.includes('password') || lowerMessage.includes('login') || lowerMessage.includes('code')) {
        response = "Login is your email and password. Signup and password reset use a 6-digit code from email. Your profile has your photo, details, password, and logout. There is no Google sign-in. If you have no photo, the default picture is used.";
    }
    else if (lowerMessage.includes('book') || lowerMessage.includes('request') || lowerMessage.includes('ride')) {
        response = "Students do not book rides in this app. Open My stop and choose West Gate, East Gate, Administration, Science, Library, Hospital, or Halls. Then tap a bus in the shuttle list to follow it.";
    }
    else if (lowerMessage.includes('library') || lowerMessage.includes('science') || lowerMessage.includes('hospital') || lowerMessage.includes('hall') || lowerMessage.includes('gate') || lowerMessage.includes('stop')) {
        response = "Those are My stop choices: West Gate, East Gate, Administration, Science, Library, Hospital, and Halls. Open My stop to save one. A banner appears on the screen once when a bus is about 5 minutes away. It is not a phone alert.";
    }
    else if (lowerMessage.includes('follow') || lowerMessage.includes('where') || lowerMessage.includes('map') || lowerMessage.includes('shuttle') || lowerMessage.includes('bus')) {
        response = "Open the shuttle list or the map. Live UCC-BRT buses move on the campus loop. Tap a bus to follow it. Every bus stays on the map, and the one you pick is highlighted.";
    }
    else if (lowerMessage.includes('banner') || lowerMessage.includes('minute') || lowerMessage.includes('delay') || lowerMessage.includes('late') || lowerMessage.includes('time') || lowerMessage.includes('schedule')) {
        response = "There is no timetable to book. Buses move on the campus loop. A banner appears on the screen once when a bus is about 5 minutes from your saved stop.";
    }
    else if (lowerMessage.includes('emergency')) {
        response = "Use the Emergency Alert button on the student dashboard. That sends an alert from the app.";
    }
    else if (lowerMessage.includes('driver')) {
        response = "Drivers have a live campus map and can start or stop their route. They do not accept bookings. You can message a driver directly.";
    }
    else if (lowerMessage.includes('admin')) {
        response = "Admins see users, the fleet, drivers, a live tracking map, and reports. They are not in chat, and there is no booking queue.";
    }
    else if (lowerMessage.includes('contact') || lowerMessage.includes('help') || lowerMessage.includes('support')) {
        response = "Help and support dashboards were removed. I can explain My stop, following a bus, the 5 minute banner, messages, and your profile.";
    }
    else if (lowerMessage.match(/(thank|thanks|appreciate)/)) {
        response = "You're welcome.";
    }
    else {
        response = "I only know this shuttle app. Save a stop, follow a bus on the map, and message students after they accept a friend request, or message a driver directly.";
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
    const ridesSection = document.getElementById('ridesSection');
    if (ridesSection) ridesSection.style.display = 'block';
    renderMyStop();
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
    loadSavedStop();
    renderMyStop();
    try {
        const savedFollow = sessionStorage.getItem('ucc_follow_shuttle');
        if (savedFollow && window.CampusLiveMap && window.CampusLiveMap.setFollowed) {
            window.CampusLiveMap.setFollowed(savedFollow);
        }
    } catch (error) {}
    checkArrivals();
    setInterval(checkArrivals, 2000);
    setInterval(() => {
        if (document.getElementById('shuttleList')) loadShuttleList();
    }, 10000);
    console.log('✅ Dashboard data loader initialized');
});

console.log('📊 Student dashboard data loader script loaded');
