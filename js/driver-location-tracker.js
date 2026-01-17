// Driver Location Tracker - Real-time GPS Broadcasting
let locationWatchId = null;
let isRideActive = false;
let updateInterval = null;

// Start broadcasting location
async function startRideBroadcast() {
    const token = localStorage.getItem('ucc_token');
    if (!token) {
        alert('Please login first');
        return;
    }
    
    try {
        // Start ride on backend
        const response = await fetch('/api/driver/start-ride', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route_name: 'Campus Route'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            isRideActive = true;
            
            // Show success notification
            showNotification('🚀 Ride started! Broadcasting your location to students...', 'success');
            
            // Update UI
            updateRideUI(true);
            
            // Start GPS tracking
            startGPSTracking();
            
            return true;
        } else {
            alert('Error starting ride: ' + data.message);
            return false;
        }
    } catch (error) {
        console.error('Start ride error:', error);
        alert('Error starting ride. Please try again.');
        return false;
    }
}

// Stop broadcasting location
async function stopRideBroadcast() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/driver/stop-ride', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            isRideActive = false;
            
            // Stop GPS tracking
            stopGPSTracking();
            
            // Show notification
            showNotification('⏹️ Ride stopped. Location broadcasting disabled.', 'info');
            
            // Update UI
            updateRideUI(false);
            
            return true;
        } else {
            alert('Error stopping ride: ' + data.message);
            return false;
        }
    } catch (error) {
        console.error('Stop ride error:', error);
        alert('Error stopping ride.');
        return false;
    }
}

// Start GPS tracking
function startGPSTracking() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    console.log('📍 Starting GPS tracking...');
    
    // Watch position continuously
    locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            console.log('📍 Location update:', latitude, longitude);
            
            // Send location to backend
            sendLocationUpdate(latitude, longitude);
        },
        (error) => {
            console.error('GPS error:', error);
            showNotification('⚠️ GPS error: ' + error.message, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
    
    // Also send updates every 5 seconds as backup
    updateInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                sendLocationUpdate(latitude, longitude);
            },
            (error) => console.error('GPS error:', error),
            { enableHighAccuracy: true }
        );
    }, 5000);
}

// Stop GPS tracking
function stopGPSTracking() {
    if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    
    console.log('📍 GPS tracking stopped');
}

// Send location update to backend
async function sendLocationUpdate(latitude, longitude) {
    const token = localStorage.getItem('ucc_token');
    if (!token || !isRideActive) return;
    
    try {
        const response = await fetch('/api/driver/update-location', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude, longitude })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Location broadcast to students');
            
            // Update map marker if map is visible
            if (window.driverMarker && window.currentMap) {
                window.driverMarker.setLatLng([latitude, longitude]);
                window.currentMap.setView([latitude, longitude], window.currentMap.getZoom());
            }
        }
    } catch (error) {
        console.error('Location update error:', error);
    }
}

// Update UI based on ride status
function updateRideUI(isActive) {
    const startBtn = document.getElementById('startRideBtn');
    const stopBtn = document.getElementById('stopRideBtn');
    const statusBadge = document.getElementById('rideStatusBadge');
    
    if (startBtn) {
        startBtn.disabled = isActive;
        startBtn.style.opacity = isActive ? '0.5' : '1';
    }
    
    if (stopBtn) {
        stopBtn.disabled = !isActive;
        stopBtn.style.opacity = isActive ? '1' : '0.5';
    }
    
    if (statusBadge) {
        statusBadge.textContent = isActive ? '🟢 Broadcasting' : '🔴 Offline';
        statusBadge.style.color = isActive ? '#4caf50' : '#f44336';
    }
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
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 350px;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Check ride status on page load
async function checkRideStatus() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/driver/ride-status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.isActive) {
            isRideActive = true;
            updateRideUI(true);
            startGPSTracking();
            showNotification('📍 Resuming location broadcast...', 'info');
        }
    } catch (error) {
        console.error('Check ride status error:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚍 Driver Location Tracker initialized');
    
    // Check if there's an active ride
    checkRideStatus();
    
    // Setup event listeners
    const startBtn = document.getElementById('startRideBtn');
    const stopBtn = document.getElementById('stopRideBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            if (confirm('Start broadcasting your location to students?')) {
                await startRideBroadcast();
            }
        });
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', async () => {
            if (confirm('Stop broadcasting your location?')) {
                await stopRideBroadcast();
            }
        });
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Driver Location Tracker loaded');
