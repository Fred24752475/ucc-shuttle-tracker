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
let shuttles = []; // Global shuttle data

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('UCC Shuttle Tracker initialized');
});

// Role selection functions
function selectRole(role) {
    console.log('🎯 Role card clicked:', role);
    selectedRole = role;
    
    // Reset all cards styling
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
        card.style.transform = 'scale(1)';
        card.style.borderColor = '#ddd';
        card.style.boxShadow = 'none';
        card.style.background = 'rgba(255, 255, 255, 0.8)';
    });
    
    // Add selected styling to clicked card
    const selectedCard = document.getElementById(role + '-card');
    if (selectedCard) {
        selectedCard.classList.add('selected');
        
        // Visual feedback with animation
        selectedCard.style.transform = 'scale(0.95)';
        selectedCard.style.background = '#1565c0';
        selectedCard.style.borderColor = '#1565c0';
        selectedCard.style.color = 'white';
        selectedCard.style.boxShadow = '0 8px 25px rgba(21, 101, 192, 0.3)';
        
        // Success feedback
        setTimeout(() => {
            selectedCard.style.transform = 'scale(1)';
            selectedCard.style.boxShadow = '0 4px 15px rgba(21, 101, 192, 0.4)';
        }, 150);
        
        // Add selection indicator
        addRoleSelectionIndicator(selectedCard, role);
    }
}

function addRoleSelectionIndicator(card, role) {
    // Remove existing indicators
    card.querySelectorAll('.role-selection-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Add new selection indicator
    const indicator = document.createElement('div');
    indicator.className = 'role-selection-indicator';
    indicator.innerHTML = '✓';
    indicator.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: #28a745;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        z-index: 10;
        animation: checkmarkFadeIn 0.3s ease;
    `;
    card.appendChild(indicator);
}
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password');
    
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    toggleBtn.textContent = passwordVisible ? '👁️' : '👁️';
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('show');
    
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 5000);
}

async function login() {
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

try {
        // Show loading state during authentication
        showLoginLoading();
        
        // Authenticate with database
        const result = await uccDB.login(email, password, selectedRole);
        
        // Hide loading state
        hideLoginLoading();
        
        if (result.success) {
            // Show success animation
            showLoginSuccess();
            
            // Add a small delay before showing dashboard for better UX
            setTimeout(() => {
                // Hide all dashboards first
                document.querySelectorAll('.dashboard').forEach(dashboard => {
                    dashboard.classList.remove('active');
                });
                
                // Hide login and show appropriate dashboard
                document.getElementById('loginContainer').style.display = 'none';
                document.body.classList.remove('login-screen');
                document.body.classList.add('dashboard-screen');
                
                const dashboard = document.getElementById(selectedRole + 'Dashboard');
                if (dashboard) {
                    dashboard.classList.add('active');
                    dashboard.classList.add(selectedRole); // Add role class for styling
                    console.log(`Showing ${selectedRole} dashboard`);
                } else {
                    console.error(`Dashboard not found: ${selectedRole}Dashboard`);
                    showError('Dashboard not available. Please try again.');
                    return;
                }
                
                // Start real-time updates
                uccDB.startRealTimeUpdates();
                
                // Initialize dashboard features
                if (selectedRole === 'student') {
                    initializeStudentDashboard();
                } else if (selectedRole === 'driver') {
                    initializeDriverDashboard();
                } else if (selectedRole === 'admin') {
                    initializeAdminDashboard();
                }
                
                // Show welcome message
                showWelcomeMessage(selectedRole);
                
                // Helper Functions
                function showLoginLoading() {
                    const loginBtn = document.getElementById('login-btn-text');
                    if (loginBtn) {
                        loginBtn.textContent = 'Authenticating...';
                        loginBtn.disabled = true;
                    }
                }
                
                function hideLoginLoading() {
                    const loginBtn = document.getElementById('login-btn-text');
                    if (loginBtn) {
                        loginBtn.textContent = '🚀 Start Demo';
                        loginBtn.disabled = false;
                    }
                }
                
                function showLoginSuccess() {
                    const loginBtn = document.getElementById('login-btn-text');
                    if (loginBtn) {
                        loginBtn.textContent = '✅ Success!';
                        loginBtn.disabled = false;
                    }
                }
                
                function showLoginError(message) {
                    const errorMessage = document.getElementById('errorMessage');
                    if (errorMessage) {
                        errorMessage.textContent = message;
                        errorMessage.classList.add('show');
                    }
                }
                
                function showError(message) {
                    const errorMessage = document.getElementById('errorMessage');
                    if (errorMessage) {
                        errorMessage.textContent = message;
                        errorMessage.classList.add('show');
                    }
                }
                
                function showWelcomeMessage(role) {
                    const loginTitle = document.getElementById('main-title');
                    const subtitle = document.getElementById('subtitle');
                    
                    if (loginTitle && subtitle) {
                        const welcomeMessages = {
                            student: {
                                title: 'Welcome to UCC Shuttle Tracker!',
                                subtitle: 'Track shuttles in real-time'
                            },
                            driver: {
                                title: 'Welcome to Driver Dashboard!',
                                subtitle: 'Manage your routes and schedules'
                            },
                            admin: {
                                title: 'Welcome to Admin Dashboard!',
                                subtitle: 'Manage the entire shuttle system'
                            }
                        };
                        
                        loginTitle.textContent = welcomeMessages[role].title;
                        subtitle.textContent = welcomeMessages[role].subtitle;
                        
                        // Add welcome animation
                        loginTitle.style.animation = 'fadeInDown 0.5s ease-out';
                        subtitle.style.animation = 'fadeInDown 0.8s ease-out';
                    }
                }
            }, 100);
        } else {
            // Show error with animation
            showLoginError(result.message || 'Login failed');
            
            // Shake animation for error effect
            const loginContainer = document.getElementById('loginContainer');
            if (loginContainer) {
                loginContainer.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    loginContainer.style.animation = '';
                }, 500);
            }
        }
        } else {
            showError(result.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed: ' + error.message);
    }
}

function logout() {
    console.log('🚪 Logging out...');
    
    // Logout from database
    uccDB.logout();
    
    // Clear all personal dashboard data
    currentDriverPersonalData = null;
    currentStudentPersonalData = null;
    driverShifts = [];
    studentTrips = [];
    studentNotifications = [];
    
    // Hide all dashboards
    hideAllDashboards();
    
    // Show login screen
    document.getElementById('loginContainer').style.display = 'block';
    document.body.classList.add('login-screen');
    document.body.classList.remove('dashboard-screen');
    
    // Reset selected role
    selectedRole = null;
    
    // Clear all role cards
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
        card.style.transform = 'scale(1)';
        card.style.borderColor = '#ddd';
        card.style.boxShadow = 'none';
        card.style.background = 'rgba(255, 255, 255, 0.8)';
        card.style.color = '#333';
    });
    
    showNotification('Logged out successfully', 'success');
}
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
    console.log('🎓 Initializing Student Dashboard...');
    updatePassengerCount(currentDriverStatus);
    
    // Show the new student personal dashboard
    showStudentPersonalDashboard();
}

    // Wait for dashboard to be visible before initializing map
    setTimeout(() => {
        console.log('Dashboard is active, initializing map...');

        // Check if Leaflet is loaded
        if (typeof L !== 'undefined') {
            console.log('Leaflet is loaded, initializing map...');
            initializeMap();
        } else {
            console.error('Leaflet library not loaded, retrying...');
            // Retry after another delay
            setTimeout(() => {
                if (typeof L !== 'undefined') {
                    console.log('Leaflet loaded on retry, initializing map...');
                    initializeMap();
                } else {
                    console.error('Leaflet still not loaded');
                    // Show error in map container
                    const mapContainer = document.getElementById('map');
                    if (mapContainer) {
                        mapContainer.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
                                <div style="text-align: center; color: #6c757d;">
                                    <div style="font-size: 48px; margin-bottom: 10px;">🗺️</div>
                                    <div style="font-weight: 600;">Map Library Not Loaded</div>
                                    <div style="font-size: 14px;">Please refresh the page or check internet connection</div>
                                </div>
                            </div>
                        `;
                    }
                }
            }, 3000);
        }

        // Initialize other features
        detectStudentLocation();
        startShuttleTracking();
        updateNearestShuttleInfo();
    }, 300); // Wait for dashboard to render
}

