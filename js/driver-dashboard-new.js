// UCC Shuttle Tracker - Driver Dashboard (Redesigned)
let driverData = null;
let socket = null;
let currentMap = null;
let driverMarker = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚍 Driver Dashboard initialized');
    
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded - waiting...');
        // Wait for Leaflet to load
        const checkLeaflet = setInterval(() => {
            if (typeof L !== 'undefined') {
                console.log('✅ Leaflet library loaded');
                clearInterval(checkLeaflet);
            }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(() => clearInterval(checkLeaflet), 5000);
    } else {
        console.log('✅ Leaflet library available');
    }
    
    loadDriverData();
    setupEventListeners();
    initializeSocket();
});

function loadDriverData() {
    const userData = localStorage.getItem('ucc_user');
    if (userData) {
        driverData = JSON.parse(userData);
        const driverNameEl = document.getElementById('driverName');
        const userNameEl = document.getElementById('userName');
        if (driverNameEl) driverNameEl.textContent = driverData.name || 'Driver';
        if (userNameEl) userNameEl.textContent = driverData.name || 'Driver';
    } else {
        // Set default values if no user data
        const driverNameEl = document.getElementById('driverName');
        const userNameEl = document.getElementById('userName');
        if (driverNameEl) driverNameEl.textContent = 'Driver';
        if (userNameEl) userNameEl.textContent = 'Driver';
    }
}

function setupEventListeners() {
    console.log('🎯 Setting up event listeners...');
    
    // Navigation - Handle both nav-item and anchor clicks
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`  Found ${navItems.length} navigation items`);
    
    navItems.forEach((item, index) => {
        const section = item.getAttribute('data-section');
        console.log(`  Nav ${index + 1}: ${section}`);
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const section = this.getAttribute('data-section');
            console.log('🖱️ Nav clicked:', section);
            navigateToSection(section);
        });
        
        // Also handle anchor clicks inside nav items
        const anchor = item.querySelector('a');
        if (anchor) {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const section = this.closest('.nav-item').getAttribute('data-section');
                console.log('🖱️ Nav anchor clicked:', section);
                navigateToSection(section);
            });
        }
    });

    // Action cards - Direct event listeners with ETA functionality
    document.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const cardId = this.id;
            const cardText = this.querySelector('h3').textContent;
            console.log('Action card clicked:', cardText, cardId);
            
            // Add visual feedback
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            // Handle ETA-specific actions
            if (cardId === 'startRouteCard') {
                handleStartRoute();
            } else if (cardId === 'etaStatusCard') {
                handleETAStatus();
            } else if (cardId === 'stopRouteCard') {
                handleStopRoute();
            } else if (cardText.includes('Emergency')) {
                if (confirm('Send emergency alert to dispatch?')) {
                    alert('Emergency alert sent!');
                }
            }
        });
        
        // Add hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // All buttons - Force responsiveness
    document.querySelectorAll('button, .btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            console.log('Button clicked:', this.textContent || this.className);
            // Add visual feedback
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 100);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleLogout();
        });
        console.log('Logout button attached');
    }

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            navigateToSection('home');
        });
    });

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Map control buttons
    const refreshMapBtn = document.getElementById('refreshMapBtn');
    if (refreshMapBtn) {
        refreshMapBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Refresh map clicked');
            if (window.campusMap) {
                window.campusMap.invalidateSize();
                loadShuttleData();
            }
        });
    }

    // Apply filter button
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            applyCompletedTripsFilter();
        });
    }

    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    console.log('Event listeners setup complete');
}

function initializeSocket() {
    const token = localStorage.getItem('ucc_token');
    if (!token) {
        console.log('No token found, skipping socket connection');
        return;
    }

    // Skip socket connection for now to avoid CSP issues
    console.log('Socket connection disabled for standalone mode');
    return;

    /*
    socket = io('http://localhost:3001', {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => console.log('✅ Connected to server'));
    socket.on('disconnect', () => console.log('❌ Disconnected from server'));
    */
}

