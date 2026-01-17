// Student Shuttle Tracker - View Live Shuttle Locations
let studentMap = null;
let shuttleMarkers = {};
let socket = null;

// Initialize map for students
function initializeStudentTrackingMap() {
    const mapContainer = document.getElementById('studentShuttleMap');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    console.log('🗺️ Initializing student shuttle tracking map...');
    
    // Clear existing map
    if (studentMap) {
        studentMap.remove();
        studentMap = null;
    }
    
    // Create map centered on UCC campus
    studentMap = L.map('studentShuttleMap').setView([5.1044, -1.1947], 15);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(studentMap);
    
    // Add campus landmarks
    addCampusLandmarks();
    
    // Load active shuttles
    loadActiveShuttles();
    
    // Setup real-time updates
    setupRealtimeUpdates();
    
    // Add student's current location
    addStudentLocation();
    
    console.log('✅ Student tracking map initialized');
}

// Add campus landmarks
function addCampusLandmarks() {
    const landmarks = [
        {lat: 5.1044, lng: -1.1947, name: 'Main Gate', icon: '🚪'},
        {lat: 5.1048, lng: -1.1943, name: 'Library', icon: '📚'},
        {lat: 5.1052, lng: -1.1939, name: 'Science Block', icon: '🔬'},
        {lat: 5.1056, lng: -1.1935, name: 'Hostel Area', icon: '🏠'}
    ];
    
    landmarks.forEach(landmark => {
        L.circleMarker([landmark.lat, landmark.lng], {
            radius: 6,
            fillColor: '#2196f3',
            color: '#fff',
            weight: 2,
            fillOpacity: 0.7
        }).addTo(studentMap)
          .bindPopup(`<b>${landmark.icon} ${landmark.name}</b>`);
    });
}

// Load all active shuttles
async function loadActiveShuttles() {
    const token = localStorage.getItem('ucc_token');
    if (!token) {
        console.log('No token found');
        return;
    }
    
    try {
        const response = await fetch('/api/shuttles/active', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.shuttles) {
            console.log(`📍 Found ${data.shuttles.length} active shuttle(s)`);
            
            // Clear existing markers
            Object.values(shuttleMarkers).forEach(marker => marker.remove());
            shuttleMarkers = {};
            
            // Add shuttle markers
            data.shuttles.forEach(shuttle => {
                addShuttleMarker(shuttle);
            });
            
            // Update shuttle count
            updateShuttleCount(data.shuttles.length);
            
            if (data.shuttles.length === 0) {
                showNotification('No active shuttles at the moment', 'info');
            }
        }
    } catch (error) {
        console.error('Error loading shuttles:', error);
        showNotification('Error loading shuttle data', 'error');
    }
}