function initializeMap() {
    const mapContainer = document.getElementById('map');

    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    console.log('Initializing map in container:', mapContainer);

    // Clear any existing content
    mapContainer.innerHTML = '';

    // Clear any existing map instance
    if (shuttleMap) {
        shuttleMap.remove();
        shuttleMap = null;
    }

    try {
        // Initialize OpenStreetMap
        shuttleMap = L.map('map').setView([5.1044, -1.1947], 15); // UCC Campus coordinates

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 13
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

        console.log('Map initialized successfully with Leaflet version:', L.version);

        // Refresh the map after a short delay to ensure proper rendering
        setTimeout(() => {
            if (shuttleMap) {
                shuttleMap.invalidateSize();
                console.log('Map size invalidated');
            }
        }, 100);

    } catch (error) {
        console.error('Failed to initialize map:', error);
        // Fallback: show error message in map container
        mapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
                <div style="text-align: center; color: #6c757d;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🗺️</div>
                    <div style="font-weight: 600;">Map Loading Error</div>
                    <div style="font-size: 14px;">Please check your internet connection</div>
                    <div style="font-size: 12px; margin-top: 10px; color: #dc3545;">Error: ${error.message}</div>
                </div>
            </div>
        `;
    }
}

function detectStudentLocation() {
    console.log('Detecting student location...');

    // Check if geolocation is supported
    if (!navigator.geolocation) {
        updateStudentStatus('📍 Geolocation not supported');
        // Use UCC Campus as default location
        studentLocation = {lat: 5.1044, lng: -1.1947};
        updateStudentMarker();
        return;
    }

    // Always try to get location, permissions API is just for better UX
    requestLocation();
}

function requestLocation() {
    updateStudentStatus('📍 Getting your location...');

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
    };

    studentLocationWatch = navigator.geolocation.watchPosition(
        (position) => {
            console.log('Location obtained:', position.coords);
            studentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };

            updateStudentMarker();
            updateStudentStatus(`📍 Location found (${Math.round(position.coords.accuracy)}m accuracy)`);
            calculateDistancesToShuttles();
        },
        (error) => {
            console.error('Location error:', error);
            handleLocationError(error);
        },
        options
    );
}

function handleLocationError(error) {
    let message = '📍 Location unavailable';

    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = '📍 Location access denied. Please allow location access in your browser settings.';
            break;
        case error.POSITION_UNAVAILABLE:
            message = '📍 Location unavailable. Please check your GPS settings.';
            break;
        case error.TIMEOUT:
            message = '📍 Location request timed out. Please try again.';
            break;
        default:
            message = '📍 Location error occurred.';
            break;
    }

    updateStudentStatus(message);

    // Use UCC Campus as fallback
    studentLocation = {lat: 5.1044, lng: -1.1947};
    updateStudentMarker();

    // Show helpful message
    setTimeout(() => {
        if (error.code === error.PERMISSION_DENIED) {
            alert('To see your location on the map, please:\n\n1. Click the location icon in your browser address bar\n2. Allow location access for this site\n3. Refresh the page\n\nYou can still use all other features!');
        }
    }, 1000);
}

function handleLocationDenied() {
    updateStudentStatus('📍 Location access denied');

    // Use UCC Campus as fallback
    studentLocation = {lat: 5.1044, lng: -1.1947};
    updateStudentMarker();

    alert('Location access is required to show your position on the map.\n\nPlease:\n1. Click the 🔒 lock icon in your browser address bar\n2. Set Location to "Allow"\n3. Refresh this page\n\nYou can still track shuttles and use other features!');
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

async function startShuttleTracking() {
    try {
        // Get real shuttle data from backend
        const result = await uccDB.getShuttles();
        
        if (result.success) {
            shuttles = result.shuttles.map(shuttle => ({
                ...shuttle,
                lat: 5.1054 + (Math.random() - 0.5) * 0.01, // Default UCC location
                lng: -1.1957 + (Math.random() - 0.5) * 0.01,
                speed: Math.floor(Math.random() * 30) + 10,
                passengers: Math.floor(Math.random() * 30) + 10,
                eta: Math.floor(Math.random() * 15) + 1
            }));
        } else {
            // Fallback to simulated data
            shuttles = [
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
                }
            ];
        }
        
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
                        <p style="margin: 5px 0;">Status: <span style="color: ${statusColor};">${shuttle.status.toUpperCase()}</span></p>
                        <p style="margin: 5px 0;">Speed: ${shuttle.speed} km/h</p>
                        <p style="margin: 5px 0;">Capacity: ${shuttle.current_passengers || 0}/${shuttle.capacity}</p>
                        ${shuttle.eta ? `<p style="margin: 5px 0; font-weight: bold; color: #1565c0;">ETA: ${shuttle.eta} min</p>` : ''}
                    </div>
                `;
                
                marker.bindPopup(popupContent);
                shuttleMarkers.push(marker);
                
                // Store shuttleId reference for database updates
                marker.shuttleId = shuttle.id;
                
                // Animate shuttle movement
                animateShuttle(marker, shuttle);
            });
        }
    } catch (error) {
        console.error('Error loading shuttle data:', error);
        showError('Failed to load shuttle data');
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

let trackedShuttle = null;
let trackingInterval = null;

function trackThisShuttle(shuttleName) {
    // Find the shuttle data
    const shuttle = shuttles.find(s => s.name === shuttleName);
    if (!shuttle) {
        alert('Shuttle not found!');
        return;
    }

    trackedShuttle = shuttle;

    // Stop any existing tracking
    if (trackingInterval) {
        clearInterval(trackingInterval);
    }

    // Start real-time tracking
    alert(`🎯 Now tracking: ${shuttleName}\\n\\n📍 Real-time updates will show in the shuttle info panel.\\n\\n🔔 You'll get notifications when the shuttle is 2 minutes away!`);

    // Update the shuttle info panel to show tracking status
    updateTrackingDisplay(shuttle);

    // Start live updates every 5 seconds
    trackingInterval = setInterval(() => {
        updateTrackedShuttlePosition(shuttle);

        // Check for arrival notifications
        if (shuttle.eta <= 2 && shuttle.eta > 0) {
            sendShuttleArrivalNotification(shuttle.id, shuttle.name, shuttle.eta, 'Your Location');
        }
    }, 5000);

    // Center map on the tracked shuttle
    if (shuttleMap) {
        shuttleMap.setView([shuttle.lat, shuttle.lng], 17);
    }
}

function updateTrackingDisplay(shuttle) {
    const nearestShuttleDiv = document.getElementById('nearestShuttle');
    if (!nearestShuttleDiv) return;

    const statusClass = shuttle.status === 'active' ? 'status-active' :
                          shuttle.status === 'delayed' ? 'status-delayed' : 'status-offline';

    nearestShuttleDiv.innerHTML = `
        <div style="border: 2px solid #1565c0; border-radius: 8px; padding: 10px; margin-bottom: 10px; background: rgba(21, 101, 192, 0.1);">
            <div style="font-weight: bold; color: #1565c0; margin-bottom: 8px;">🎯 TRACKING: ${shuttle.name}</div>
            <div class="shuttle-status">
                <div class="status-indicator ${statusClass}"></div>
                <span>${shuttle.name}</span>
            </div>
            <div class="eta-display">
                🕐 <strong>${shuttle.eta} minutes</strong> remaining
            </div>
            <p>📍 Distance: ${shuttle.distance} km away</p>
            <p>🛣️ Route: ${shuttle.route}</p>
            <p>⚡ Status: <span style="color: ${shuttle.status === 'active' ? '#28a745' : shuttle.status === 'delayed' ? '#ffc107' : '#dc3545'}">${shuttle.status.toUpperCase()}</span></p>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button onclick="stopTracking()" style="flex: 1; padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Stop Tracking</button>
                <button onclick="centerOnShuttle()" style="flex: 1; padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Center Map</button>
            </div>
        </div>
        <div style="background: #f8f9fa; padding: 8px; border-radius: 6px; font-size: 12px;">
            🔄 Live updates every 5 seconds
        </div>
    `;
}

function updateTrackedShuttlePosition(shuttle) {
    if (!trackedShuttle || trackedShuttle.name !== shuttle.name) return;

    // Simulate shuttle movement towards student
    const directionLat = studentLocation ? (studentLocation.lat - shuttle.lat) * 0.1 : (Math.random() - 0.5) * 0.001;
    const directionLng = studentLocation ? (studentLocation.lng - shuttle.lng) * 0.1 : (Math.random() - 0.5) * 0.001;

    shuttle.lat += directionLat;
    shuttle.lng += directionLng;

    // Decrease ETA
    if (shuttle.eta > 0) {
        shuttle.eta = Math.max(0, shuttle.eta - 0.2);
    }

    // Update distance
    if (studentLocation) {
        const distance = Math.sqrt(
            Math.pow(studentLocation.lat - shuttle.lat, 2) +
            Math.pow(studentLocation.lng - shuttle.lng, 2)
        ) * 111; // Rough km conversion
        shuttle.distance = distance.toFixed(1);
    }

    // Update map marker position
    const marker = shuttleMarkers.find(m => {
        const popup = m.getPopup();
        return popup && popup.getContent().includes(shuttle.name);
    });

    if (marker && shuttleMap) {
        marker.setLatLng([shuttle.lat, shuttle.lng]);
    }

    // Update display
    updateTrackingDisplay(shuttle);

    // Auto-stop when shuttle arrives
    if (shuttle.eta <= 0) {
        stopTracking();
        alert(`🎉 ${shuttle.name} has arrived at your location!\\n\\nSafe travels!`);
    }
}

function stopTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    trackedShuttle = null;

    // Revert to normal shuttle display
    updateNearestShuttleInfo();

    alert('🛑 Shuttle tracking stopped.');
}

function centerOnShuttle() {
    if (trackedShuttle && shuttleMap) {
        shuttleMap.setView([trackedShuttle.lat, trackedShuttle.lng], 17);
    }
}

function callEmergency() {
    if (confirm('🚨 EMERGENCY CALL\\n\\nDo you want to call campus security?\\n\\nCampus Security: +233 123 4567')) {
        alert('Calling Campus Security...\\n\\n📞 +233 123 4567\\n\\nYour location has been shared with security.');
    }
}

async function reportIssue() {
    const issue = prompt('📋 REPORT SHUTTLE ISSUE\\n\\nPlease describe the problem (e.g., shuttle breakdown, driver behavior, route issues):');
    if (issue) {
        try {
            const success = await uccDB.reportIssue(issue);
            if (success) {
                alert(`✅ Issue Reported Successfully!\\n\\nThank you for reporting:\\n"${issue}"\\n\\n📧 Campus Transport will investigate immediately.`);
            } else {
                alert('❌ Failed to report issue. Please try again.');
            }
        } catch (error) {
            console.error('Error reporting issue:', error);
            alert(`✅ Issue Reported!\\n\\nThank you for reporting:\\n"${issue}"\\n\\n📧 Campus Transport will investigate immediately.`);
        }
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
    console.log('👤 Initializing Driver Dashboard...');
    updatePassengerCount(currentDriverStatus);
    
    // Show the new driver personal dashboard
    showDriverPersonalDashboard();
}

async function updateDriverStatus(status) {
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

    // Update status in database
    try {
        // Get driver's shuttle (simplified - in real app would get from user data)
        const shuttleId = 'UCC-001'; // Default shuttle
        await uccDB.updateTripStatus(shuttleId, status);
    } catch (error) {
        console.error('Error updating status:', error);
    }

    // Update passenger count based on status
    updatePassengerCount(status);
}

// Admin Dashboard Functions
function initializeAdminDashboard() {
    // Initialize admin dashboard features
    console.log('Admin dashboard initialized');
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

// Language Support
function changeLanguage(lang) {
    const translations = {
        en: {
            title: 'UCC Shuttle Tracker',
            track: 'Track Shuttle',
            emergency: 'Emergency',
            eta: 'ETA',
            status: 'Status'
        },
        tw: {
            title: 'UCC Karata Tracker',
            track: 'Hwe Karata',
            emergency: 'Nsɛmpa',
            eta: 'Berɛ',
            status: 'Tebea'
        },
        fr: {
            title: 'Suiveur Navette UCC',
            track: 'Suivre Navette',
            emergency: 'Urgence',
            eta: 'TAE',
            status: 'Statut'
        }
    };

    const t = translations[lang];
    if (t) {
        document.querySelector('h1').textContent = t.title;
        localStorage.setItem('language', lang);
    }
}

// Enhanced Features
let isDarkMode = false;
let isListening = false;
let recognition = null;
let deferredPrompt = null;

// Theme Management
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');

    const themeIcon = document.querySelector('.theme-icon');
    const themeText = document.getElementById('theme-text');

    if (isDarkMode) {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Light';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Dark';
        localStorage.setItem('theme', 'light');
    }
}

// Load saved theme preference
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.body.classList.add('dark-mode');
        isDarkMode = true;
        const themeIcon = document.querySelector('.theme-icon');
        const themeText = document.getElementById('theme-text');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light';
    }
}

// Voice Commands
function initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = function(event) {
            const command = event.results[0][0].transcript.toLowerCase();
            console.log('Voice command:', command);
            processVoiceCommand(command);
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            stopListening();
            alert('Voice recognition error: ' + event.error + '. Please try again.');
        };

        recognition.onend = function() {
            stopListening();
        };
    } else {
        console.log('Speech recognition not supported');
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
    }
}