function navigateToSection(section) {
    console.log('🔄 Navigating to section:', section);
    
    // Hide all sections
    const sections = ['homeSection', 'viewMapSection', 'startTripSection', 'activeRouteSection', 'completedTripsSection', 'notificationsSection', 'supportSection', 'profileSection'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            console.log(`  ❌ Hiding: ${id}`);
        }
    });

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`[data-section="${section}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
        console.log('  ✅ Active nav updated:', section);
    }

    // Show selected section
    const sectionMap = {
        'home': 'homeSection',
        'active-route': 'activeRouteSection',
        'view-map': 'viewMapSection',
        'completed-trips': 'completedTripsSection',
        'notifications': 'notificationsSection',
        'support': 'supportSection',
        'profile': 'profileSection'
    };

    const targetSectionId = sectionMap[section];
    const targetSection = document.getElementById(targetSectionId);
    
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.style.visibility = 'visible';
        targetSection.style.opacity = '1';
        
        // Force a reflow to ensure DOM is updated
        targetSection.offsetHeight;
        
        console.log('  ✅ Section shown:', targetSectionId);
        
        // Load section content after a brief delay
        setTimeout(() => {
            loadSectionContent(section);
        }, 100);
    } else {
        console.error('  ❌ Target section not found:', targetSectionId);
    }
}

// Make navigateToSection globally accessible
window.navigateToSection = navigateToSection;

function loadSectionContent(section) {
    switch(section) {
        case 'home':
            loadHomeContent();
            break;
        case 'view-map':
            setTimeout(() => initializeDriverMap(), 100);
            break;
        case 'active-route':
            loadActiveRouteContent();
            break;
        case 'completed-trips':
            loadCompletedTripsContent();
            break;
        case 'notifications':
            loadNotificationsContent();
            break;
        case 'profile':
            loadProfileContent();
            break;
    }
}





function initializeDriverMap() {
    console.log('🗺️ Initializing real OpenStreetMap for driver...');
    
    const mapContainer = document.getElementById('driverMap');
    if (!mapContainer) {
        console.error('Driver map container not found');
        return;
    }
    
    // Clear existing map
    mapContainer.innerHTML = '';
    
    // Create real OpenStreetMap
    const map = L.map('driverMap').setView([5.1044, -1.1947], 15);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add campus locations
    const locations = [
        {lat: 5.1044, lng: -1.1947, name: 'UCC Main Gate', icon: '🚪'},
        {lat: 5.1048, lng: -1.1943, name: 'UCC Library', icon: '📚'},
        {lat: 5.1052, lng: -1.1939, name: 'Science Block', icon: '🔬'},
        {lat: 5.1056, lng: -1.1935, name: 'Hostel Area', icon: '🏠'}
    ];
    
    // Add route line
    const routeCoords = locations.map(loc => [loc.lat, loc.lng]);
    L.polyline(routeCoords, {
        color: '#ff6b35',
        weight: 4,
        opacity: 0.8,
        dashArray: '10,5'
    }).addTo(map);
    
    // Add CSS for pulse animation
    if (!document.getElementById('mapAnimationStyles')) {
        const style = document.createElement('style');
        style.id = 'mapAnimationStyles';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Get real GPS location and track it
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Add your real location marker with blinking animation
                const yourLocation = L.marker([lat, lng], {
                    icon: L.divIcon({
                        html: '<div style="background:#ff6b35;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);animation:pulse 1.5s infinite;">🚌</div>',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    })
                }).addTo(map);
                
                yourLocation.bindPopup('<b>🚌 YOUR SHUTTLE</b><br>Status: Online<br>Real GPS Location');
                
                // Center map on your real location
                map.setView([lat, lng], 16);
                
                // Start continuous location tracking
                navigator.geolocation.watchPosition(
                    (pos) => {
                        const newLat = pos.coords.latitude;
                        const newLng = pos.coords.longitude;
                        yourLocation.setLatLng([newLat, newLng]);
                        console.log('📍 Driver location updated:', newLat, newLng);
                    },
                    (error) => console.log('Location tracking error:', error),
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            },
            (error) => {
                console.log('Location access denied, using default location');
                // Fallback to default campus location
                const yourShuttle = L.marker([5.1046, -1.1945], {
                    icon: L.divIcon({
                        html: '<div style="background:#ff6b35;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);animation:pulse 1.5s infinite;">🚌</div>',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    })
                }).addTo(map);
                
                yourShuttle.bindPopup('<b>🚌 YOUR SHUTTLE</b><br>Status: Online<br>Default Location');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        console.log('Geolocation not supported');
    }
    
    console.log('✅ Real OpenStreetMap with GPS tracking loaded for driver');
}

// ============= ETA SYSTEM FUNCTIONS =============

// Start Route with ETA tracking
async function handleStartRoute() {
    console.log('🎯 Starting route with ETA tracking...');
    
    // Define campus stops for the route
    const routeStops = [
        { name: 'UCC Main Gate', latitude: 5.1044, longitude: -1.1947 },
        { name: 'UCC Library', latitude: 5.1048, longitude: -1.1943 },
        { name: 'Science Block', latitude: 5.1052, longitude: -1.1939 },
        { name: 'Hostel Area', latitude: 5.1056, longitude: -1.1935 }
    ];
    
    const token = localStorage.getItem('ucc_token');
    if (!token) {
        alert('Please login first');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3001/api/driver/start-route', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ route_stops: routeStops })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`🎯 Route started! ETA tracking is now active for ${data.stops_count} stops.`);
            
            // Start location tracking with ETA
            startLocationTracking();
            
            // Show ETA status panel
            const etaPanel = document.getElementById('etaStatusPanel');
            if (etaPanel) etaPanel.style.display = 'block';
            
            // Update UI
            updateNotification('Route started! Students will get ETA alerts.', 'success');
        } else {
            alert('Error starting route: ' + data.message);
        }
    } catch (error) {
        console.error('Start route error:', error);
        alert('Error starting route. Please try again.');
    }
}

// Get ETA Status
async function handleETAStatus() {
    console.log('⏱️ Getting ETA status...');
    
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:3001/api/driver/eta-status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.etas) {
            displayETAStatus(data.etas);
        } else {
            alert('No ETA data available. Start a route first.');
        }
    } catch (error) {
        console.error('ETA status error:', error);
        alert('Error getting ETA status.');
    }
}

// Stop Route
async function handleStopRoute() {
    console.log('⏹️ Stopping route...');
    
    if (!confirm('Stop route and disable ETA tracking?')) return;
    
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:3001/api/driver/stop-route', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('⏹️ Route stopped. ETA tracking disabled.');
            
            // Stop location tracking
            if (window.locationWatcher) {
                navigator.geolocation.clearWatch(window.locationWatcher);
                window.locationWatcher = null;
            }
            
            // Hide ETA panel
            const etaPanel = document.getElementById('etaStatusPanel');
            if (etaPanel) etaPanel.style.display = 'none';
            
            updateNotification('Route stopped. ETA tracking disabled.', 'info');
        } else {
            alert('Error stopping route: ' + data.message);
        }
    } catch (error) {
        console.error('Stop route error:', error);
        alert('Error stopping route.');
    }
}

// Start GPS location tracking with ETA updates
function startLocationTracking() {
    if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        return;
    }
    
    console.log('📍 Starting GPS tracking with ETA updates...');
    
    window.locationWatcher = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Update location with ETA calculation
            await updateLocationWithETA(latitude, longitude);
        },
        (error) => {
            console.error('Location tracking error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        }
    );
}

// Update location with ETA calculation
async function updateLocationWithETA(latitude, longitude) {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:3001/api/driver/location-eta', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude, longitude })
        });
        
        const data = await response.json();
        
        if (data.success && data.alerts_sent > 0) {
            // Show notification about alerts sent
            updateNotification(
                `📢 ${data.alerts_sent} ETA alert${data.alerts_sent > 1 ? 's' : ''} sent to students!`,
                'success'
            );
            
            // Display alert details
            data.alerts.forEach(alert => {
                addLiveNotification(
                    `🎯 ${alert.students_notified} students notified at ${alert.location} - ETA ${alert.eta_minutes} min`
                );
            });
        }
    } catch (error) {
        console.error('Location ETA update error:', error);
    }
}

// Display ETA status
function displayETAStatus(etas) {
    const etaPanel = document.getElementById('etaStatusPanel');
    const etaList = document.getElementById('etaStopsList');
    
    if (!etaPanel || !etaList) return;
    
    etaPanel.style.display = 'block';
    
    if (etas.length === 0) {
        etaList.innerHTML = '<div class="no-eta">No route stops found. Start a route first.</div>';
        return;
    }
    
    etaList.innerHTML = etas.map(eta => `
        <div class="eta-stop">
            <div class="stop-info">
                <div class="stop-name">📍 ${eta.stop_name}</div>
                <div class="stop-details">${eta.distance_km} km away</div>
            </div>
            <div class="eta-time">
                <div class="eta-minutes">${eta.eta_minutes}</div>
                <div class="eta-label">min</div>
            </div>
        </div>
    `).join('');
}

// Add live notification
function addLiveNotification(message) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    // Remove "no notifications" message
    const noNotifications = notificationList.querySelector('.no-notifications');
    if (noNotifications) noNotifications.remove();
    
    // Add new notification
    const notification = document.createElement('div');
    notification.className = 'live-notification';
    notification.innerHTML = `
        <div class="notification-content">${message}</div>
        <div class="notification-time">${new Date().toLocaleTimeString()}</div>
    `;
    
    notificationList.insertBefore(notification, notificationList.firstChild);
    
    // Keep only last 5 notifications
    const notifications = notificationList.querySelectorAll('.live-notification');
    if (notifications.length > 5) {
        notifications[notifications.length - 1].remove();
    }
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 30000);
}

// Update notification helper
function updateNotification(message, type = 'info') {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Listen for real-time ETA notifications
if (typeof io !== 'undefined') {
    const socket = io();
    
    socket.on(`driver_notification_${driverData?.id}`, (data) => {
        if (data.type === 'eta_sent') {
            addLiveNotification(data.message);
            updateNotification(`📢 ${data.students_count} students notified!`, 'success');
        }
    });
}

console.log('🎯 ETA system functions loaded');

// ============= END ETA SYSTEM =============

async function loadHomeContent() {
    // Load profile data for home section too
    await loadProfileContent();
    
    const token = localStorage.getItem('ucc_token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:3001/api/driver/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.profile) {
            // Update header name
            const driverNameEl = document.getElementById('driverName');
            const userNameEl = document.getElementById('userName');
            if (driverNameEl) driverNameEl.textContent = data.profile.name || 'Driver';
            if (userNameEl) userNameEl.textContent = data.profile.name || 'Driver';
        }
    } catch (error) {
        console.error('Error loading home content:', error);
    }
}

function loadStartTripContent() {
    loadRoutes();
}

function showStartTripMap() {
    console.log('Loading enhanced map...');
    
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        return;
    }
    
    const mapEl = document.getElementById('campusMap');
    if (!mapEl) {
        console.error('Map element not found');
        return;
    }
    
    // Force the map container to be visible and have dimensions
    mapEl.style.display = 'block';
    mapEl.style.visibility = 'visible';
    mapEl.style.opacity = '1';
    mapEl.style.position = 'relative';
    mapEl.style.height = '600px';
    mapEl.style.width = '100%';
    
    // Check if map container is visible and has dimensions
    if (mapEl.offsetParent === null) {
        console.log('Map container not visible, retrying...');
        setTimeout(() => showStartTripMap(), 200);
        return;
    }
    
    // Show loading indicator
    const loadingEl = document.getElementById('mapLoading');
    if (loadingEl) loadingEl.style.display = 'block';
    
    // Clear any existing map
    if (window.campusMap) {
        window.campusMap.remove();
        window.campusMap = null;
    }
    
    // Clear existing shuttle markers
    window.shuttleMarkers = [];
    window.driverShuttleMarker = null;
    
    try {
        // Ensure map container has proper dimensions
        const rect = mapEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.log('Map container has no dimensions, retrying...');
            setTimeout(() => showStartTripMap(), 200);
            return;
        }
        
        console.log('Map dimensions:', rect);
        
        // Initialize map centered on UCC campus
        window.campusMap = L.map('campusMap').setView([5.1044, -1.1947], 15);
        
        // Add OpenStreetMap tiles
        window.currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(window.campusMap);
        
        // Add map controls
        addMapControls();
        
        // UCC Campus locations
        const locations = [
            {lat: 5.1044, lng: -1.1947, name: 'Main Gate', type: 'gate'},
            {lat: 5.1048, lng: -1.1943, name: 'Central Library', type: 'academic'},
            {lat: 5.1052, lng: -1.1939, name: 'Science Complex', type: 'academic'},
            {lat: 5.1056, lng: -1.1935, name: 'Hostel A', type: 'hostel'},
            {lat: 5.1040, lng: -1.1950, name: 'Hostel B', type: 'hostel'},
            {lat: 5.1060, lng: -1.1930, name: 'Sports Complex', type: 'facility'},
            {lat: 5.1035, lng: -1.1955, name: 'Medical Center', type: 'facility'},
            {lat: 5.1065, lng: -1.1925, name: 'Engineering Block', type: 'academic'}
        ];
        
        // Add markers for each location
        locations.forEach(location => {
            const color = location.type === 'gate' ? '#ff6b35' : 
                         location.type === 'academic' ? '#2196f3' :
                         location.type === 'hostel' ? '#4caf50' : '#ff9800';
            
            L.circleMarker([location.lat, location.lng], {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 2,
                fillOpacity: 0.8
            }).addTo(window.campusMap)
              .bindPopup(`<b>${location.name}</b><br>Type: ${location.type}`);
        });
        
        // Add route line connecting main locations
        const routeCoords = locations.slice(0, 4).map(loc => [loc.lat, loc.lng]);
        L.polyline(routeCoords, {
            color: '#ff6b35',
            weight: 4,
            opacity: 0.7
        }).addTo(window.campusMap);
        
        // Load real-time shuttle data
        loadShuttleData();
        
        // Load trip progress if active
        loadTripProgress();
        
        // Try to get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                L.marker([userLat, userLng], {
                    icon: L.divIcon({
                        html: '<div style="background:#4caf50;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚌</div>',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                }).addTo(window.campusMap)
                  .bindPopup('Your Current Location');
                
                // Center map on user location if within reasonable distance
                const distance = window.campusMap.distance([userLat, userLng], [5.1044, -1.1947]);
                if (distance < 10000) { // Within 10km
                    window.campusMap.setView([userLat, userLng], 16);
                }
            }, error => {
                console.log('Location access denied or unavailable');
            });
        }
        
        // Setup Socket.IO listeners for real-time updates
        setupMapSocketListeners();
        
        // Hide loading indicator
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Update map status
        updateMapStatus('Live');
        
        console.log('✅ Enhanced map loaded successfully');
    } catch(e) {
        console.error('Map error:', e);
        if (loadingEl) loadingEl.style.display = 'none';
        updateMapStatus('Error');
        
        // Fallback: show simple map without features
        setTimeout(() => {
            try {
                if (mapEl && !window.campusMap) {
                    console.log('Attempting fallback map initialization...');
                    mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f0f0f0;border-radius:12px;"><div><h3>🗺️ UCC Campus Map</h3><p>Map features loading...</p><p style="font-size:0.9rem;color:#666;">If this persists, please refresh the page</p></div></div>';
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }, 2000);
    }
}

function loadActiveRouteContent() {
    const pickupPoints = [
        {lat: 5.1044, lng: -1.1947, name: 'Main Gate', type: 'pickup'},
        {lat: 5.1048, lng: -1.1943, name: 'Library', type: 'dropoff'},
        {lat: 5.1052, lng: -1.1939, name: 'Science Block', type: 'pickup'},
        {lat: 5.1056, lng: -1.1935, name: 'Hostel A', type: 'dropoff'}
    ];
    
    const pickupList = document.getElementById('pickupList');
    if (pickupList) {
        pickupList.innerHTML = pickupPoints.map(p => `<li><i class="fas fa-map-marker-alt"></i> ${p.name} (${p.type})</li>`).join('');
    }
}

function showActiveRouteMap() {
    console.log('View Active Map button clicked');
    
    if (typeof L === 'undefined') {
        alert('Map library not loaded. Please refresh the page.');
        return;
    }
    
    // First navigate to active-route section if not already there
    navigateToSection('active-route');
    
    // Wait for section to load, then show map
    setTimeout(() => {
        const mapEl = document.getElementById('activeRouteMap');
        
        if (!mapEl) {
            console.error('Map element not found');
            return;
        }
        
        // Show and size map first
        mapEl.style.display = 'block';
        mapEl.style.height = '500px';
        mapEl.style.width = '100%';
        
        setTimeout(() => {
            if (window.activeRouteMap) {
                window.activeRouteMap.remove();
                window.activeRouteMap = null;
            }
            
            try {
                window.activeRouteMap = L.map('activeRouteMap').setView([5.1044, -1.1947], 14);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(window.activeRouteMap);
                
                const pickupPoints = [
                    {lat: 5.1044, lng: -1.1947, name: 'Main Gate', type: 'pickup'},
                    {lat: 5.1048, lng: -1.1943, name: 'Library', type: 'dropoff'},
                    {lat: 5.1052, lng: -1.1939, name: 'Science Block', type: 'pickup'},
                    {lat: 5.1056, lng: -1.1935, name: 'Hostel A', type: 'dropoff'}
                ];
                
                pickupPoints.forEach(point => {
                    const color = point.type === 'pickup' ? '#4caf50' : '#ff6b35';
                    L.circleMarker([point.lat, point.lng], {radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.8})
                        .addTo(window.activeRouteMap).bindPopup(`${point.name} - ${point.type}`);
                });
                
                L.polyline(pickupPoints.map(p => [p.lat, p.lng]), {color: '#2196f3', weight: 4, dashArray: '10, 5'}).addTo(window.activeRouteMap);
                
                startLiveTracking();
                console.log('✅ Active Route map loaded');
            } catch(e) {
                console.error('Map error:', e);
                alert('Error loading map: ' + e.message);
            }
        }, 100);
    }, 200);
}

function startLiveTracking() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
            const { latitude, longitude } = pos.coords;
            
            if (window.activeRouteMap && window.driverMarker) {
                window.driverMarker.setLatLng([latitude, longitude]);
                window.activeRouteMap.setView([latitude, longitude], 15);
            } else if (window.activeRouteMap) {
                window.driverMarker = L.marker([latitude, longitude], {
                    icon: L.divIcon({
                        html: '<div style="background:#4caf50;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);animation:pulse 2s infinite;">🚌</div>',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    })
                }).addTo(window.activeRouteMap).bindPopup('Your Live Location');
                window.activeRouteMap.setView([latitude, longitude], 15);
            }
            
            if (socket && socket.connected) {
                socket.emit('location_update', { latitude, longitude, driverId: driverData?.id });
            }
        }, (error) => {
            console.error('Geolocation error:', error);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    }
}

async function loadCompletedTripsContent() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:3001/api/driver/trips/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.trips) {
            const tbody = document.getElementById('completedTripsBody');
            tbody.innerHTML = data.trips.map(trip => `
                <tr>
                    <td>${new Date(trip.created_at).toLocaleDateString()}</td>
                    <td>${trip.route || 'Campus Express'}</td>
                    <td>${trip.passengers || 0}</td>
                    <td>${trip.duration || '--'}</td>
                    <td><span class="badge ${trip.status}">${trip.status}</span></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading trips:', error);
    }
}

