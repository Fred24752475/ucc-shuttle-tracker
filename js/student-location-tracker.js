/**
 * Student Dashboard Live Location Widget
 * Shows student's real-time location with blinking marker on dashboard map
 */

class StudentLocationTracker {
    constructor() {
        this.map = null;
        this.studentMarker = null;
        this.locationWatchId = null;
        this.currentPosition = null;
        this.initialized = false;

        // UCC Campus coordinates (default center)
        this.defaultCenter = [5.6037, -0.1870];
    }

    // Initialize the dashboard location map
    async init() {
        console.log('📍 Initializing student location tracker...');

        const mapContainer = document.getElementById('liveMap');
        if (!mapContainer) {
            console.error('❌ Live map container not found');
            return;
        }

        // Clear placeholder
        mapContainer.innerHTML = '';

        // Request location permission
        await this.requestLocationPermission();

        // Initialize map
        this.initializeMap();

        // Start tracking
        this.startLocationTracking();

        this.initialized = true;
        console.log('✅ Student location tracker initialized');
    }

    // Request location permission
    async requestLocationPermission() {
        if (!navigator.geolocation) {
            this.showPermissionError('Geolocation not supported by your browser');
            return false;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('✅ Location permission granted');
                    this.currentPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(true);
                },
                (error) => {
                    console.warn('⚠️ Location permission denied:', error.message);
                    this.showPermissionPrompt();
                    resolve(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    // Show permission prompt to user
    showPermissionPrompt() {
        const mapContainer = document.getElementById('liveMap');
        mapContainer.innerHTML = `
            <div class="location-permission-prompt">
                <div class="permission-icon">
                    <i class="fas fa-map-marker-alt fa-3x"></i>
                </div>
                <h3>Enable Location Access</h3>
                <p>To see your real-time location on the map, please allow location access.</p>
                <button class="enable-location-btn" onclick="window.studentLocationTracker.requestLocationPermission().then(() => window.studentLocationTracker.init())">
                    <i class="fas fa-location-arrow"></i> Enable Location
                </button>
                <p class="permission-note">
                    <i class="fas fa-lock"></i> Your location is only used to show you on the map and is never shared without your consent.
                </p>
            </div>
        `;
    }

    // Show permission error
    showPermissionError(message) {
        const mapContainer = document.getElementById('liveMap');
        mapContainer.innerHTML = `
            <div class="location-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    // Initialize Leaflet map
    initializeMap() {
        const mapContainer = document.getElementById('liveMap');

        // Create map centered on current position or default
        const center = this.currentPosition
            ? [this.currentPosition.lat, this.currentPosition.lng]
            : this.defaultCenter;

        this.map = L.map('liveMap', {
            center: center,
            zoom: 17,
            zoomControl: true,
            attributionControl: true
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(this.map);

        // Add student marker if we have position
        if (this.currentPosition) {
            this.addStudentMarker(this.currentPosition.lat, this.currentPosition.lng);
        }

        console.log('🗺️ Dashboard map initialized');
    }

    // Add blinking student marker
    addStudentMarker(lat, lng) {
        // Create custom blinking icon
        const blinkingIcon = L.divIcon({
            html: `
                <div class="student-location-marker">
                    <div class="marker-pulse"></div>
                    <div class="marker-dot">
                        <i class="fas fa-user"></i>
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            className: 'student-marker-container'
        });

        // Remove old marker if exists
        if (this.studentMarker) {
            this.map.removeLayer(this.studentMarker);
        }

        // Add new marker
        this.studentMarker = L.marker([lat, lng], { icon: blinkingIcon })
            .addTo(this.map)
            .bindPopup(`
                <div class="student-popup">
                    <h4><i class="fas fa-user-circle"></i> You are here</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                    <p><i class="fas fa-clock"></i> ${new Date().toLocaleTimeString()}</p>
                </div>
            `);

        // Center map on student
        this.map.setView([lat, lng], 17);
    }

    // Start continuous location tracking
    startLocationTracking() {
        if (!navigator.geolocation) return;

        // Watch position for real-time updates
        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLat = position.coords.latitude;
                const newLng = position.coords.longitude;

                console.log(`📍 Location update: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);

                this.currentPosition = { lat: newLat, lng: newLng };

                // Update or add marker
                if (this.studentMarker) {
                    // Smoothly move marker to new position
                    this.studentMarker.setLatLng([newLat, newLng]);

                    // Update popup
                    this.studentMarker.setPopupContent(`
                        <div class="student-popup">
                            <h4><i class="fas fa-user-circle"></i> You are here</h4>
                            <p><i class="fas fa-map-marker-alt"></i> ${newLat.toFixed(6)}, ${newLng.toFixed(6)}</p>
                            <p><i class="fas fa-clock"></i> ${new Date().toLocaleTimeString()}</p>
                            <p class="live-indicator"><i class="fas fa-circle"></i> Live</p>
                        </div>
                    `);
                } else {
                    this.addStudentMarker(newLat, newLng);
                }

                // Optionally re-center (uncomment if you want auto-following)
                // this.map.panTo([newLat, newLng]);
            },
            (error) => {
                console.error('❌ Location tracking error:', error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );
    }

    // Stop location tracking
    stopTracking() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
            console.log('🛑 Location tracking stopped');
        }
    }

    // Center map on student
    centerOnStudent() {
        if (this.currentPosition && this.map) {
            this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 17);
        }
    }

    // Refresh/re-initialize
    refresh() {
        if (this.map) {
            this.map.invalidateSize();
            if (this.currentPosition) {
                this.centerOnStudent();
            }
        }
    }
}

// Auto-initialize when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.studentLocationTracker = new StudentLocationTracker();

    // Initialize when dashboard is shown
    setTimeout(() => {
        if (document.getElementById('liveMap')) {
            window.studentLocationTracker.init();
        }
    }, 1000);

    console.log('✅ Student location tracker ready');
});

// Global helper function
window.centerOnMyLocation = function () {
    if (window.studentLocationTracker) {
        window.studentLocationTracker.centerOnStudent();
    }
};
