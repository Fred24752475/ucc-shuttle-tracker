// UCC Shuttle Tracker - Main JavaScript Application
// Author: UCC Transport Department
// Version: 1.0.0

// Global variables
let selectedRole = null;
let passwordVisible = false;
let studentLocation = null;
let studentLocationWatch = null;
let shuttleMap = null;
let shuttleMarkers = [];
let studentMarker = null;
let currentDriverStatus = 'active';

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('UCC Shuttle Tracker initialized');
});

// Role selection functions
function selectRole(role) {
    selectedRole = role;
    
    // Remove selected class from all cards
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    document.getElementById(role + '-card').classList.add('selected');
    
    // Add haptic feedback animation
    const card = document.getElementById(role + '-card');
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
        card.style.transform = '';
    }, 100);
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password');
    
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    toggleBtn.textContent = passwordVisible ? '👁️' : '👁️‍♂️';
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('show');
    
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 5000);
}

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!selectedRole) {
        showError('Please select your role');
        return;
    }
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    // Hide login and show appropriate dashboard
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById(selectedRole + 'Dashboard').classList.add('active');
    document.getElementById(selectedRole + 'Dashboard').classList.add(selectedRole);
    
    // Initialize student dashboard features
    if (selectedRole === 'student') {
        initializeStudentDashboard();
    } else if (selectedRole === 'driver') {
        initializeDriverDashboard();
    } else if (selectedRole === 'admin') {
        initializeAdminDashboard();
    }
}

function logout() {
    // Hide all dashboards and show login
    document.querySelectorAll('.dashboard').forEach(dashboard => {
        dashboard.classList.remove('active');
    });
    document.getElementById('loginContainer').style.display = 'block';
    
    // Reset form
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    selectedRole = null;
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Clear location tracking
    if (studentLocationWatch) {
        studentLocationWatch = null;
    }
}

// Student Dashboard Functions
function initializeStudentDashboard() {
    if (typeof L !== 'undefined') {
        initializeMap();
    }
    detectStudentLocation();
    startShuttleTracking();
    updateNearestShuttleInfo();
}

function initializeMap() {
    // Initialize OpenStreetMap
    shuttleMap = L.map('map').setView([5.1044, -1.1947], 15); // UCC Campus coordinates
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(shuttleMap);
    
    // Add map legend
    const legend = L.control({position: 'topright'});
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div');
        div.className = 'map-legend';
        div.innerHTML = `
            <div style="font-weight:600;">🚌 Shuttles</div>
            <div>🟢 Active</div>
            <div>🟡 Delayed</div>
            <div>🔴 Offline</div>
            <div style="margin-top:8px;">👤 Your Location</div>
        `;
        return div;
    };
    legend.addTo(shuttleMap);
    
    // Add scale and zoom controls
    L.control.scale().addTo(shuttleMap);
}