function loadNotificationsContent() {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = `
        <div class="notification-item unread">
            <i class="fas fa-info-circle"></i>
            <div>
                <h4>Route Change</h4>
                <p>Your route has been updated for tomorrow</p>
                <span class="time">2 hours ago</span>
            </div>
        </div>
        <div class="notification-item">
            <i class="fas fa-user"></i>
            <div>
                <h4>New Message</h4>
                <p>Admin sent you a message</p>
                <span class="time">5 hours ago</span>
            </div>
        </div>
    `;
}

async function loadProfileContent() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:3001/api/driver/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.profile) {
            // Update profile display elements
            const profileNameEl = document.getElementById('profileName');
            const profileIdEl = document.getElementById('profileId');
            const profileLicenseEl = document.getElementById('profileLicense');
            const profileShuttleEl = document.getElementById('profileShuttle');
            const profileRouteEl = document.getElementById('profileRoute');
            const tripStatusBadgeEl = document.getElementById('tripStatusBadge');
            
            if (profileNameEl) profileNameEl.textContent = data.profile.name || 'Unknown Driver';
            if (profileIdEl) profileIdEl.textContent = data.profile.id || 'N/A';
            if (profileLicenseEl) profileLicenseEl.textContent = data.profile.driver_license || 'Not Set';
            if (profileShuttleEl) profileShuttleEl.textContent = data.profile.assigned_shuttle || 'Not Assigned';
            if (profileRouteEl) profileRouteEl.textContent = data.profile.current_route || 'No Active Route';
            if (tripStatusBadgeEl) tripStatusBadgeEl.textContent = data.profile.trip_status || 'Idle';
            
            // Update edit form fields
            const editNameEl = document.getElementById('editName');
            const editPhoneEl = document.getElementById('editPhone');
            const editLicenseEl = document.getElementById('editLicense');
            
            if (editNameEl) editNameEl.value = data.profile.name || '';
            if (editPhoneEl) editPhoneEl.value = data.profile.phone || '';
            if (editLicenseEl) editLicenseEl.value = data.profile.driver_license || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Show error state
        const profileNameEl = document.getElementById('profileName');
        if (profileNameEl) profileNameEl.textContent = 'Error Loading Profile';
    }
}