function toggleVoiceCommand() {
    if (!recognition) {
        initVoiceRecognition();
    }

    const voiceBtn = document.getElementById('voiceBtn');

    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    if (recognition) {
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '🔴';
        }
        isListening = true;
        recognition.start();
    }
}

function stopListening() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.classList.remove('listening');
        voiceBtn.innerHTML = '🎤';
    }
    isListening = false;
    if (recognition) {
        recognition.stop();
    }
}

function processVoiceCommand(command) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'user-message';
    userMsg.innerHTML = `<strong>Voice:</strong> "${command}"`;
    chatMessages.appendChild(userMsg);

    let response = '';

    if (command.includes('track') || command.includes('where')) {
        response = '🚌 Tracking nearest shuttle... Library shuttle arrives in 3 minutes!';
        sendShuttleArrivalNotification('UCC-001', 'Library Shuttle', 3, 'Main Gate');
    } else if (command.includes('emergency') || command.includes('help')) {
        response = '🚨 Emergency services notified. Your location has been shared.';
        callEmergency();
    } else if (command.includes('dark') || command.includes('light')) {
        toggleTheme();
        response = `✨ Theme changed to ${isDarkMode ? 'dark' : 'light'} mode.`;
    } else if (command.includes('status') || command.includes('shuttles')) {
        response = '📊 Current status: 3 shuttles active, 1 delayed, 1 offline.';
    } else {
        response = "🤔 I didn't understand that. Try asking about tracking, status, or emergency help.";
    }

    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message';
        aiMsg.innerHTML = `<strong>AI:</strong> ${response}`;
        chatMessages.appendChild(aiMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
}

// Push Notification Functions
function sendShuttleArrivalNotification(shuttleId, shuttleName, eta, stop) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
            registration.active.postMessage({
                type: 'SHUTTLE_ARRIVAL',
                payload: {
                    id: shuttleId,
                    name: shuttleName,
                    eta: eta,
                    stop: stop
                }
            });
        }).catch(err => {
            console.log('Service Worker not ready:', err);
            // Fallback to regular notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`🚌 ${shuttleName} Arriving!`, {
                    body: `Your shuttle "${shuttleName}" is arriving in ${eta} minutes at ${stop}.`,
                    icon: '/icon-192x192.png',
                    badge: '/icon-96x96.png',
                    vibrate: [200, 100, 200],
                    tag: `shuttle-${shuttleId}`,
                    requireInteraction: true
                });
            }
        });
    }
}

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        setTimeout(() => {
            installPrompt.classList.add('show');
        }, 3000);
    }
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
        });
    }
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        installPrompt.classList.remove('show');
    }
}

function dismissInstall() {
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        installPrompt.classList.remove('show');
        localStorage.setItem('pwa-dismissed', 'true');
    }
}

// Notification permission request
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        });
    }
}

// Initialize enhanced features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    initVoiceRecognition();
    requestNotificationPermission();
    
    // Add window resize listener for responsive dashboard
    window.addEventListener('resize', handleDriverDashboardResize);
    
    // Initial responsive layout setup
    setTimeout(() => {
        handleDriverDashboardResize();
    }, 100);
});

// Keyboard support
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});

// Student Directory Functionality
let studentDirectoryData = [];
let currentPage = 1;
let recordsPerPage = 10;
let sortColumn = 'created_at';
let sortDirection = 'DESC';

// Show Student Directory
function showStudentDirectory() {
    console.log('📋 Opening Student Directory...');
    const directorySection = document.getElementById('studentDirectorySection');
    if (directorySection) {
        directorySection.style.display = 'block';
        loadStudentDirectory();
    }
}

// Close Student Directory
function closeStudentDirectory() {
    const directorySection = document.getElementById('studentDirectorySection');
    if (directorySection) {
        directorySection.style.display = 'none';
    }
}

// Load Student Directory from API
async function loadStudentDirectory() {
    try {
        console.log('🔄 Loading student directory...');
        
        // Show loading state
        const tableBody = document.getElementById('studentTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="8" style="text-align: center; padding: 20px;">
                        <div class="loading-spinner"></div>
                        <span>Loading student directory...</span>
                    </td>
                </tr>
            `;
        }
        
        // Fetch student data
        const response = await fetch('/api/students');
        const data = await response.json();
        
        if (data.success) {
            studentDirectoryData = data.students;
            console.log(`✅ Loaded ${studentDirectoryData.length} student records`);
            
            // Update statistics
            updateDirectoryStats();
            
            // Render table
            renderStudentTable();
            
            // Update last updated time
            updateLastUpdatedTime();
        } else {
            throw new Error(data.message || 'Failed to load student directory');
        }
    } catch (error) {
        console.error('❌ Error loading student directory:', error);
        
        const tableBody = document.getElementById('studentTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="error-row">
                    <td colspan="8" style="text-align: center; padding: 20px; color: #f44336;">
                        <div>❌ Failed to load student directory</div>
                        <div style="font-size: 12px; margin-top: 5px;">${error.message}</div>
                        <button onclick="loadStudentDirectory()" style="margin-top: 10px; padding: 8px 16px; background: #1565c0; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                    </td>
                </tr>
            `;
        }
    }
}

// Update Directory Statistics
function updateDirectoryStats() {
    const totalStudents = studentDirectoryData.length;
    const registeredCount = studentDirectoryData.filter(s => s.registration_status === 'Registered').length;
    const pendingCount = studentDirectoryData.filter(s => s.registration_status === 'Pending').length;
    
    // Update DOM elements
    updateElement('totalStudents', totalStudents);
    updateElement('registeredCount', registeredCount);
    updateElement('pendingCount', pendingCount);
    updateElement('activeNow', Math.floor(Math.random() * 20) + 5); // Simulated active users
    updateElement('tableRecordCount', `${totalStudents} records`);
}

// Render Student Table
function renderStudentTable() {
    const tableBody = document.getElementById('studentTableBody');
    if (!tableBody) return;
    
    // Apply current filters and sorting
    let filteredData = applyFiltersAndSorting();
    
    // Apply pagination
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="8" style="text-align: center; padding: 20px; color: #666;">
                    <div>📭 No student records found</div>
                    <div style="font-size: 12px; margin-top: 5px;">Try adjusting your search or filters</div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Render each student row
    paginatedData.forEach(student => {
        const row = createStudentRow(student);
        tableBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination(filteredData.length);
}

// Create Student Row
function createStudentRow(student) {
    const row = document.createElement('tr');
    row.onclick = () => showStudentDetails(student);
    row.style.cursor = 'pointer';
    
    const statusClass = student.registration_status === 'Registered' ? 'status-registered' : 'status-pending';
    const roleClass = `role-${student.role}`;
    
    row.innerHTML = `
        <td>${escapeHtml(student.first_name || '')}</td>
        <td>${escapeHtml(student.last_name || '')}</td>
        <td>${escapeHtml(student.email || '')}</td>
        <td>${escapeHtml(student.phone || '')}</td>
        <td><span class="role-badge ${roleClass}">${escapeHtml(student.role || '')}</span></td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(student.registration_status || '')}</span></td>
        <td>${formatDate(student.created_at)}</td>
        <td>
            <div class="action-buttons-cell">
                <button class="action-btn-small" onclick="event.stopPropagation(); viewStudent(${student.id})">View</button>
                <button class="action-btn-small" onclick="event.stopPropagation(); editStudent(${student.id})">Edit</button>
                <button class="action-btn-small delete" onclick="event.stopPropagation(); deleteStudent(${student.id})">Delete</button>
            </div>
        </td>
    `;
    
    return row;
}

// Show Student Details Modal
function showStudentDetails(student) {
    console.log('👤 Showing student details:', student);
    
    // Create modal content
    const modalContent = `
        <div class="modal-header">
            <h3>👤 Student Details</h3>
            <button class="modal-close" onclick="closeStudentDetailsModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="student-details-grid">
                <div class="detail-group">
                    <label>Name:</label>
                    <div class="detail-value">${escapeHtml(student.first_name || '')} ${escapeHtml(student.last_name || '')}</div>
                </div>
                <div class="detail-group">
                    <label>Email:</label>
                    <div class="detail-value">${escapeHtml(student.email || '')}</div>
                </div>
                <div class="detail-group">
                    <label>Phone:</label>
                    <div class="detail-value">${escapeHtml(student.phone || '')}</div>
                </div>
                <div class="detail-group">
                    <label>Role:</label>
                    <div class="detail-value"><span class="role-badge role-${student.role}">${escapeHtml(student.role || '')}</span></div>
                </div>
                <div class="detail-group">
                    <label>Status:</label>
                    <div class="detail-value"><span class="status-badge ${student.registration_status === 'Registered' ? 'status-registered' : 'status-pending'}">${escapeHtml(student.registration_status || '')}</span></div>
                </div>
                <div class="detail-group">
                    <label>Member Since:</label>
                    <div class="detail-value">${formatDate(student.created_at)}</div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="action-btn" onclick="editStudent(${student.id})">✏️ Edit Student</button>
                <button class="action-btn" onclick="sendEmailToStudent('${escapeHtml(student.email || '')}')">📧 Send Email</button>
                <button class="action-btn delete" onclick="deleteStudent(${student.id})">🗑️ Delete Student</button>
            </div>
        </div>
    `;
    
    // Show modal
    showModal('studentDetailsModal', modalContent);
}

// Close Student Details Modal
function closeStudentDetailsModal() {
    closeModal('studentDetailsModal');
}

// Filter Students
function filterStudents() {
    currentPage = 1; // Reset to first page
    renderStudentTable();
}

// Apply Filters and Sorting
function applyFiltersAndSorting() {
    let filteredData = [...studentDirectoryData];
    
    // Apply search filter
    const searchTerm = document.getElementById('studentSearchInput')?.value?.toLowerCase() || '';
    if (searchTerm) {
        filteredData = filteredData.filter(student => 
            (student.first_name && student.first_name.toLowerCase().includes(searchTerm)) ||
            (student.last_name && student.last_name.toLowerCase().includes(searchTerm)) ||
            (student.email && student.email.toLowerCase().includes(searchTerm)) ||
            (student.phone && student.phone.includes(searchTerm))
        );
    }
    
    // Apply role filter
    const roleFilter = document.getElementById('roleFilter')?.value || 'all';
    if (roleFilter !== 'all') {
        filteredData = filteredData.filter(student => student.role === roleFilter);
    }
    
    // Apply status filter
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    if (statusFilter !== 'all') {
        filteredData = filteredData.filter(student => student.registration_status === statusFilter);
    }
    
    // Apply sorting
    filteredData.sort((a, b) => {
        let aValue = a[sortColumn] || '';
        let bValue = b[sortColumn] || '';
        
        // Handle different data types
        if (sortColumn === 'created_at') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }
        
        if (aValue < bValue) return sortDirection === 'ASC' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'ASC' ? 1 : -1;
        return 0;
    });
    
    return filteredData;
}

// Sort Table
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
        sortColumn = column;
        sortDirection = 'ASC';
    }
    
    renderStudentTable();
}

