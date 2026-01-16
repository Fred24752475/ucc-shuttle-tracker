// ============= STUDENT ETA SYSTEM =============

// Handle pickup location setting
async function handleSetPickupLocation() {
    console.log('📍 Setting pickup location for ETA alerts...');
    
    // Campus locations for selection
    const locations = [
        { name: 'UCC Main Gate', latitude: 5.1044, longitude: -1.1947 },
        { name: 'UCC Library', latitude: 5.1048, longitude: -1.1943 },
        { name: 'Science Block', latitude: 5.1052, longitude: -1.1939 },
        { name: 'Hostel Area', latitude: 5.1056, longitude: -1.1935 }
    ];
    
    // Create location selection modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        ">
            <h3 style="margin: 0 0 20px 0; color: #1565c0;">📍 Set Your Pickup Location</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                Choose where you usually wait for shuttles. You'll get ETA alerts when drivers are nearby!
            </p>
            <div class="location-options">
                ${locations.map(loc => `
                    <div class="location-option" style="
                        padding: 12px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        margin-bottom: 10px;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    " onclick="selectPickupLocation('${loc.name}', ${loc.latitude}, ${loc.longitude})">
                        <div style="
                            background: #1565c0;
                            color: white;
                            width: 30px;
                            height: 30px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 14px;
                        ">📍</div>
                        <div>
                            <div style="font-weight: 600; color: #333;">${loc.name}</div>
                            <div style="font-size: 12px; color: #666;">Click to select this location</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button onclick="closePickupModal()" style="
                    flex: 1;
                    padding: 10px;
                    border: 2px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                ">Cancel</button>
                <button onclick="useCurrentLocation()" style="
                    flex: 1;
                    padding: 10px;
                    border: none;
                    background: #4caf50;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                ">📱 Use Current Location</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.currentPickupModal = modal;
    
    // Add hover effects
    modal.querySelectorAll('.location-option').forEach(option => {
        option.addEventListener('mouseenter', function() {
            this.style.borderColor = '#1565c0';
            this.style.background = '#f3f8ff';
        });
        option.addEventListener('mouseleave', function() {
            this.style.borderColor = '#e0e0e0';
            this.style.background = 'white';
        });
    });
}

// Select pickup location
async function selectPickupLocation(locationName, latitude, longitude) {
    console.log(`📍 Selected pickup location: ${locationName}`);
    
    const token = localStorage.getItem('ucc_token');
    if (!token) {
        alert('Please login first');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3001/api/student/pickup-location', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                location_name: locationName,
                latitude: latitude,
                longitude: longitude
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal\n            closePickupModal();
            
            // Show success notification
            showETANotification(`✅ Pickup location set to ${locationName}! You'll get ETA alerts when shuttles are nearby.`, 'success');
            
            // Update UI
            updatePickupLocationDisplay(locationName, latitude, longitude);
            
            // Show ETA panel
            const etaPanel = document.getElementById('etaAlertsPanel');
            if (etaPanel) etaPanel.style.display = 'block';
            
            // Enable browser notifications
            enableBrowserNotifications();
        } else {
            alert('Error setting pickup location: ' + data.message);
        }
    } catch (error) {
        console.error('Pickup location error:', error);
        alert('Error setting pickup location. Please try again.');
    }
}

// Use current GPS location
async function useCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const locationName = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
            
            await selectPickupLocation(locationName, latitude, longitude);
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert('Could not get your current location. Please select from the list.');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Close pickup modal
function closePickupModal() {
    if (window.currentPickupModal) {
        document.body.removeChild(window.currentPickupModal);
        window.currentPickupModal = null;
    }
}

// Update pickup location display
function updatePickupLocationDisplay(locationName, latitude, longitude) {
    const currentPickupEl = document.getElementById('currentPickupLocation');
    if (currentPickupEl) {
        currentPickupEl.innerHTML = `
            <div class="pickup-location-active">
                <div class="location-info">
                    <div class="location-icon">📍</div>
                    <div class="location-details">
                        <div class="location-name">${locationName}</div>
                        <div class="location-coords">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</div>
                        <div class="location-status">✅ ETA alerts enabled</div>
                    </div>
                </div>
                <button onclick="handleSetPickupLocation()" class="change-location-btn">
                    Change Location
                </button>
            </div>
        `;
    }
}

// Enable browser notifications
async function enableBrowserNotifications() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                showETANotification('🔔 Browser notifications enabled! You\'ll get alerts even when the app is closed.', 'info');
            }
        }
    }
}