async function loadRoutes() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:3001/api/driver/routes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.routes) {
            const select = document.getElementById('routeSelect');
            select.innerHTML = '<option value="">Choose a route...</option>' + 
                data.routes.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading routes:', error);
    }
}

function handleBeginTrip() {
    const routeSelect = document.getElementById('routeSelect');
    if (!routeSelect.value) {
        alert('Please select a route first');
        return;
    }
    alert('Trip started! Track your progress in Active Route section.');
    navigateToSection('active-route');
}

function applyCompletedTripsFilter() {
    alert('Filter applied');
    loadCompletedTripsContent();
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const token = localStorage.getItem('ucc_token');
    
    const data = {
        name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value,
        driver_license: document.getElementById('editLicense').value
    };
    
    try {
        const response = await fetch('http://localhost:3001/api/driver/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        alert(result.message || 'Profile updated');
    } catch (error) {
        alert('Error updating profile');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const token = localStorage.getItem('ucc_token');
    
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    if (newPass !== confirmPass) {
        alert('Passwords do not match');
        return;
    }
    
    const data = {
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: newPass
    };
    
    try {
        const response = await fetch('http://localhost:3001/api/driver/change-password', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        alert(result.message || 'Password changed');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        alert('Error changing password');
    }
}

function handleLogout() {
    console.log('Logout clicked');
    if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        localStorage.clear();
        sessionStorage.clear();
        
        // Disconnect socket if connected
        if (socket && socket.connected) {
            socket.disconnect();
        }
        
        // Redirect to login page
        window.location.href = 'index.html';
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}



async function loadShuttleData() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        // Get all shuttles
        const response = await fetch('http://localhost:3001/api/shuttles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success && data.shuttles) {
            displayShuttlesOnMap(data.shuttles);
            updateShuttleList(data.shuttles);
            updateActiveShuttlesCount(data.shuttles.filter(s => s.status === 'available' || s.status === 'in_use').length);
        }
        
        // Get driver's assigned shuttle
        const driverResponse = await fetch('http://localhost:3001/api/driver/shuttle', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const driverData = await driverResponse.json();
        if (driverData.success && driverData.shuttle) {
            highlightDriverShuttle(driverData.shuttle);
            updateCurrentRoute(driverData.shuttle.route || 'Campus Express');
        }
        
    } catch (error) {
        console.error('Error loading shuttle data:', error);
        updateMapStatus('Connection Error');
    }
}

function displayShuttlesOnMap(shuttles) {
    shuttles.forEach(shuttle => {
        if (shuttle.latitude && shuttle.longitude) {
            const marker = createShuttleMarker(shuttle);
            marker.addTo(window.campusMap);
            window.shuttleMarkers.push(marker);
        }
    });
}

function createShuttleMarker(shuttle) {
    const color = shuttle.status === 'available' ? '#4caf50' :
                  shuttle.status === 'in_use' ? '#2196f3' :
                  shuttle.status === 'maintenance' ? '#ff9800' : '#9e9e9e';
    
    const icon = L.divIcon({
        html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚌</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: 'shuttle-marker'
    });
    
    const marker = L.marker([shuttle.latitude, shuttle.longitude], { icon });
    
    // Create detailed popup
    const popupContent = `
        <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">Shuttle ${shuttle.plate_number}</h4>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${color};">${shuttle.status}</span></p>
            <p style="margin: 5px 0;"><strong>Capacity:</strong> ${shuttle.capacity || 20} seats</p>
            <p style="margin: 5px 0;"><strong>Driver:</strong> ${shuttle.driver_name || 'Unassigned'}</p>
            <p style="margin: 5px 0;"><strong>Last Update:</strong> ${new Date(shuttle.last_location_update || Date.now()).toLocaleTimeString()}</p>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.shuttleData = shuttle;
    
    return marker;
}

function highlightDriverShuttle(shuttle) {
    // Find and highlight the driver's shuttle
    const driverMarker = window.shuttleMarkers.find(marker => 
        marker.shuttleData && marker.shuttleData.id === shuttle.id
    );
    
    if (driverMarker) {
        // Update icon to show it's the driver's shuttle
        const specialIcon = L.divIcon({
            html: '<div style="background:#ff6b35;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);animation:pulse 2s infinite;">🚌</div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            className: 'driver-shuttle-marker'
        });
        
        driverMarker.setIcon(specialIcon);
        window.driverShuttleMarker = driverMarker;
        
        // Update popup to indicate it's the driver's shuttle
        const popupContent = driverMarker.getPopup().getContent();
        const updatedContent = popupContent.replace(
            '<h4 style="margin: 0 0 10px 0; color: #333;">',
            '<h4 style="margin: 0 0 10px 0; color: #ff6b35;">📍 YOUR SHUTTLE - '
        );
        driverMarker.setPopupContent(updatedContent);
    }
}

function updateShuttleList(shuttles) {
    const shuttleList = document.getElementById('shuttleList');
    if (!shuttleList) return;
    
    const driverShuttleId = window.driverShuttleMarker?.shuttleData?.id;
    
    shuttleList.innerHTML = shuttles.map(shuttle => {
        const isDriverShuttle = shuttle.id === driverShuttleId;
        const statusClass = shuttle.status || 'unknown';
        
        return `
            <div class="shuttle-item ${isDriverShuttle ? 'your-shuttle' : ''}">
                <div class="shuttle-icon">🚌</div>
                <div class="shuttle-details">
                    <div class="shuttle-name">${shuttle.plate_number} ${isDriverShuttle ? '(You)' : ''}</div>
                    <div class="shuttle-status ${statusClass}">${shuttle.status || 'Unknown'}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateActiveShuttlesCount(count) {
    const countEl = document.getElementById('activeShuttlesCount');
    if (countEl) countEl.textContent = count;
}

function updateCurrentRoute(routeName) {
    const routeEl = document.getElementById('currentRouteName');
    if (routeEl) routeEl.textContent = routeName;
}

function updateMapStatus(status) {
    const statusEl = document.getElementById('mapStatus');
    if (statusEl) statusEl.textContent = status;
}

function setupMapSocketListeners() {
    if (!socket) return;
    
    // Listen for shuttle location updates
    socket.on('shuttle_location_update', (data) => {
        if (data.shuttleId && data.latitude && data.longitude) {
            updateShuttleLocation(data.shuttleId, data.latitude, data.longitude);
        }
    });
    
    // Listen for shuttle status changes
    socket.on('shuttle_status_update', (data) => {
        if (data.shuttleId && data.status) {
            updateShuttleStatus(data.shuttleId, data.status);
        }
    });
    
    // Listen for new shuttle assignments
    socket.on('driver_assignment_update', (data) => {
        if (data.driverId === driverData?.id && data.shuttle) {
            highlightDriverShuttle(data.shuttle);
            updateCurrentRoute(data.shuttle.route || 'Campus Express');
        }
    });
}

function updateShuttleLocation(shuttleId, latitude, longitude) {
    const marker = window.shuttleMarkers.find(m => 
        m.shuttleData && m.shuttleData.id === shuttleId
    );
    
    if (marker) {
        marker.setLatLng([latitude, longitude]);
        marker.shuttleData.latitude = latitude;
        marker.shuttleData.longitude = longitude;
        marker.shuttleData.last_location_update = new Date().toISOString();
        
        // Update popup content
        const popupContent = marker.getPopup().getContent();
        const updatedContent = popupContent.replace(
            /Last Update:.*?<\/p>/,
            `Last Update: ${new Date().toLocaleTimeString()}</p>`
        );
        marker.setPopupContent(updatedContent);
    }
}

function updateShuttleStatus(shuttleId, status) {
    const marker = window.shuttleMarkers.find(m => 
        m.shuttleData && m.shuttleData.id === shuttleId
    );
    
    if (marker) {
        marker.shuttleData.status = status;
        
        // Update marker color
        const color = status === 'available' ? '#4caf50' :
                      status === 'in_use' ? '#2196f3' :
                      status === 'maintenance' ? '#ff9800' : '#9e9e9e';
        
        const icon = L.divIcon({
            html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚌</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            className: 'shuttle-marker'
        });
        
        marker.setIcon(icon);
        
        // Update shuttle list
        const allShuttles = window.shuttleMarkers.map(m => m.shuttleData).filter(Boolean);
        updateShuttleList(allShuttles);
        updateActiveShuttlesCount(allShuttles.filter(s => s.status === 'available' || s.status === 'in_use').length);
    }
}

// Trip Progress Visualization
async function loadTripProgress() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:3001/api/driver/active-trip', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success && data.trip) {
            displayTripProgress(data.trip);
        }
    } catch (error) {
        console.error('Error loading trip progress:', error);
    }
}