// Refresh Student Directory
function refreshStudentDirectory() {
    console.log('🔄 Refreshing student directory...');
    loadStudentDirectory();
}

// Export Student Data
function exportStudentData() {
    console.log('📥 Exporting student data...');
    
    // Create CSV content
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Created At'];
    const csvContent = [
        headers.join(','),
        ...studentDirectoryData.map(student => [
            escapeCsv(student.first_name || ''),
            escapeCsv(student.last_name || ''),
            escapeCsv(student.email || ''),
            escapeCsv(student.phone || ''),
            escapeCsv(student.role || ''),
            escapeCsv(student.registration_status || ''),
            escapeCsv(student.created_at || '')
        ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_directory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Student data exported successfully');
}

// Pagination Functions
function updatePagination(totalRecords) {
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    // Update page info
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    // Update button states
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderStudentTable();
    }
}

function nextPage() {
    const filteredData = applyFiltersAndSorting();
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    
    if (currentPage < totalPages) {
        currentPage++;
        renderStudentTable();
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeCsv(text) {
    return text.includes(',') ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return 'N/A';
    }
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateLastUpdatedTime() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const now = new Date();
        lastUpdatedElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
}

// Placeholder functions for actions
function viewStudent(studentId) {
    console.log('👁️ Viewing student:', studentId);
    const student = studentDirectoryData.find(s => s.id === studentId);
    if (student) {
        showStudentDetails(student);
    }
}

function editStudent(studentId) {
    console.log('✏️ Editing student:', studentId);
    // TODO: Implement edit functionality
    alert('Edit functionality coming soon!');
}

function deleteStudent(studentId) {
    console.log('🗑️ Deleting student:', studentId);
    if (confirm('Are you sure you want to delete this student record? This action cannot be undone.')) {
        // TODO: Implement delete functionality
        alert('Delete functionality coming soon!');
    }
}

function sendEmailToStudent(email) {
    console.log('📧 Sending email to:', email);
    window.location.href = `mailto:${email}`;
}

// Socket.IO Real-time Updates
if (typeof socket !== 'undefined') {
    socket.on('new-user-registration', function(data) {
        console.log('🔔 New user registration received:', data);
        
        // Add new student to the data
        if (data.user) {
            studentDirectoryData.unshift(data.user);
            
            // Update the directory if it's visible
            const directorySection = document.getElementById('studentDirectorySection');
            if (directorySection && directorySection.style.display !== 'none') {
                updateDirectoryStats();
                renderStudentTable();
                updateLastUpdatedTime();
                
                // Show notification
                showNotification(`New ${data.user.role} registered: ${data.user.name}`, 'success');
            }
        }
    });
}

// Show notification
function showNotification(message, type = 'info') {
    console.log('🔔 Notification:', message, type);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#1565c0'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Real-time System Status Management
let systemStatusInterval = null;
let lastSystemUpdate = null;

// Initialize System Status monitoring
function initializeSystemStatus() {
    console.log('🖥️ Initializing real-time system status monitoring...');
    
    // Load initial system status
    loadSystemStatus();
    
    // Set up periodic updates
    if (systemStatusInterval) {
        clearInterval(systemStatusInterval);
    }
    
    systemStatusInterval = setInterval(() => {
        loadSystemStatus();
    }, 30000); // Update every 30 seconds
    
    // Set up Socket.IO real-time updates
    if (typeof socket !== 'undefined') {
        socket.on('system-status-update', function(data) {
            console.log('📊 Real-time system status update:', data);
            updateSystemStatusDisplay(data);
            updateLastSystemUpdateTime();
        });
    }
}

// Load System Status from API
async function loadSystemStatus() {
    try {
        console.log('🔄 Loading system status...');
        
        const startTime = Date.now();
        
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/system-status', {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ System status loaded successfully');
            updateSystemStatusDisplay(data.system_status);
            updateLastSystemUpdateTime();
            
            // Update server response time
            updateElement('server-response', responseTime);
        } else {
            throw new Error(data.message || 'Failed to load system status');
        }
    } catch (error) {
        console.error('❌ Error loading system status:', error);
        
        // Use fallback data if API fails
        if (error.name === 'AbortError') {
            showSystemStatusError('Request timeout - server may be busy');
        } else {
            showSystemStatusError(error.message);
        }
        
        // Load fallback system status
        loadFallbackSystemStatus();
    }
}

// Load fallback system status (when API fails)
function loadFallbackSystemStatus() {
    console.log('🔄 Loading fallback system status...');
    
    const fallbackStatus = {
        server: {
            status: 'online',
            uptime: 'Unknown',
            response_time_ms: 0
        },
        database: {
            status: 'connected',
            user_records: 0,
            total_records: 0
        },
        users: {
            total: 0,
            active: 0
        },
        shuttles: {
            total: 0,
            active: 0
        },
        trips: {
            today: 0
        },
        analytics: {
            system_health_score: 75
        }
    };
    
    updateSystemStatusDisplay(fallbackStatus);
    
    // Update status to show fallback mode
    const lastUpdateElement = document.getElementById('lastSystemUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = 'Updated: Fallback mode';
        lastUpdateElement.style.color = '#ff9800';
    }
    
    // Show notification
    showNotification('Using fallback system status - API unavailable', 'warning');
}

// Update System Status Display
function updateSystemStatusDisplay(systemStatus) {
    if (!systemStatus) return;
    
    // Update Server Status
    updateServerStatus(systemStatus.server);
    
    // Update Database Status
    updateDatabaseStatus(systemStatus.database);
    
    // Update Fleet Status
    updateFleetStatus(systemStatus.shuttles);
    
    // Update Activity Status
    updateActivityStatus(systemStatus.trips, systemStatus.users);
    
    // Update System Metrics
    updateSystemMetrics(systemStatus);
    
    lastSystemUpdate = new Date();
}

// Update Server Status
function updateServerStatus(server) {
    const serverStatus = document.getElementById('server-status');
    const serverUptime = document.getElementById('server-uptime');
    
    if (serverStatus) {
        const indicatorDot = serverStatus.querySelector('.indicator-dot');
        const indicatorText = serverStatus.querySelector('.indicator-text');
        
        if (server.status === 'online') {
            indicatorDot.className = 'indicator-dot online';
            indicatorText.textContent = 'Online';
        } else {
            indicatorDot.className = 'indicator-dot offline';
            indicatorText.textContent = 'Offline';
        }
    }
    
    if (serverUptime && server.uptime) {
        serverUptime.textContent = formatUptime(server.uptime);
    }
}

// Update Database Status
function updateDatabaseStatus(database) {
    const dbStatus = document.getElementById('db-status');
    const dbUsers = document.getElementById('db-users');
    const dbRecords = document.getElementById('db-records');
    
    if (dbStatus) {
        const indicatorDot = dbStatus.querySelector('.indicator-dot');
        const indicatorText = dbStatus.querySelector('.indicator-text');
        
        if (database.status === 'connected') {
            indicatorDot.className = 'indicator-dot online';
            indicatorText.textContent = 'Connected';
        } else {
            indicatorDot.className = 'indicator-dot offline';
            indicatorText.textContent = 'Disconnected';
        }
    }
    
    if (dbUsers) {
        dbUsers.textContent = database.user_records || 0;
    }
    
    if (dbRecords) {
        dbRecords.textContent = database.total_records || 0;
    }
}

// Update Fleet Status
function updateFleetStatus(shuttles) {
    const fleetStatus = document.getElementById('fleet-status');
    const fleetActive = document.getElementById('fleet-active');
    const fleetTotal = document.getElementById('fleet-total');
    
    if (fleetStatus) {
        const indicatorDot = fleetStatus.querySelector('.indicator-dot');
        const indicatorText = fleetStatus.querySelector('.indicator-text');
        
        if (shuttles.active > 0) {
            indicatorDot.className = 'indicator-dot online';
            indicatorText.textContent = 'Active';
        } else {
            indicatorDot.className = 'indicator-dot warning';
            indicatorText.textContent = 'Standby';
        }
    }
    
    if (fleetActive) {
        fleetActive.textContent = shuttles.active || 0;
    }
    
    if (fleetTotal) {
        fleetTotal.textContent = shuttles.total || 0;
    }
}

// Update Activity Status
function updateActivityStatus(trips, users) {
    const activityStatus = document.getElementById('activity-status');
    const activityTrips = document.getElementById('activity-trips');
    const activityUsers = document.getElementById('activity-users');
    
    if (activityStatus) {
        const indicatorDot = activityStatus.querySelector('.indicator-dot');
        const indicatorText = activityStatus.querySelector('.indicator-text');
        
        if (trips.today > 0) {
            indicatorDot.className = 'indicator-dot online';
            indicatorText.textContent = 'Active';
        } else {
            indicatorDot.className = 'indicator-dot warning';
            indicatorText.textContent = 'Quiet';
        }
    }
    
    if (activityTrips) {
        activityTrips.textContent = trips.today || 0;
    }
    
    if (activityUsers) {
        activityUsers.textContent = users.active || 0;
    }
}

// Update System Metrics
function updateSystemMetrics(systemStatus) {
    const totalUsers = document.getElementById('total-users');
    const activeNow = document.getElementById('active-now');
    const systemHealth = document.getElementById('system-health');
    
    if (totalUsers) {
        totalUsers.textContent = systemStatus.users?.total || 0;
    }
    
    if (activeNow) {
        activeNow.textContent = systemStatus.users?.active || 0;
    }
    
    if (systemHealth) {
        const healthScore = systemStatus.analytics?.system_health_score || 95;
        systemHealth.textContent = `${healthScore}%`;
        
        // Update color based on health score
        if (healthScore >= 90) {
            systemHealth.style.color = '#4caf50';
        } else if (healthScore >= 70) {
            systemHealth.style.color = '#ff9800';
        } else {
            systemHealth.style.color = '#f44336';
        }
    }
}

// Show System Status Error
function showSystemStatusError(errorMessage) {
    console.error('❌ System status error:', errorMessage);
    
    // Update all status indicators to error state
    const statusElements = ['server-status', 'db-status', 'fleet-status', 'activity-status'];
    
    statusElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            const indicatorDot = element.querySelector('.indicator-dot');
            const indicatorText = element.querySelector('.indicator-text');
            
            if (indicatorDot) indicatorDot.className = 'indicator-dot offline';
            if (indicatorText) indicatorText.textContent = 'Error';
        }
    });
    
    // Show notification
    showNotification('System status update failed', 'error');
}

// Refresh System Status
function refreshSystemStatus() {
    console.log('🔄 Manual system status refresh...');
    loadSystemStatus();
}