function detectStudentLocation() {
    if (navigator.geolocation) {
        studentLocationWatch = navigator.geolocation.watchPosition(
            (position) => {
                studentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                if (studentMarker && shuttleMap) {
                    updateStudentMarker();
                    updateStudentStatus('📍 Location found');
                    calculateDistancesToShuttles();
                }
            },
            (error) => {
                console.error('Location error:', error);
                updateStudentStatus('📍 Location unavailable');
                // Use UCC Campus as default location
                studentLocation = {lat: 5.1044, lng: -1.1947};
                if (studentMarker && shuttleMap) {
                    updateStudentMarker();
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        updateStudentStatus('📍 Geolocation not supported');
        studentLocation = {lat: 5.1044, lng: -1.1947}; // UCC Campus default
        if (studentMarker && shuttleMap) {
            updateStudentMarker();
        }
    }
}

function updateStudentMarker() {
    if (studentMarker) {
        shuttleMap.removeLayer(studentMarker);
    }
    
    const studentIcon = L.divIcon({
        html: '<div style="background: #1565c0; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">👤</div>',
        className: 'student-marker',
        iconSize: [20, 20]
    });
    
    studentMarker = L.marker([studentLocation.lat, studentLocation.lng], {
        icon: studentIcon
    }).addTo(shuttleMap);
    
    shuttleMap.setView([studentLocation.lat, studentLocation.lng], 16);
}

function updateStudentStatus(status) {
    const statusElement = document.getElementById('studentStatus');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

function startShuttleTracking() {
    // Simulated shuttle data - in real app, this would come from backend
    const shuttles = [
        {
            id: 'UCC-001',
            name: 'Library Shuttle',
            lat: 5.1054,
            lng: -1.1957,
            status: 'active',
            speed: 25,
            capacity: 40,
            passengers: 28,
            route: 'Main Campus → Library → Science Block',
            eta: 3
        },
        {
            id: 'UCC-002',
            name: 'Hostel Shuttle',
            lat: 5.1024,
            lng: -1.1927,
            status: 'delayed',
            speed: 20,
            capacity: 40,
            passengers: 35,
            route: 'Main Campus → Hostel A → Cafeteria',
            eta: 8
        },
        {
            id: 'UCC-003',
            name: 'Science Shuttle',
            lat: 5.1084,
            lng: -1.1987,
            status: 'active',
            speed: 30,
            capacity: 40,
            passengers: 15,
            route: 'Science Block → Library → Main Campus',
            eta: 12
        },
        {
            id: 'UCC-004',
            name: 'Sports Complex Shuttle',
            lat: 5.0994,
            lng: -1.1897,
            status: 'offline',
            speed: 0,
            capacity: 40,
            passengers: 0,
            route: 'Sports Complex → Main Campus',
            eta: null
        }
    ];
    
    // Add shuttle markers to map
    if (typeof L !== 'undefined' && shuttleMap) {
        shuttles.forEach(shuttle => {
            const statusColor = {
                'active': '#28a745',
                'delayed': '#ffc107',
                'offline': '#dc3545'
            }[shuttle.status];
            
            const shuttleIcon = L.divIcon({
                html: `<div style="background: ${statusColor}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold;">🚌</div>`,
                className: 'shuttle-marker',
                iconSize: [30, 30]
            });
            
            const marker = L.marker([shuttle.lat, shuttle.lng], {
                icon: shuttleIcon,
                title: shuttle.name
            }).addTo(shuttleMap);
            
            // Add popup info
            const popupContent = `
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 10px 0; color: #1565c0;">${shuttle.name}</h4>
                    <p style="margin: 5px 0; font-weight: 600;">Route: ${shuttle.route}</p>
                    <p style="margin: 5px 0;">Status: <span style="color: ${statusColor};">${shuttle.status.toUpperCase()}</span></p>
                    <p style="margin: 5px 0;">Speed: ${shuttle.speed} km/h</p>
                    <p style="margin: 5px 0;">Capacity: ${shuttle.passengers}/${shuttle.capacity}</p>
                    ${shuttle.eta ? `<p style="margin: 5px 0; font-weight: bold; color: #1565c0;">ETA: ${shuttle.eta} min</p>` : ''}
                </div>
            `;
            
            marker.bindPopup(popupContent);
            shuttleMarkers.push(marker);
            
            // Animate shuttle movement
            animateShuttle(marker, shuttle);
        });
    }
}

function animateShuttle(marker, shuttle) {
    // Simulate shuttle movement
    setInterval(() => {
        if ((shuttle.status === 'active' || shuttle.status === 'delayed') && shuttleMap) {
            const newLat = shuttle.lat + (Math.random() - 0.5) * 0.001;
            const newLng = shuttle.lng + (Math.random() - 0.5) * 0.001;
            
            marker.setLatLng([newLat, newLng]);
            shuttle.lat = newLat;
            shuttle.lng = newLng;
            
            // Update ETA periodically
            if (Math.random() < 0.1) {
                shuttle.eta = Math.max(1, shuttle.eta + (Math.random() - 0.5) * 2);
                updateNearestShuttleInfo();
            }
        }
    }, 3000);
}

function calculateDistancesToShuttles() {
    if (!studentLocation || shuttleMarkers.length === 0) return;
    
    let nearestShuttle = null;
    let minDistance = Infinity;
    
    // This would be calculated with actual shuttle positions
    const mockShuttles = [
        {name: 'Library Shuttle', distance: 0.8, eta: 3, status: 'active'},
        {name: 'Hostel Shuttle', distance: 1.2, eta: 8, status: 'delayed'},
        {name: 'Science Shuttle', distance: 1.5, eta: 12, status: 'active'}
    ];
    
    mockShuttles.forEach(shuttle => {
        if (shuttle.distance < minDistance) {
            minDistance = shuttle.distance;
            nearestShuttle = shuttle;
        }
    });
    
    displayNearestShuttle(nearestShuttle);
}

function displayNearestShuttle(shuttle) {
    const nearestShuttleDiv = document.getElementById('nearestShuttle');
    
    if (!nearestShuttleDiv) return;
    
    const statusClass = shuttle.status === 'active' ? 'status-active' : 
                          shuttle.status === 'delayed' ? 'status-delayed' : 'status-offline';
    
    nearestShuttleDiv.innerHTML = `
        <div class="shuttle-status">
            <div class="status-indicator ${statusClass}"></div>
            <span>${shuttle.name}</span>
        </div>
        <div class="eta-display">
            🕐 Arrives in approximately <strong>${shuttle.eta} minutes</strong>
        </div>
        <p>📍 Distance: ${shuttle.distance} km away</p>
        <p>🛣️ Route: Main Campus → Your Location</p>
        <p>⚡ Status: <span style="color: ${shuttle.status === 'active' ? '#28a745' : shuttle.status === 'delayed' ? '#ffc107' : '#dc3545'}">${shuttle.status.toUpperCase()}</span></p>
        <button onclick="trackThisShuttle('${shuttle.name}')" style="margin-top: 10px; padding: 8px 16px; background: #1565c0; color: white; border: none; border-radius: 6px; cursor: pointer;">Track This Shuttle</button>
    `;
}

function updateNearestShuttleInfo() {
    calculateDistancesToShuttles();
}

// Student Action Functions
function refreshLocation() {
    updateStudentStatus('🔄 Refreshing location...');
    detectStudentLocation();
    setTimeout(() => {
        updateStudentStatus('📍 Location updated');
    }, 2000);
}

function showAllShuttles() {
    alert('🚌 All UCC Shuttles:\\n\\n• Library Shuttle - Active (3 min ETA)\\n• Hostel Shuttle - Delayed (8 min ETA)\\n• Science Shuttle - Active (12 min ETA)\\n• Sports Complex Shuttle - Offline\\n\\nCheck the map for real-time locations!');
}

function trackThisShuttle(shuttleName) {
    alert(`Now tracking: ${shuttleName}\\n\\n📍 You will receive notifications when:\\n• Shuttle is 5 minutes away\\n• Shuttle arrives at your stop\\n• Shuttle status changes`);
}

function callEmergency() {
    if (confirm('🚨 EMERGENCY CALL\\n\\nDo you want to call campus security?\\n\\nCampus Security: +233 123 4567')) {
        alert('Calling Campus Security...\\n\\n📞 +233 123 4567\\n\\nYour location has been shared with security.');
    }
}

function reportIssue() {
    const issue = prompt('📋 REPORT SHUTTLE ISSUE\\n\\nPlease describe the problem (e.g., shuttle breakdown, driver behavior, route issues):');
    if (issue) {
        alert(`✅ Issue Reported Successfully!\\n\\nThank you for reporting:\\n"${issue}"\\n\\n📧 Campus Transport will investigate immediately.\\n\\nReport ID: #${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
    }
}

// AI Assistant Functions
const aiResponses = [
    "The nearest shuttle arrives in about 3-5 minutes. Check the map for real-time location!",
    "Based on current traffic, expect a 5-7 minute delay for the hostel shuttle.",
    "All shuttles are operational today. Two are experiencing minor delays.",
    "I recommend taking the Library shuttle - it's the fastest to your location right now.",
    "Campus routes are running normally. Avoid peak hours (12-2pm) for quicker service."
];

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    const chatMessages = document.getElementById('chatMessages');
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'user-message';
    userMsg.innerHTML = `<strong>You:</strong> ${message}`;
    chatMessages.appendChild(userMsg);
    
    // Clear input
    chatInput.value = '';
    
    // Simulate AI thinking
    const aiThinking = document.createElement('div');
    aiThinking.className = 'ai-message';
    aiThinking.innerHTML = '<strong>AI:</strong> 🤔 Thinking...';
    chatMessages.appendChild(aiThinking);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Generate AI response
    setTimeout(() => {
        chatMessages.removeChild(aiThinking);
        
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message';
        
        let response = '';
        const lowerMsg = message.toLowerCase();
        
        if (lowerMsg.includes('when') || lowerMsg.includes('eta') || lowerMsg.includes('arrive')) {
            response = aiResponses[Math.floor(Math.random() * 2)];
        } else if (lowerMsg.includes('delay') || lowerMsg.includes('late')) {
            response = aiResponses[1];
        } else if (lowerMsg.includes('route') || lowerMsg.includes('direction')) {
            response = aiResponses[3];
        } else if (lowerMsg.includes('all') || lowerMsg.includes('status')) {
            response = aiResponses[2];
        } else if (lowerMsg.includes('busy') || lowerMsg.includes('avoid')) {
            response = aiResponses[4];
        } else if (lowerMsg.includes('help')) {
            response = "I can help you with shuttle times, routes, delays, and campus navigation! Ask me about arrival times, route information, or transportation tips.";
        } else {
            response = aiResponses[Math.floor(Math.random() * aiResponses.length)];
        }
        
        aiMsg.innerHTML = `<strong>AI:</strong> ${response}`;
        chatMessages.appendChild(aiMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1500);
}

// Driver Dashboard Functions
function initializeDriverDashboard() {
    updatePassengerCount(currentDriverStatus);
}

function updateDriverStatus(status) {
    currentDriverStatus = status;
    const statusBtn = document.getElementById('statusBtn');
    
    if (!statusBtn) return;
    
    const statusConfig = {
        'active': { emoji: '🟢', text: 'Active', bg: '#28a745' },
        'delayed': { emoji: '🟡', text: 'Delayed', bg: '#ffc107' },
        'break': { emoji: '🟦', text: 'Break', bg: '#17a2b8' },
        'offline': { emoji: '🔴', text: 'Offline', bg: '#dc3545' }
    };
    
    const config = statusConfig[status];
    statusBtn.textContent = `${config.emoji} ${config.text}`;
    statusBtn.style.background = config.bg;
    
    // Update passenger count based on status
    updatePassengerCount(status);
}

function updatePassengerCount(status) {
    const stats = document.querySelectorAll('.stat-value');
    if (stats.length > 0) {
        const passengerCount = status === 'offline' ? 0 : Math.floor(Math.random() * 25) + 15;
        stats[0].textContent = `${passengerCount}/40`;
        
        const percentage = Math.round((passengerCount / 40) * 100);
        if (stats[0].nextElementSibling) {
            stats[0].nextElementSibling.textContent = `${percentage}% Capacity`;
        }
    }
}

// Admin Dashboard Functions
function adminAction(action) {
    const messages = {
        'addShuttle': '🚌 Shuttle addition initiated. Registration required.',
        'editRoutes': '📝️ Route editor opening. Current routes: Main Campus, Library, Science, Hostel.',
        'assignDrivers': '👤️ Driver assignment panel. 6 drivers on duty today.',
        'maintenance': '🔧 Maintenance scheduled. 2 shuttles due for service.',
        'addDriver': '👤️ Driver registration opened. License verification required.',
        'scheduleShifts': '📅 Shift scheduling loaded. Weekly patterns available.',
        'performance': '⭐ Performance metrics loading. Average rating: 4.6/5.0.',
        'incidents': '⚠️ 3 incidents this week. 2 resolved.',
        'reports': '📊 Generating daily report... Route efficiency: 87%',
        'usage': '🕐️ Usage analytics: 247 active users, 6.2 min avg wait.',
        'revenue': '💰 Today\'s revenue: ₵12,450. 12% above target.',
        'searchLogs': '🔍 Log search ready. Filter by date, driver, or shuttle.'
    };
    
    alert(messages[action]);
}

// Keyboard support
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});