function displayTripProgress(trip) {
    if (!window.campusMap) return;
    
    // Clear existing trip markers
    if (window.tripMarkers) {
        window.tripMarkers.forEach(marker => window.campusMap.removeLayer(marker));
    }
    window.tripMarkers = [];
    
    // Add pickup points
    if (trip.pickup_points && trip.pickup_points.length > 0) {
        trip.pickup_points.forEach((point, index) => {
            const isCompleted = point.status === 'completed';
            const isCurrent = point.status === 'current';
            
            const color = isCompleted ? '#4caf50' : 
                         isCurrent ? '#ff6b35' : '#9e9e9e';
            
            const icon = L.divIcon({
                html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                className: 'pickup-marker'
            });
            
            const marker = L.marker([point.latitude, point.longitude], { icon });
            
            const popupContent = `
                <div style="min-width: 180px;">
                    <h4 style="margin: 0 0 8px 0; color: #333;">Pickup Point ${index + 1}</h4>
                    <p style="margin: 4px 0;"><strong>Location:</strong> ${point.name}</p>
                    <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${color};">${point.status}</span></p>
                    <p style="margin: 4px 0;"><strong>Passengers:</strong> ${point.passengers || 0}</p>
                    ${point.estimated_arrival ? `<p style="margin: 4px 0;"><strong>ETA:</strong> ${point.estimated_arrival}</p>` : ''}
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.addTo(window.campusMap);
            window.tripMarkers.push(marker);
        });
        
        // Draw route connecting pickup points
        const routeCoords = trip.pickup_points.map(point => [point.latitude, point.longitude]);
        if (routeCoords.length > 1) {
            L.polyline(routeCoords, {
                color: '#ff6b35',
                weight: 3,
                opacity: 0.8,
                dashArray: '10, 5'
            }).addTo(window.campusMap);
        }
    }
    
    // Add drop-off points
    if (trip.dropoff_points && trip.dropoff_points.length > 0) {
        trip.dropoff_points.forEach((point, index) => {
            const color = point.status === 'completed' ? '#4caf50' : '#2196f3';
            
            const icon = L.divIcon({
                html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">📍</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                className: 'dropoff-marker'
            });
            
            const marker = L.marker([point.latitude, point.longitude], { icon });
            
            const popupContent = `
                <div style="min-width: 180px;">
                    <h4 style="margin: 0 0 8px 0; color: #333;">Drop-off Point</h4>
                    <p style="margin: 4px 0;"><strong>Location:</strong> ${point.name}</p>
                    <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: ${color};">${point.status}</span></p>
                    <p style="margin: 4px 0;"><strong>Passengers:</strong> ${point.passengers || 0}</p>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.addTo(window.campusMap);
            window.tripMarkers.push(marker);
        });
    }
    
    // Update trip progress info panel
    updateTripProgressPanel(trip);
}