// Update Last System Update Time
function updateLastSystemUpdateTime() {
    const lastUpdateElement = document.getElementById('lastSystemUpdate');
    if (lastUpdateElement) {
        const now = new Date();
        lastUpdateElement.textContent = `Updated: ${now.toLocaleTimeString()}`;
    }
}

// Format Uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Auto-initialize system status when admin dashboard is shown
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on admin dashboard
    setTimeout(() => {
        const adminDashboard = document.getElementById('adminDashboard');
        if (adminDashboard && adminDashboard.style.display !== 'none') {
            initializeSystemStatus();
        }
    }, 1000);
});

// Clean up system status monitoring when page unloads
window.addEventListener('beforeunload', function() {
    if (systemStatusInterval) {
        clearInterval(systemStatusInterval);
    }
});

// Driver Management Dashboard Functions
let driverDashboardData = [];
let currentDriverFilter = 'all';
let currentDriverSearch = '';

// Show Driver Dashboard
function showDriverDashboard() {
    console.log('👥 Opening Driver Management Dashboard...');
    const dashboardSection = document.getElementById('driverDashboardSection');
    if (dashboardSection) {
        dashboardSection.style.display = 'block';
        loadDriverDashboard();
    }
}

// Close Driver Dashboard
function closeDriverDashboard() {
    const dashboardSection = document.getElementById('driverDashboardSection');
    if (dashboardSection) {
        dashboardSection.style.display = 'none';
    }
}

// Load Driver Dashboard from API
async function loadDriverDashboard() {
    try {
        console.log('🔄 Loading driver dashboard data...');
        
        // Show loading state with responsive message
        const tableBody = document.getElementById('driverTableBody');
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 768;
        
        if (tableBody) {
            const colspan = isMobile ? 5 : 7; // Fewer columns on mobile
            tableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="${colspan}" style="text-align: center; padding: 20px;">
                        <div class="loading-spinner"></div>
                        <div style="margin-top: 10px; font-size: 14px; color: #666;">
                            Loading driver data...
                            ${isMobile ? '<br><small>(Optimized for mobile)</small>' : ''}
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Fetch driver data with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('/api/drivers', {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            driverDashboardData = data.drivers;
            console.log(`✅ Loaded ${driverDashboardData.length} driver records`);
            
            // Initialize responsive layout
            updateResponsiveLayout();
            
            // Update overview statistics
            updateDriverOverviewStats(data.summary);
            
            // Render driver table with responsive behavior
            renderDriverTable();
            
            // Update analytics with responsive charts
            updateDriverAnalytics();
            
            // Load schedule for today
            loadScheduleForDate();
            
            // Update last updated time
            updateDriverLastUpdatedTime();
            
            // Show success notification for mobile users
            if (isMobile) {
                showNotification(`Loaded ${driverDashboardData.length} drivers successfully`, 'success');
            }
        } else {
            throw new Error(data.message || 'Failed to load driver dashboard');
        }
    } catch (error) {
        console.error('❌ Error loading driver dashboard:', error);
        
        // Show responsive error message
        if (error.name === 'AbortError') {
            showDriverDashboardError('Request timeout - please check your connection');
        } else {
            showDriverDashboardError(error.message);
        }
    }
}

// Update Driver Overview Statistics
function updateDriverOverviewStats(summary) {
    if (!summary) return;
    
    updateElement('totalDriversStat', summary.totalDrivers || 0);
    updateElement('onDutyStat', summary.onDuty || 0);
    updateElement('scheduledStat', summary.scheduled || 0);
    updateElement('tripsTodayStat', summary.totalTripsToday || 0);
}

// Render Driver Table (Responsive)
function renderDriverTable() {
    const tableBody = document.getElementById('driverTableBody');
    if (!tableBody) return;
    
    // Apply current filters
    let filteredData = applyDriverFilters();
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = `
            <tr class="no-data-row">
                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                    <div>📭 No drivers found</div>
                    <div style="font-size: 12px; margin-top: 5px;">Try adjusting your filters</div>
                </td>
            </tr>
        `;
        updateElement('driverTableCount', '0 drivers');
        return;
    }
    
    // Render each driver row
    filteredData.forEach(driver => {
        const row = createDriverRow(driver);
        tableBody.appendChild(row);
    });
    
    // Update record count
    updateElement('driverTableCount', `${filteredData.length} drivers`);
    
    // Apply responsive table enhancements
    enhanceDriverTableResponsiveness();
}

// Enhance Driver Table for Mobile Responsiveness
function enhanceDriverTableResponsiveness() {
    const table = document.getElementById('driverTable');
    if (!table) return;
    
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;
    const isVerySmall = screenWidth <= 480;
    
    // Show/hide columns based on screen size
    const headers = table.querySelectorAll('th');
    const rows = table.querySelectorAll('tbody tr');
    
    if (isMobile) {
        // Hide columns on mobile
        hideTableColumn(6, headers, rows); // Performance column
        if (isVerySmall) {
            hideTableColumn(5, headers, rows); // Next shift column
        }
    } else {
        // Show all columns on desktop
        showTableColumn(6, headers, rows);
        showTableColumn(5, headers, rows);
    }
    
    // Adjust table wrapper for horizontal scrolling on mobile
    const tableWrapper = document.querySelector('.driver-table-wrapper');
    if (tableWrapper) {
        if (isMobile) {
            tableWrapper.style.overflowX = 'auto';
            table.style.minWidth = '600px';
        } else {
            tableWrapper.style.overflowX = 'visible';
            table.style.minWidth = '100%';
        }
    }
}

// Hide Table Column
function hideTableColumn(columnIndex, headers, rows) {
    if (headers[columnIndex]) {
        headers[columnIndex].style.display = 'none';
    }
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells[columnIndex]) {
            cells[columnIndex].style.display = 'none';
        }
    });
}

// Show Table Column
function showTableColumn(columnIndex, headers, rows) {
    if (headers[columnIndex]) {
        headers[columnIndex].style.display = '';
    }
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells[columnIndex]) {
            cells[columnIndex].style.display = '';
        }
    });
}

// Handle Window Resize for Responsive Dashboard
function handleDriverDashboardResize() {
    const dashboardSection = document.getElementById('driverDashboardSection');
    if (dashboardSection && dashboardSection.style.display !== 'none') {
        enhanceDriverTableResponsiveness();
        updateResponsiveLayout();
    }
}

// Update Responsive Layout
function updateResponsiveLayout() {
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;
    const isTablet = screenWidth <= 1024 && screenWidth > 768;
    
    // Update stat cards layout
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
        if (isMobile) {
            statsGrid.style.gridTemplateColumns = '1fr';
        } else if (isTablet) {
            statsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else {
            statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        }
    }
    
    // Update analytics layout
    const analyticsGrid = document.querySelector('.analytics-grid');
    if (analyticsGrid) {
        if (isMobile) {
            analyticsGrid.style.gridTemplateColumns = '1fr';
        } else if (isTablet) {
            analyticsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        } else {
            analyticsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
        }
    }
    
    // Update overview controls layout
    const overviewControls = document.querySelector('.overview-controls');
    if (overviewControls) {
        if (isMobile) {
            overviewControls.style.flexDirection = 'column';
            Array.from(overviewControls.children).forEach(child => {
                child.style.width = '100%';
                child.style.marginBottom = '8px';
            });
        } else {
            overviewControls.style.flexDirection = 'row';
            Array.from(overviewControls.children).forEach(child => {
                child.style.width = 'auto';
                child.style.marginBottom = '0';
            });
        }
    }
}

// Create Driver Row
function createDriverRow(driver) {
    const row = document.createElement('tr');
    
    const statusClass = driver.currentStatus.dutyStatus === 'on-duty' ? 'status-on-duty' : 
                         driver.currentStatus.dutyStatus === 'scheduled' ? 'status-scheduled' : 'status-off-duty';
    
    const performanceClass = driver.performance.rating >= 4.5 ? 'performance-good' :
                          driver.performance.rating >= 3.5 ? 'performance-warning' : 'performance-poor';
    
    row.innerHTML = `
        <td>
            <div class="driver-info">
                <div class="driver-avatar">${driver.profile.firstName.charAt(0)}${driver.profile.lastName.charAt(0)}</div>
                <div class="driver-details">
                    <div class="driver-name">${escapeHtml(driver.profile.firstName)} ${escapeHtml(driver.profile.lastName)}</div>
                    <div class="driver-contact">${escapeHtml(driver.profile.email)} | ${escapeHtml(driver.profile.phone)}</div>
                </div>
            </div>
        </td>
        <td>
            <div class="performance-indicator">
                <span class="performance-metric">License: ${escapeHtml(driver.profile.licenseNumber || 'N/A')}</span>
                <span class="performance-metric">Vehicle: ${escapeHtml(driver.profile.vehicleNumber || 'N/A')}</span>
            </div>
        </td>
        <td>
            <span class="status-badge ${statusClass}">${escapeHtml(driver.currentStatus.dutyStatus || 'unknown')}</span>
        </td>
        <td>
            <div class="performance-indicator">
                <div class="performance-metric">${escapeHtml(driver.currentStatus.assignedShuttle || 'None')}</div>
                ${driver.currentStatus.currentRoute ? `<div class="performance-metric">${escapeHtml(driver.currentStatus.currentRoute)}</div>` : ''}
            </div>
        </td>
        <td>
            <div class="performance-indicator">
                <span class="performance-metric ${performanceClass}">Trips: ${driver.performance.tripsToday}</span>
                <span class="performance-metric">Rating: ⭐${driver.performance.rating}</span>
                <span class="performance-metric">Response: ${driver.performance.averageResponseTime}min</span>
            </div>
        </td>
        <td>
            <span class="performance-metric">${driver.nextShift ? formatDate(driver.nextShift) : 'Not scheduled'}</span>
        </td>
        <td>
            <div class="action-buttons-driver">
                <button class="driver-action-btn" onclick="viewDriverDetails(${driver.id})">View</button>
                <button class="driver-action-btn" onclick="editDriver(${driver.id})">Edit</button>
                <button class="driver-action-btn" onclick="assignDriver(${driver.id})">Assign</button>
                <button class="driver-action-btn danger" onclick="removeDriver(${driver.id})">Remove</button>
            </div>
        </td>
    `;
    
    return row;
}

// Apply Driver Filters
function applyDriverFilters() {
    let filteredData = [...driverDashboardData];
    
    // Apply status filter
    if (currentDriverFilter !== 'all') {
        filteredData = filteredData.filter(driver => 
            driver.currentStatus.dutyStatus === currentDriverFilter
        );
    }
    
    // Apply search filter
    if (currentDriverSearch) {
        const searchTerm = currentDriverSearch.toLowerCase();
        filteredData = filteredData.filter(driver =>
            driver.profile.firstName.toLowerCase().includes(searchTerm) ||
            driver.profile.lastName.toLowerCase().includes(searchTerm) ||
            driver.profile.email.toLowerCase().includes(searchTerm) ||
            driver.profile.phone.includes(searchTerm)
        );
    }
    
    return filteredData;
}

