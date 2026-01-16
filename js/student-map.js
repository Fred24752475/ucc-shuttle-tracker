// Student Map - Simple Working Implementation
let studentMap = null;
let shuttleMarkers = {};

function initializeStudentMap() {
    const mapContainer = document.getElementById('shuttleMap');
    if (!mapContainer) return;
    
    studentMap = L.map('shuttleMap').setView([5.1044, -1.1947], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(studentMap);
    
    // Add shuttle markers
    const shuttles = [
        {id: 'UCC-001', lat: 5.1044, lng: -1.1947, status: 'active', driver: 'John Driver'},
        {id: 'UCC-002', lat: 5.1050, lng: -1.1940, status: 'idle', driver: 'Jane Driver'},
        {id: 'UCC-003', lat: 5.1040, lng: -1.1950, status: 'active', driver: 'Bob Driver'}
    ];
    
    shuttles.forEach(shuttle => {
        const marker = L.marker([shuttle.lat, shuttle.lng]).addTo(studentMap);
        marker.bindPopup(`<b>${shuttle.id}</b><br>Driver: ${shuttle.driver}<br>Status: ${shuttle.status}`);
        shuttleMarkers[shuttle.id] = marker;
    });
}

// Initialize when shuttle map section is shown
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(() => {
        const mapSection = document.getElementById('shuttle-map-section');
        if (mapSection && mapSection.style.display !== 'none' && !studentMap) {
            setTimeout(initializeStudentMap, 100);
        }
    });
    
    const mapSection = document.getElementById('shuttle-map-section');
    if (mapSection) {
        observer.observe(mapSection, { attributes: true, attributeFilter: ['style'] });
    }
});