function updateTripProgressPanel(trip) {
    // Create or update trip progress panel
    let progressPanel = document.getElementById('tripProgressPanel');
    if (!progressPanel) {
        progressPanel = document.createElement('div');
        progressPanel.id = 'tripProgressPanel';
        progressPanel.className = 'trip-progress-panel';
        
        const mapInfoPanel = document.getElementById('mapInfoPanel');
        if (mapInfoPanel) {
            mapInfoPanel.parentNode.insertBefore(progressPanel, mapInfoPanel.nextSibling);
        }
    }
    
    const completedPickups = trip.pickup_points?.filter(p => p.status === 'completed').length || 0;
    const totalPickups = trip.pickup_points?.length || 0;
    const progressPercentage = totalPickups > 0 ? (completedPickups / totalPickups) * 100 : 0;
    
    progressPanel.innerHTML = `
        <h3>🚍 Trip Progress</h3>
        <div class="trip-overview">
            <div class="trip-stat">
                <span class="stat-label">Route:</span>
                <span class="stat-value">${trip.route_name || 'Campus Express'}</span>
            </div>
            <div class="trip-stat">
                <span class="stat-label">Progress:</span>
                <span class="stat-value">${completedPickups}/${totalPickups} pickups</span>
            </div>
            <div class="trip-stat">
                <span class="stat-label">Passengers:</span>
                <span class="stat-value">${trip.total_passengers || 0}</span>
            </div>
        </div>
        
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progressPercentage}%"></div>
        </div>
        
        <div class="pickup-points-list">
            <h4>Pickup Points</h4>
            ${trip.pickup_points?.map((point, index) => `
                <div class="pickup-point-item ${point.status}">
                    <div class="point-number">${index + 1}</div>
                    <div class="point-details">
                        <div class="point-name">${point.name}</div>
                        <div class="point-status">${point.status} - ${point.passengers || 0} passengers</div>
                    </div>
                </div>
            `).join('') || '<p>No pickup points</p>'}
        </div>
    `;
}