// Filter Drivers
function filterDrivers() {
    const statusFilter = document.getElementById('driverStatusFilter');
    const searchInput = document.getElementById('driverSearchInput');
    
    if (statusFilter) {
        currentDriverFilter = statusFilter.value;
    }
    
    if (searchInput) {
        currentDriverSearch = searchInput.value;
    }
    
    renderDriverTable();
}

// Refresh Driver Dashboard
function refreshDriverDashboard() {
    console.log('🔄 Refreshing driver dashboard...');
    loadDriverDashboard();
}

// Update Driver Analytics (Responsive)
function updateDriverAnalytics() {
    const period = document.getElementById('analyticsPeriod')?.value || 'today';
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;
    
    // Calculate analytics from driver data
    const totalTrips = driverDashboardData.reduce((sum, driver) => sum + driver.performance.tripsToday, 0);
    const avgResponseTime = driverDashboardData.reduce((sum, driver) => sum + driver.performance.averageResponseTime, 0) / (driverDashboardData.length || 1);
    const totalPassengers = driverDashboardData.reduce((sum, driver) => sum + driver.performance.totalPassengers, 0);
    const totalIncidents = driverDashboardData.reduce((sum, driver) => sum + driver.performance.incidents30Days, 0);
    
    // Format numbers for mobile display
    const formatNumber = (num) => {
        if (isMobile && num > 9999) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toLocaleString();
    };
    
    // Update analytics display with responsive formatting
    updateElement('totalTripsAnalytics', formatNumber(totalTrips));
    updateElement('avgResponseTime', Math.round(avgResponseTime) + ' min');
    updateElement('passengersServed', formatNumber(totalPassengers));
    updateElement('incidents30Days', formatNumber(totalIncidents));
    
    // Calculate safety score
    const maxPossibleIncidents = driverDashboardData.length * 5; // Assume max 5 incidents per driver per 30 days
    const safetyScore = Math.max(0, 100 - Math.round((totalIncidents / maxPossibleIncidents) * 100));
    updateElement('safetyScore', safetyScore + '%');
    
    // Update safety score color based on screen size
    const safetyScoreElement = document.getElementById('safetyScore');
    if (safetyScoreElement) {
        if (safetyScore >= 95) {
            safetyScoreElement.style.color = '#4caf50';
        } else if (safetyScore >= 80) {
            safetyScoreElement.style.color = '#ff9800';
        } else {
            safetyScoreElement.style.color = '#f44336';
        }
        
        if (isMobile) {
            safetyScoreElement.style.fontSize = '16px';
            safetyScoreElement.style.fontWeight = 'bold';
        }
    }
    
    // Update top performers
    updateTopPerformers();
}

// Update Top Performers
function updateTopPerformers() {
    const topPerformersList = document.getElementById('topPerformersList');
    if (!topPerformersList) return;
    
    // Sort drivers by performance (trips completed + rating)
    const topDrivers = [...driverDashboardData]
        .sort((a, b) => {
            const scoreA = a.performance.tripsToday + parseFloat(a.performance.rating);
            const scoreB = b.performance.tripsToday + parseFloat(b.performance.rating);
            return scoreB - scoreA;
        })
        .slice(0, 5);
    
    // Render top performers
    topPerformersList.innerHTML = topDrivers.map((driver, index) => `
        <div class="performer-item">
            <span class="performer-name">${index + 1}. ${escapeHtml(driver.profile.firstName)} ${escapeHtml(driver.profile.lastName)}</span>
            <span class="performer-score">${driver.performance.tripsToday} trips</span>
        </div>
    `).join('');
}

// Load Schedule for Date
function loadScheduleForDate() {
    const dateInput = document.getElementById('scheduleDate');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    console.log('📅 Loading schedule for date:', selectedDate);
    
    // Update calendar title
    const calendarTitle = document.getElementById('calendarTitle');
    if (calendarTitle) {
        const date = new Date(selectedDate + 'T00:00:00');
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        calendarTitle.textContent = isToday ? "Today's Schedule" : date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Simulate loading shifts (in real app, this would come from API)
    const shiftsContainer = document.getElementById('shiftsContainer');
    if (shiftsContainer) {
        const mockShifts = [
            {
                driver: 'Kofi Mensah',
                shuttle: 'Library Shuttle',
                time: '08:00 - 16:00',
                status: 'active'
            },
            {
                driver: 'Ama Asante',
                shuttle: 'Hostel Shuttle',
                time: '09:00 - 17:00',
                status: 'scheduled'
            },
            {
                driver: 'Kwame Nkrumah',
                shuttle: 'Science Shuttle',
                time: '10:00 - 18:00',
                status: 'scheduled'
            }
        ];
        
        shiftsContainer.innerHTML = mockShifts.map(shift => `
            <div class="shift-item">
                <div class="shift-info">
                    <div class="shift-driver">${escapeHtml(shift.driver)}</div>
                    <div class="shift-details">
                        🚌 ${escapeHtml(shift.shuttle)} | 🕐 ${escapeHtml(shift.time)}
                    </div>
                </div>
                <div class="shift-actions">
                    <button class="driver-action-btn" onclick="editShift('${escapeHtml(shift.driver)}')">Edit</button>
                    <button class="driver-action-btn danger" onclick="cancelShift('${escapeHtml(shift.driver)}')">Cancel</button>
                </div>
            </div>
        `).join('');
    }
}

// Driver Action Functions
function viewDriverDetails(driverId) {
    console.log('👁️ Viewing driver details:', driverId);
    const driver = driverDashboardData.find(d => d.id === driverId);
    if (driver) {
        showDriverDetailsModal(driver);
    }
}

function editDriver(driverId) {
    console.log('✏️ Editing driver:', driverId);
    // TODO: Implement edit functionality
    showNotification('Edit driver functionality coming soon!', 'info');
}

function assignDriver(driverId) {
    console.log('🚗 Assigning driver:', driverId);
    // TODO: Implement assignment modal
    showNotification('Driver assignment functionality coming soon!', 'info');
}

function removeDriver(driverId) {
    console.log('🗑️ Removing driver:', driverId);
    if (confirm('Are you sure you want to remove this driver? This action cannot be undone.')) {
        // TODO: Implement remove functionality
        showNotification('Remove driver functionality coming soon!', 'info');
    }
}

// Schedule Functions
function previousDay() {
    const dateInput = document.getElementById('scheduleDate');
    if (dateInput) {
        const currentDate = new Date(dateInput.value + 'T00:00:00');
        currentDate.setDate(currentDate.getDate() - 1);
        dateInput.value = currentDate.toISOString().split('T')[0];
        loadScheduleForDate();
    }
}

function nextDay() {
    const dateInput = document.getElementById('scheduleDate');
    if (dateInput) {
        const currentDate = new Date(dateInput.value + 'T00:00:00');
        currentDate.setDate(currentDate.getDate() + 1);
        dateInput.value = currentDate.toISOString().split('T')[0];
        loadScheduleForDate();
    }
}

function addNewShift() {
    console.log('➕ Adding new shift...');
    // TODO: Implement add shift functionality
    showNotification('Add shift functionality coming soon!', 'info');
}

function autoAssignDrivers() {
    console.log('🤖 Auto-assigning drivers...');
    // TODO: Implement auto-assignment logic
    showNotification('Auto-assign functionality coming soon!', 'info');
}

function exportDriverAnalytics() {
    console.log('📥 Exporting driver analytics...');
    
    // Create CSV content
    const headers = ['Name', 'Email', 'Phone', 'Trips Today', 'Total Trips', 'Average Response Time', 'Rating', 'Incidents (30 days)'];
    const csvContent = [
        headers.join(','),
        ...driverDashboardData.map(driver => [
            escapeCsv(driver.profile.firstName + ' ' + driver.profile.lastName),
            escapeCsv(driver.profile.email),
            escapeCsv(driver.profile.phone),
            driver.performance.tripsToday,
            driver.performance.completedTrips,
            driver.performance.averageResponseTime + ' min',
            driver.performance.rating,
            driver.performance.incidents30Days
        ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Driver analytics exported successfully');
}

// Show Driver Details Modal (Responsive)
function showDriverDetailsModal(driver) {
    console.log('👤 Showing driver details:', driver);
    
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;
    const isVerySmall = screenWidth <= 480;
    
    const modalContent = `
        <div class="modal-header">
            <h3>${isMobile ? '👤 Driver' : '👤 Driver Details'}</h3>
            <button class="modal-close" onclick="closeDriverDetailsModal()">×</button>
        </div>
        <div class="modal-body ${isMobile ? 'mobile-modal' : ''}">
            <div class="driver-details-grid ${isMobile ? 'mobile-grid' : ''}">
                ${isMobile ? `
                    <!-- Mobile Optimized Layout -->
                    <div class="detail-group mobile-full">
                        <label>👤 Name:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.firstName)} ${escapeHtml(driver.profile.lastName)}</div>
                    </div>
                    <div class="detail-group mobile-half">
                        <label>📧 Email:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.email)}</div>
                    </div>
                    <div class="detail-group mobile-half">
                        <label>📱 Phone:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.phone)}</div>
                    </div>
                    <div class="detail-group mobile-full">
                        <label>🪪 License:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.licenseNumber || 'N/A')}</div>
                    </div>
                    <div class="detail-group mobile-full">
                        <label>🚗 Vehicle:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.vehicleNumber || 'N/A')}</div>
                    </div>
                    <div class="detail-group mobile-full">
                        <label>⏱️ Experience:</label>
                        <div class="detail-value">${driver.profile.experience || 0} years</div>
                    </div>
                    <div class="detail-group mobile-full">
                        <label>📊 Status:</label>
                        <div class="detail-value">
                            <span class="status-badge ${driver.currentStatus.dutyStatus === 'on-duty' ? 'status-on-duty' : 'status-off-duty'}">
                                ${escapeHtml(driver.currentStatus.dutyStatus)}
                            </span>
                        </div>
                    </div>
                    <div class="detail-group mobile-full">
                        <label>🚌 Assigned Shuttle:</label>
                        <div class="detail-value">${escapeHtml(driver.currentStatus.assignedShuttle || 'None')}</div>
                    </div>
                    <div class="detail-group mobile-full">
                        <label>📈 Performance Today:</label>
                        <div class="detail-value performance-mobile">
                            <div class="perf-stat">
                                <span class="perf-label">Trips:</span>
                                <span class="perf-value">${driver.performance.tripsToday}</span>
                            </div>
                            <div class="perf-stat">
                                <span class="perf-label">Rating:</span>
                                <span class="perf-value">⭐${driver.performance.rating}</span>
                            </div>
                            <div class="perf-stat">
                                <span class="perf-label">Response:</span>
                                <span class="perf-value">${driver.performance.averageResponseTime}min</span>
                            </div>
                        </div>
                    </div>
                ` : `
                    <!-- Desktop Layout -->
                    <div class="detail-group">
                        <label>Name:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.firstName)} ${escapeHtml(driver.profile.lastName)}</div>
                    </div>
                    <div class="detail-group">
                        <label>Email:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.email)}</div>
                    </div>
                    <div class="detail-group">
                        <label>Phone:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.phone)}</div>
                    </div>
                    <div class="detail-group">
                        <label>License Number:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.licenseNumber || 'N/A')}</div>
                    </div>
                    <div class="detail-group">
                        <label>Vehicle Number:</label>
                        <div class="detail-value">${escapeHtml(driver.profile.vehicleNumber || 'N/A')}</div>
                    </div>
                    <div class="detail-group">
                        <label>Experience:</label>
                        <div class="detail-value">${driver.profile.experience || 0} years</div>
                    </div>
                    <div class="detail-group">
                        <label>Current Status:</label>
                        <div class="detail-value">
                            <span class="status-badge ${driver.currentStatus.dutyStatus === 'on-duty' ? 'status-on-duty' : 'status-off-duty'}">
                                ${escapeHtml(driver.currentStatus.dutyStatus)}
                            </span>
                        </div>
                    </div>
                    <div class="detail-group">
                        <label>Assigned Shuttle:</label>
                        <div class="detail-value">${escapeHtml(driver.currentStatus.assignedShuttle || 'None')}</div>
                    </div>
                    <div class="detail-group">
                        <label>Performance Today:</label>
                        <div class="detail-value">
                            <div>Trips: ${driver.performance.tripsToday}</div>
                            <div>Rating: ⭐${driver.performance.rating}</div>
                            <div>Response Time: ${driver.performance.averageResponseTime} min</div>
                        </div>
                    </div>
                `}
            </div>
            <div class="modal-actions ${isMobile ? 'mobile-actions' : ''}">
                ${isMobile ? `
                    <!-- Mobile Actions -->
                    <button class="action-btn mobile-btn" onclick="editDriver(${driver.id})">✏️ Edit</button>
                    <button class="action-btn mobile-btn" onclick="assignDriver(${driver.id})">🚗 Assign</button>
                    <button class="action-btn mobile-btn" onclick="sendEmailToDriver('${escapeHtml(driver.profile.email)}')">📧 Email</button>
                ` : `
                    <!-- Desktop Actions -->
                    <button class="action-btn" onclick="editDriver(${driver.id})">✏️ Edit Driver</button>
                    <button class="action-btn" onclick="assignDriver(${driver.id})">🚗 Assign Shift</button>
                    <button class="action-btn" onclick="sendEmailToDriver('${escapeHtml(driver.profile.email)}')">📧 Send Email</button>
                `}
            </div>
        </div>
    `;
    
    showModal('driverDetailsModal', modalContent);
}