// Add shuttle marker to map
function addShuttleMarker(shuttle) {
    if (!shuttle.latitude || !shuttle.longitude) {
        console.log('Shuttle has no location:', shuttle);
        return;
    }
    
    // Create animated shuttle icon
    const shuttleIcon = L.divIcon({
        html: `
            <div class="shuttle-marker-container">
                <div class="shuttle-pulse"></div>
                <div class="shuttle-icon">🚌</div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: 'custom-shuttle-marker'
    });
    
    // Create marker
    const marker = L.marker([shuttle.latitude, shuttle.longitude], {
        icon: shuttleIcon
    }).addTo(studentMap);
    
    // Create popup content
    const popupContent = `
        <div class="shuttle-popup">
            <h3>🚌 ${shuttle.vehicle_number}</h3>
            <p><strong>Driver:</strong> ${shuttle.driver_name}</p>
            <p><strong>Route:</strong> ${shuttle.routeName || 'Campus Route'}</p>
            <p><strong>Status:</strong> <span class="status-active">Active</span></p>
            <p class="last-update">Updated: ${shuttle.lastUpdate ? new Date(shuttle.lastUpdate).toLocaleTimeString() : 'Just now'}</p>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    
    // Store marker
    shuttleMarkers[shuttle.id] = marker;
    
    console.log(`✅ Added shuttle marker: ${shuttle.vehicle_number}`);
}

// Setup real-time updates via Socket.IO
function setupRealtimeUpdates() {
    // Connect to Socket.IO
    if (typeof io === 'undefined') {
        console.log('Socket.IO not loaded, skipping real-time updates');
        return;
    }
    
    socket = io();
    
    socket.on('connect', () => {
        console.log('✅ Connected to real-time updates');
    });
    
    // Listen for shuttle location updates
    socket.on('shuttle_location_update', (data) => {
        console.log('📍 Shuttle location update:', data);
        updateShuttleLocation(data);
    });
    
    // Listen for shuttle going offline
    socket.on('shuttle_offline', (data) => {
        console.log('🔴 Shuttle offline:', data);
        removeShuttleMarker(data.shuttleId);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from real-time updates');
    });
}

// Update shuttle location in real-time
function updateShuttleLocation(data) {
    const { shuttleId, latitude, longitude, routeName } = data;
    
    if (!shuttleMarkers[shuttleId]) {
        // New shuttle appeared, add it
        addShuttleMarker({
            id: shuttleId,
            latitude,
            longitude,
            vehicle_number: `Shuttle ${shuttleId}`,
            driver_name: 'Driver',
            routeName: routeName || 'Campus Route',
            lastUpdate: Date.now()
        });
    } else {
        // Update existing shuttle position
        const marker = shuttleMarkers[shuttleId];
        marker.setLatLng([latitude, longitude]);
        
        // Update popup
        const popupContent = marker.getPopup().getContent();
        const updatedContent = popupContent.replace(
            /Updated:.*?<\/p>/,
            `Updated: ${new Date().toLocaleTimeString()}</p>`
        );
        marker.setPopupContent(updatedContent);
        
        console.log(`✅ Updated shuttle ${shuttleId} location`);
    }
}

// Remove shuttle marker
function removeShuttleMarker(shuttleId) {
    if (shuttleMarkers[shuttleId]) {
        shuttleMarkers[shuttleId].remove();
        delete shuttleMarkers[shuttleId];
        
        // Update count
        updateShuttleCount(Object.keys(shuttleMarkers).length);
        
        showNotification('A shuttle went offline', 'info');
    }
}

// Add student's current location
function addStudentLocation() {
    if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            
            // Add marker for student location
            const studentIcon = L.divIcon({
                html: '<div style="background:#4caf50;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📍</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            L.marker([latitude, longitude], { icon: studentIcon })
                .addTo(studentMap)
                .bindPopup('<b>📍 Your Location</b>');
            
            // Center map on student location if within campus area
            const distance = studentMap.distance([latitude, longitude], [5.1044, -1.1947]);
            if (distance < 5000) { // Within 5km
                studentMap.setView([latitude, longitude], 16);
            }
        },
        (error) => {
            console.log('Location access denied:', error);
        },
        { enableHighAccuracy: true }
    );
}

// Update shuttle count display
function updateShuttleCount(count) {
    const countEl = document.getElementById('activeShuttleCount');
    if (countEl) {
        countEl.textContent = count;
    }
    
    const statusEl = document.getElementById('shuttleStatus');
    if (statusEl) {
        statusEl.textContent = count > 0 ? `${count} shuttle(s) active` : 'No active shuttles';
    }
}

// Refresh shuttle data
async function refreshShuttleData() {
    console.log('🔄 Refreshing shuttle data...');
    await loadActiveShuttles();
    showNotification('Shuttle data refreshed', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 4000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚌 Student Shuttle Tracker initialized');
    
    // Setup refresh button
    const refreshBtn = document.getElementById('refreshShuttlesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshShuttleData);
    }
});

// Add CSS for shuttle markers
const style = document.createElement('style');
style.textContent = `
    .shuttle-marker-container {
        position: relative;
        width: 40px;
        height: 40px;
    }
    
    .shuttle-pulse {
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 107, 53, 0.4);
        animation: pulse 2s infinite;
    }
    
    .shuttle-icon {
        position: absolute;
        width: 40px;
        height: 40px;
        background: #ff6b35;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 1;
    }
    
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.3);
            opacity: 0.5;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
    
    .shuttle-popup {
        min-width: 200px;
    }
    
    .shuttle-popup h3 {
        margin: 0 0 10px 0;
        color: #ff6b35;
    }
    
    .shuttle-popup p {
        margin: 5px 0;
        font-size: 14px;
    }
    
    .status-active {
        color: #4caf50;
        font-weight: bold;
    }
    
    .last-update {
        font-size: 12px;
        color: #666;
        margin-top: 8px;
    }
`;
document.head.appendChild(style);

console.log('✅ Student Shuttle Tracker loaded');