// Add trip progress styles to the existing CSS
const tripProgressStyles = `
    .trip-progress-panel {
        margin-top: 1rem;
        background: var(--white);
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .trip-progress-panel h3 {
        margin: 0 0 1rem 0;
        color: var(--dark-color);
        font-size: 1.1rem;
    }
    
    .trip-overview {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }
    
    .trip-stat {
        flex: 1;
        min-width: 120px;
    }
    
    .trip-stat .stat-label {
        display: block;
        font-size: 0.8rem;
        color: var(--gray-600);
        margin-bottom: 0.2rem;
    }
    
    .trip-stat .stat-value {
        display: block;
        font-weight: 600;
        color: var(--dark-color);
    }
    
    .progress-bar-container {
        width: 100%;
        height: 8px;
        background: var(--gray-200);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 1rem;
    }
    
    .progress-bar {
        height: 100%;
        background: var(--primary-color);
        transition: width 0.3s ease;
    }
    
    .pickup-points-list h4 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: var(--dark-color);
    }
    
    .pickup-point-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem;
        margin-bottom: 0.3rem;
        background: var(--gray-50);
        border-radius: 6px;
        border-left: 3px solid var(--gray-300);
    }
    
    .pickup-point-item.completed {
        border-left-color: var(--success-color);
        background: rgba(76, 175, 80, 0.1);
    }
    
    .pickup-point-item.current {
        border-left-color: var(--primary-color);
        background: rgba(255, 107, 53, 0.1);
    }
    
    .pickup-point-item.pending {
        border-left-color: var(--gray-300);
    }
    
    .point-number {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--gray-300);
        color: var(--white);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 600;
    }
    
    .pickup-point-item.completed .point-number {
        background: var(--success-color);
    }
    
    .pickup-point-item.current .point-number {
        background: var(--primary-color);
    }
    
    .point-details {
        flex: 1;
    }
    
    .point-name {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--dark-color);
        margin-bottom: 0.1rem;
    }
    
    .point-status {
        font-size: 0.7rem;
        color: var(--gray-600);
    }
    
    @media (max-width: 768px) {
        .trip-overview {
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .pickup-point-item {
            padding: 0.4rem;
        }
        
        .point-number {
            width: 20px;
            height: 20px;
            font-size: 0.6rem;
        }
        
        .point-name {
            font-size: 0.7rem;
        }
        
        .point-status {
            font-size: 0.6rem;
        }
    }
`;

// Inject the styles
const styleSheet = document.createElement('style');
styleSheet.textContent = tripProgressStyles;
document.head.appendChild(styleSheet);