// Close Driver Details Modal
function closeDriverDetailsModal() {
    closeModal('driverDetailsModal');
}

// Show Driver Dashboard Error
function showDriverDashboardError(errorMessage) {
    console.error('❌ Driver dashboard error:', errorMessage);
    
    const tableBody = document.getElementById('driverTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr class="error-row">
                <td colspan="7" style="text-align: center; padding: 20px; color: #f44336;">
                    <div>❌ Failed to load driver dashboard</div>
                    <div style="font-size: 12px; margin-top: 5px;">${errorMessage}</div>
                    <button onclick="loadDriverDashboard()" style="margin-top: 10px; padding: 8px 16px; background: #1565c0; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                </td>
            </tr>
        `;
    }
}

// Update Driver Last Updated Time
function updateDriverLastUpdatedTime() {
    const lastUpdatedElement = document.getElementById('driverLastUpdated');
    if (lastUpdatedElement) {
        const now = new Date();
        lastUpdatedElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
}

// Personal Dashboard Functions
let currentDriverPersonalData = null;
let currentStudentPersonalData = null;
let driverShifts = [];
let studentTrips = [];
let studentNotifications = [];

// Show Driver Personal Dashboard
function showDriverPersonalDashboard() {
    console.log('👤 Opening Driver Personal Dashboard...');
    
    // Hide admin dashboards and show driver dashboard
    hideAllDashboards();
    const dashboard = document.getElementById('driverPersonalDashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
        loadDriverPersonalData();
    }
}

// Show Student Personal Dashboard
function showStudentPersonalDashboard() {
    console.log('🎓 Opening Student Personal Dashboard...');
    
    // Hide all dashboards and show student dashboard
    hideAllDashboards();
    const dashboard = document.getElementById('studentPersonalDashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
        loadStudentPersonalData();
    }
}

// Hide All Dashboards
function hideAllDashboards() {
    const dashboards = [
        'adminDashboard',
        'driverDashboardSection', 
        'studentDirectory',
        'driverPersonalDashboard',
        'studentPersonalDashboard'
    ];
    
    dashboards.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

// Load Driver Personal Data
async function loadDriverPersonalData() {
    try {
        console.log('🔄 Loading driver personal data...');
        
        // Mock driver data (in real app, would come from API with current user's ID)
        currentDriverPersonalData = {
            id: 1,
            name: 'Kofi Mensah',
            firstName: 'Kofi',
            lastName: 'Mensah',
            email: 'kofi.mensah@ucc.edu',
            phone: '+233123456789',
            licenseNumber: 'DL123456',
            vehicleNumber: 'UCC-001',
            currentAssignment: {
                shuttleId: 1,
                shuttleName: 'Library Shuttle',
                route: 'Main Campus → Library → Science Block',
                shiftStart: '08:00',
                shiftEnd: '16:00',
                status: 'active'
            },
            performance: {
                tripsToday: 8,
                totalTrips: 156,
                passengersToday: 45,
                averageResponseTime: 5,
                rating: 4.8
            },
            shifts: [
                {
                    date: new Date().toISOString().split('T')[0],
                    startTime: '08:00',
                    endTime: '16:00',
                    shuttle: 'Library Shuttle',
                    status: 'active'
                },
                {
                    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                    startTime: '08:00',
                    endTime: '16:00',
                    shuttle: 'Science Shuttle',
                    status: 'scheduled'
                }
            ]
        };
        
        updateDriverPersonalDashboard();
        
    } catch (error) {
        console.error('❌ Error loading driver personal data:', error);
        showNotification('Failed to load driver dashboard', 'error');
    }
}

// Load Student Personal Data
async function loadStudentPersonalData() {
    try {
        console.log('🔄 Loading student personal data...');
        
        // Mock student data
        currentStudentPersonalData = {
            id: 2,
            name: 'Ama Asante',
            firstName: 'Ama',
            lastName: 'Asante',
            email: 'ama.asante@ucc.edu',
            phone: '+233123456790',
            studentId: 'STU2024001',
            location: {
                campus: 'Main Campus',
                building: 'Library',
                room: '312',
                lastUpdate: new Date().toISOString()
            },
            trips: [
                {
                    id: 1,
                    pickupLocation: 'Main Campus',
                    destination: 'Library',
                    status: 'completed',
                    requestedAt: new Date(Date.now() - 3600000).toISOString(),
                    completedAt: new Date(Date.now() - 1800000).toISOString(),
                    driver: 'Kofi Mensah',
                    shuttle: 'Library Shuttle',
                    duration: '12 min'
                },
                {
                    id: 2,
                    pickupLocation: 'Library',
                    destination: 'Hostel A',
                    status: 'active',
                    requestedAt: new Date(Date.now() - 7200000).toISOString(),
                    estimatedArrival: new Date(Date.now() + 600000).toISOString(),
                    driver: 'Ama Asante',
                    shuttle: 'Hostel Shuttle',
                    eta: '5 min'
                }
            ],
            notifications: [
                {
                    id: 1,
                    type: 'trip_completed',
                    message: 'Your trip to Library has been completed',
                    timestamp: new Date(Date.now() - 1800000).toISOString(),
                    read: false
                },
                {
                    id: 2,
                    type: 'shuttle_arriving',
                    message: 'Your shuttle to Hostel A is arriving in 5 minutes',
                    timestamp: new Date(Date.now() - 300000).toISOString(),
                    read: false
                }
            ]
        };
        
        updateStudentPersonalDashboard();
        
    } catch (error) {
        console.error('❌ Error loading student personal data:', error);
        showNotification('Failed to load student dashboard', 'error');
    }
}

// Update Driver Personal Dashboard
function updateDriverPersonalDashboard() {
    if (!currentDriverPersonalData) return;
    
    // Update driver name
    updateElement('driverPersonalName', currentDriverPersonalData.name);
    updateElement('driverPersonalStatus', '🟢 On Duty - Active');
    updateElement('driverDutyIndicator', currentDriverPersonalData.currentAssignment.status === 'active' ? 'On Duty' : 'Off Duty');
    
    // Update duty indicator
    const dutyDot = document.querySelector('.duty-dot');
    const dutyText = document.querySelector('.duty-text');
    if (dutyDot && dutyText) {
        if (currentDriverPersonalData.currentAssignment.status === 'active') {
            dutyDot.className = 'duty-dot active';
            dutyText.textContent = 'On Duty';
        } else {
            dutyDot.className = 'duty-dot inactive';
            dutyText.textContent = 'Off Duty';
        }
    }
    
    // Update assignment details
    updateElement('assignedShuttle', currentDriverPersonalData.currentAssignment.shuttleName);
    updateElement('assignedRoute', currentDriverPersonalData.currentAssignment.route);
    updateElement('assignedPlate', currentDriverPersonalData.vehicleNumber);
    updateElement('shiftTime', `${currentDriverPersonalData.currentAssignment.shiftStart} - ${currentDriverPersonalData.currentAssignment.shiftEnd}`);
    
    // Update performance metrics
    updateElement('tripsCompleted', currentDriverPersonalData.performance.tripsToday);
    updateElement('passengersServed', currentDriverPersonalData.performance.passengersToday);
    updateElement('avgResponseTime', `${currentDriverPersonalData.performance.averageResponseTime} min`);
    updateElement('driverRating', currentDriverPersonalData.performance.rating.toFixed(1));
    
    // Update rating stars
    updateRatingStars(currentDriverPersonalData.performance.rating);
    
    // Update shifts list
    updateDriverShiftsList();
    
    // Update recent activity
    updateDriverActivityList();
}

// Update Student Personal Dashboard
function updateStudentPersonalDashboard() {
    if (!currentStudentPersonalData) return;
    
    // Update student name
    updateElement('studentPersonalName', currentStudentPersonalData.name);
    updateElement('studentPersonalStatus', '🎓 Ready to Travel');
    updateElement('studentLocationStatus', '📍 Main Campus - Library');
    
    // Update active shuttles
    updateActiveShuttlesList();
    
    // Update trip history
    updateTripHistoryList();
    
    // Update notifications
    updateStudentNotificationsList();
}

// Update Rating Stars
function updateRatingStars(rating) {
    const starsElement = document.getElementById('ratingStars');
    if (!starsElement) return;
    
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(rating);
    
    let starsHtml = '';
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsHtml += '⭐';
        } else if (i === fullStars && halfStar) {
            starsHtml += '⭐';
        } else {
            starsHtml += '☆';
        }
    }
    
    starsElement.textContent = starsHtml;
}

// Update Driver Shifts List
function updateDriverShiftsList() {
    const shiftsList = document.getElementById('driverShiftsList');
    if (!shiftsList || !currentDriverPersonalData) return;
    
    if (currentDriverPersonalData.shifts.length === 0) {
        shiftsList.innerHTML = `
            <div class="no-shifts-message">
                <div>📭 No shifts scheduled</div>
                <div>Contact your admin for upcoming assignments</div>
            </div>
        `;
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    shiftsList.innerHTML = currentDriverPersonalData.shifts.map(shift => {
        const shiftDate = new Date(shift.date + 'T00:00:00');
        const isToday = shift.date === today;
        const isPast = shiftDate < new Date(today + 'T23:59:59');
        
        return `
            <div class="shift-item ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
                <div class="shift-info">
                    <div class="shift-date">${formatDate(shift.date)}</div>
                    <div class="shift-details">
                        <div>${shift.shuttle}</div>
                        <div>${shift.startTime} - ${shift.endTime}</div>
                    </div>
                </div>
                <div class="shift-status ${shift.status}">
                    ${shift.status === 'active' ? '🟢 Active' : shift.status === 'completed' ? '✅ Completed' : '📅 Scheduled'}
                </div>
            </div>
        `;
    }).join('');
}

// Update Driver Activity List
function updateDriverActivityList() {
    const activityList = document.getElementById('driverActivityList');
    if (!activityList) return;
    
    // Mock activity data
    const activities = [
        {
            id: 1,
            type: 'trip',
            message: 'Completed trip from Main Campus to Library',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            status: 'completed'
        },
        {
            id: 2,
            type: 'fuel',
            message: 'Refueled shuttle - Level: 85%',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'info'
        },
        {
            id: 3,
            type: 'maintenance',
            message: 'Vehicle inspection completed',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            status: 'success'
        }
    ];
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item ${activity.status}">
                <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                <div class="activity-content">
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${formatTime(activity.timestamp)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Get Activity Icon
function getActivityIcon(type) {
    const icons = {
        trip: '🚌',
        fuel: '⛽',
        maintenance: '🔧',
        incident: '⚠️',
        message: '📧'
    };
    return icons[type] || '📝';
}

// Update Active Shuttles List
function updateActiveShuttlesList() {
    const shuttlesGrid = document.getElementById('activeShuttlesGrid');
    if (!shuttlesGrid) return;
    
    // Mock shuttle data with real-time positions
    const shuttles = [
        {
            id: 1,
            name: 'Library Shuttle',
            licensePlate: 'UCC-101',
            status: 'active',
            location: { lat: 5.6398, lng: -0.0830 },
            driver: 'Kofi Mensah',
            capacity: 40,
            passengers: 28,
            eta: '3 min',
            distance: '0.5 km'
        },
        {
            id: 2,
            name: 'Hostel Shuttle',
            licensePlate: 'UCC-102',
            status: 'delayed',
            location: { lat: 5.6400, lng: -0.0840 },
            driver: 'Ama Asante',
            capacity: 40,
            passengers: 32,
            eta: '8 min',
            distance: '1.2 km'
        }
    ];
    
    shuttlesGrid.innerHTML = shuttles.map(shuttle => `
        <div class="shuttle-card ${shuttle.status}">
                <div class="shuttle-header">
                    <h4>🚌 ${shuttle.name}</h4>
                    <div class="shuttle-status">${getShuttleStatusText(shuttle.status)}</div>
                </div>
                <div class="shuttle-details">
                    <div class="shuttle-info">
                        <div class="info-label">Driver:</div>
                        <div class="info-value">${shuttle.driver}</div>
                    </div>
                    <div class="shuttle-info">
                        <div class="info-label">Capacity:</div>
                        <div class="info-value">${shuttle.passengers}/${shuttle.capacity}</div>
                    </div>
                    <div class="shuttle-info">
                        <div class="info-label">ETA:</div>
                        <div class="info-value">${shuttle.eta}</div>
                    </div>
                    <div class="shuttle-info">
                        <div class="info-label">Distance:</div>
                        <div class="info-value">${shuttle.distance}</div>
                    </div>
                </div>
                <div class="shuttle-actions">
                    <button class="shuttle-btn" onclick="requestShuttle(${shuttle.id})">Request</button>
                    <button class="shuttle-btn" onclick="trackShuttle(${shuttle.id})">Track</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Get Shuttle Status Text
function getShuttleStatusText(status) {
    const statusTexts = {
        active: '🟢 Active',
        delayed: '🟡 Delayed',
        offline: '🔴 Offline',
        maintenance: '🔧 Maintenance'
    };
    return statusTexts[status] || '❓ Unknown';
}

// Dashboard Action Functions
function startShift() {
    console.log('▶️ Starting shift...');
    if (currentDriverPersonalData) {
        // Update status to active
        currentDriverPersonalData.currentAssignment.status = 'active';
        updateDriverPersonalDashboard();
        showNotification('Shift started successfully', 'success');
    }
}

function endShift() {
    console.log('⏹️ Ending shift...');
    if (currentDriverPersonalData) {
        currentDriverPersonalData.currentAssignment.status = 'completed';
        updateDriverPersonalDashboard();
        showNotification('Shift ended successfully', 'success');
    }
}

function reportIncident() {
    console.log('⚠️ Reporting incident...');
    showNotification('Incident report form coming soon!', 'info');
}

function refreshDriverDashboard() {
    console.log('🔄 Refreshing driver dashboard...');
    loadDriverPersonalData();
    showNotification('Driver dashboard refreshed', 'success');
}

// Student Dashboard Functions
function requestShuttle() {
    console.log('🚌 Requesting shuttle...');
    showNotification('Shuttle request form opening...', 'info');
}

function trackShuttle(shuttleId) {
    console.log('📍 Tracking shuttle:', shuttleId);
    showNotification(`Tracking shuttle #${shuttleId}`, 'info');
}

function viewTripHistory() {
    console.log('📜 Viewing trip history...');
    showNotification('Trip history view coming soon!', 'info');
}

function refreshStudentDashboard() {
    console.log('🔄 Refreshing student dashboard...');
    loadStudentPersonalData();
    showNotification('Student dashboard refreshed', 'success');
}

// Quick Request Functions
function submitQuickRequest() {
    const pickupLocation = document.getElementById('quickPickupLocation')?.value;
    const destination = document.getElementById('quickDestination')?.value;
    const priority = document.getElementById('quickPriority')?.value;
    
    if (pickupLocation && destination) {
        console.log('🚌 Submitting quick request:', { pickupLocation, destination, priority });
        showNotification('Shuttle request submitted successfully!', 'success');
        
        // Clear form
        document.getElementById('quickPickupLocation').value = '';
        document.getElementById('quickDestination').value = '';
        document.getElementById('quickPriority').value = 'normal';
    } else {
        showNotification('Please fill in all required fields', 'error');
    }
}

function emergencyRequest() {
    console.log('🚨 Emergency request initiated...');
    showNotification('🚨 Emergency request sent to all drivers!', 'error');
    
    // In real app, this would notify all nearby drivers
    if (typeof socket !== 'undefined') {
        socket.emit('emergency-request', {
            studentId: currentStudentPersonalData?.id,
            location: currentStudentPersonalData?.location,
            timestamp: new Date().toISOString()
        });
    }
}

// Socket.IO Real-time Updates for Personal Dashboards
if (typeof socket !== 'undefined') {
    socket.on('driver-location-update', function(data) {
        console.log('📍 Driver location update:', data);
        if (currentDriverPersonalData && currentDriverPersonalData.id === data.driverId) {
            // Update personal dashboard if it's the current driver
            updateDriverPersonalDashboard();
        }
    });
    
    socket.on('shuttle-arrival-notification', function(data) {
        console.log('🚌 Shuttle arrival notification:', data);
        if (currentStudentPersonalData && data.studentIds.includes(currentStudentPersonalData.id)) {
            updateStudentPersonalDashboard();
            showNotification(`Your shuttle is arriving in ${data.eta} minutes!`, 'success');
        }
    });
    
    socket.on('emergency-broadcast', function(data) {
        console.log('🚨 Emergency broadcast received:', data);
        if (currentDriverPersonalData) {
            updateDriverPersonalDashboard();
            showNotification('🚨 Emergency alert received!', 'error');
        }
    });
}

// Socket.IO Real-time Driver Updates
if (typeof socket !== 'undefined') {
    socket.on('driver-profile-updated', function(data) {
        console.log('🔔 Driver profile updated:', data);
        
        // Update driver in local data
        const driverIndex = driverDashboardData.findIndex(d => d.id === data.driverId);
        if (driverIndex !== -1) {
            Object.assign(driverDashboardData[driverIndex].profile, data.updates);
            renderDriverTable();
            updateDriverAnalytics();
            showNotification(`Driver profile updated: ${driverDashboardData[driverIndex].profile.name}`, 'success');
        }
    });
    
    socket.on('driver-status-updated', function(data) {
        console.log('🔔 Driver status updated:', data);
        
        // Update driver status in local data
        const driverIndex = driverDashboardData.findIndex(d => d.id === data.driverId);
        if (driverIndex !== -1) {
            driverDashboardData[driverIndex].currentStatus.dutyStatus = data.status === 'active' ? 'on-duty' : 'off-duty';
            renderDriverTable();
            updateDriverOverviewStats();
            showNotification(`Driver status updated: ${driverDashboardData[driverIndex].profile.name}`, 'success');
        }
    });
    
    socket.on('driver-assigned', function(data) {
        console.log('🔔 Driver assigned:', data);
        
        // Refresh dashboard to show new assignment
        loadDriverDashboard();
        showNotification('New driver assignment created', 'success');
    });
    
    socket.on('driver-location-batch', function(data) {
        console.log('📍 Driver location batch update:', data);
        
        // Update driver locations in local data
        data.drivers.forEach(updatedDriver => {
            const driverIndex = driverDashboardData.findIndex(d => d.id === updatedDriver.id);
            if (driverIndex !== -1 && updatedDriver.location) {
                driverDashboardData[driverIndex].location = updatedDriver.location;
                // Could update map or location display here
            }
        });
    });
}

// Send Email to Driver
function sendEmailToDriver(email) {
    console.log('📧 Sending email to driver:', email);
    window.location.href = `mailto:${email}`;
}
