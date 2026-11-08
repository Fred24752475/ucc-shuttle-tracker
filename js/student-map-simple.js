// Simple Student Map - No CSP Issues
let studentMap = null;
let userLocationMarker = null;

function initializeStudentMap() {
    const mapContainer = document.getElementById('shuttleMap');
    if (!mapContainer || studentMap) return;
    
    try {
        studentMap = L.map('shuttleMap').setView([5.1044, -1.1947], 14);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(studentMap);
        
        // Get user location
        getUserLocation();
        
        console.log('Map loaded');
    } catch (error) {
        console.error('Map error:', error);
    }
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Create blinking user marker
                const userIcon = L.divIcon({
                    html: `
                        <div class="user-location-marker">
                            <div class="pulse-ring"></div>
                            <div class="user-dot">📍</div>
                        </div>
                        <style>
                            .user-location-marker {
                                position: relative;
                                width: 30px;
                                height: 30px;
                            }
                            .pulse-ring {
                                position: absolute;
                                width: 30px;
                                height: 30px;
                                border: 3px solid #2196f3;
                                border-radius: 50%;
                                animation: pulse 2s infinite;
                            }
                            .user-dot {
                                position: absolute;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                width: 20px;
                                height: 20px;
                                background: #2196f3;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 12px;
                                border: 2px solid white;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                animation: blink 1.5s infinite;
                            }
                            @keyframes pulse {
                                0% { transform: scale(0.5); opacity: 1; }
                                100% { transform: scale(2); opacity: 0; }
                            }
                            @keyframes blink {
                                0%, 100% { opacity: 1; }
                                50% { opacity: 0.3; }
                            }
                        </style>
                    `,
                    iconSize: [30, 30],
                    className: 'user-marker'
                });
                
                userLocationMarker = L.marker([lat, lng], { icon: userIcon })
                    .addTo(studentMap)
                    .bindPopup('📍 You are here!')
                    .openPopup();
                
                // Center map on user location
                studentMap.setView([lat, lng], 16);
                
                console.log('User location found:', lat, lng);
            },
            (error) => {
                console.error('Location error:', error);
                alert('Please enable location access to see your position on the map');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        alert('Geolocation is not supported by this browser');
    }
}

// Auto-initialize when map section becomes visible
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(() => {
        const mapSection = document.getElementById('mapSection');
        if (mapSection && mapSection.style.display !== 'none' && !studentMap) {
            setTimeout(initializeStudentMap, 200);
        }
    });
    
    const mapSection = document.getElementById('mapSection');
    if (mapSection) {
        observer.observe(mapSection, { attributes: true, attributeFilter: ['style'] });
    }
});