// Show ETA notification
function showETANotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 350px;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div>${message}</div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                margin-left: auto;
            ">×</button>
        </div>
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Add ETA alert to recent alerts
function addETAAlert(driverName, location, etaMinutes) {
    const alertsContainer = document.getElementById('recentETAAlerts');
    if (!alertsContainer) return;
    
    // Remove \"no alerts\" message
    const noAlerts = alertsContainer.querySelector('.no-alerts');
    if (noAlerts) noAlerts.remove();
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = 'eta-alert-item';
    alert.innerHTML = `
        <div class=\"alert-content\">
            <div class=\"alert-icon\">🚌</div>
            <div class=\"alert-details\">
                <div class=\"alert-message\">Shuttle arriving at ${location} in ${etaMinutes} minute${etaMinutes > 1 ? 's' : ''}!</div>
                <div class=\"alert-driver\">Driver: ${driverName}</div>
                <div class=\"alert-time\">${new Date().toLocaleTimeString()}</div>
            </div>
        </div>
    `;
    
    // Add to top of list
    alertsContainer.insertBefore(alert, alertsContainer.firstChild);
    
    // Keep only last 5 alerts
    const alerts = alertsContainer.querySelectorAll('.eta-alert-item');
    if (alerts.length > 5) {
        alerts[alerts.length - 1].remove();
    }
    
    // Auto-remove after 2 minutes
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 120000);
}

// Load existing pickup location on page load
async function loadPickupLocation() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:3001/api/student/pickup-location', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.preference) {
            const pref = data.preference;
            updatePickupLocationDisplay(pref.location_name, pref.latitude, pref.longitude);
            
            // Show ETA panel
            const etaPanel = document.getElementById('etaAlertsPanel');
            if (etaPanel) etaPanel.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading pickup location:', error);
    }
}

// Listen for real-time ETA alerts
function setupETAListeners() {
    if (typeof io !== 'undefined') {
        const socket = io();
        const studentId = JSON.parse(localStorage.getItem('ucc_user') || '{}').id;
        
        if (studentId) {
            // Listen for ETA alerts
            socket.on(`eta_alert_${studentId}`, (data) => {
                console.log('🔔 ETA Alert received:', data);
                
                // Show in-app notification
                showETANotification(data.message, 'success');
                
                // Add to recent alerts
                addETAAlert('Driver', data.location, data.eta_minutes);
                
                // Show browser notification if permission granted
                if (Notification.permission === 'granted') {
                    new Notification(data.title, {
                        body: data.message,
                        icon: '/icons/shuttle-icon.png',
                        tag: 'eta-alert'
                    });
                }
            });
            
            // Listen for push notifications
            socket.on(`push_notification_${studentId}`, (data) => {
                if (Notification.permission === 'granted') {
                    new Notification(data.title, {
                        body: data.body,
                        icon: data.icon,
                        tag: data.tag
                    });
                }
            });
        }
    }
}

// Initialize ETA system when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Initializing Student ETA System...');
    
    // Load existing pickup location
    loadPickupLocation();
    
    // Setup real-time listeners
    setupETAListeners();
    
    console.log('✅ Student ETA System initialized');
});

// Add CSS styles for ETA components
const etaStyles = document.createElement('style');
etaStyles.textContent = `
    .eta-alerts-panel {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-top: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .eta-alerts-panel h3 {
        margin: 0 0 15px 0;
        color: #1565c0;
        font-size: 18px;
    }
    
    .pickup-location-active {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 15px;
    }
    
    .location-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .location-icon {
        background: #1565c0;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
    }
    
    .location-name {
        font-weight: 600;
        color: #333;
        margin-bottom: 2px;
    }
    
    .location-coords {
        font-size: 12px;
        color: #666;
        margin-bottom: 2px;
    }
    
    .location-status {
        font-size: 12px;
        color: #4caf50;
        font-weight: 500;
    }
    
    .change-location-btn {
        background: #1565c0;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .change-location-btn:hover {
        background: #0d47a1;
    }
    
    .eta-alert-item {
        padding: 12px;
        background: #e8f5e8;
        border-left: 4px solid #4caf50;
        border-radius: 6px;
        margin-bottom: 8px;
    }
    
    .alert-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .alert-icon {
        font-size: 20px;
    }
    
    .alert-message {
        font-weight: 600;
        color: #333;
        margin-bottom: 2px;
    }
    
    .alert-driver {
        font-size: 12px;
        color: #666;
        margin-bottom: 2px;
    }
    
    .alert-time {
        font-size: 11px;
        color: #999;
    }
    
    .no-location, .no-alerts {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 20px;
    }
`;
document.head.appendChild(etaStyles);

console.log('🎯 Student ETA System loaded');