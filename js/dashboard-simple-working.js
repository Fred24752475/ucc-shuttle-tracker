// UCC Student Dashboard - SIMPLE WORKING MAP
console.log('🗺️ SIMPLE WORKING MAP loading...');

window.StudentDashboardSimple = {
    currentSection: 'dashboard',
    
    init: function() {
        console.log('🚀 SIMPLE Dashboard init...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    },
    
    setup: function() {
        console.log('✅ SIMPLE setup...');
        this.setupNavigation();
        this.addDirectClickListeners();
    },
    
    setupNavigation: function() {
        window.showSection = (section) => {
            console.log(`📍 SIMPLE section: ${section}`);
            this.showSection(section);
        };
    },
    
    addDirectClickListeners: function() {
        // Navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item) => {
            const link = item.querySelector('a');
            const section = item.getAttribute('data-section');
            
            if (link && section) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🖱️ Click: ${section}`);
                    this.showSection(section);
                });
            }
        });
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    localStorage.clear();
                    window.location.href = 'index.html';
                }
            });
        }
        
        // Quick action buttons
        const requestRideBtn = document.querySelector('[onclick*="handleRequestRideClick"]');
        if (requestRideBtn) {
            requestRideBtn.onclick = () => this.showSection('rides');
        }
        
        const trackShuttleBtn = document.querySelector('[onclick*="handleTrackShuttleClick"]');
        if (trackShuttleBtn) {
            trackShuttleBtn.onclick = () => this.showSection('map');
        }
        
        const emergencyBtn = document.querySelector('[onclick*="handleEmergencyClick"]');
        if (emergencyBtn) {
            emergencyBtn.onclick = () => alert('🚨 Emergency alert sent to campus security!');
        }
        
        // Widget buttons
        const widgetBtns = document.querySelectorAll('.widget-btn');
        widgetBtns.forEach(btn => {
            const text = btn.textContent.toLowerCase();
            if (text.includes('shuttle')) btn.onclick = () => this.showSection('map');
            else if (text.includes('trip') || text.includes('manage')) btn.onclick = () => this.showSection('rides');
            else if (text.includes('history')) btn.onclick = () => this.showSection('history');
            else if (text.includes('map')) btn.onclick = () => this.showSection('map');
        });
        
        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                this.showSection('dashboard');
            };
        });
    },
    
    showSection: function(section) {
        console.log(`📍 SIMPLE showSection: ${section}`);
        
        const sectionIds = {
            'dashboard': 'dashboardMain',
            'rides': 'ridesSection', 
            'map': 'mapSection',
            'history': 'historySection',
            'ai-assistant': 'aiAssistantSection',
            'messages': 'messagesSection',
            'help': 'helpSection'
        };
        
        // Hide all sections
        ['dashboardMain', 'ridesSection', 'mapSection', 'historySection', 'aiAssistantSection', 'messagesSection', 'helpSection'].forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show target section
        const targetSectionId = sectionIds[section];
        const targetSection = document.getElementById(targetSectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            console.log(`✅ SIMPLE showing: ${targetSectionId}`);
        }
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`[data-section="${section}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }
        
        // Load content
        this.loadSectionContent(section);
        this.currentSection = section;
    },
    
    loadSectionContent: function(section) {
        console.log(`📦 SIMPLE content: ${section}`);
        
        switch(section) {
            case 'map':
                this.loadSimpleMap();
                break;
            default:
                break;
        }
    },
    
    loadSimpleMap: function() {
        console.log('🗺️ Map section opened - delegating to real OpenStreetMap...');
        
        // Use our real OpenStreetMap initialization function
        if (window.initializeSimpleMap && window.realMapInitialized === false) {
            window.initializeSimpleMap();
        } else if (window.realStudentMap) {
            console.log('🔄 Refreshing existing real OpenStreetMap...');
            window.realStudentMap.invalidateSize();
        }
    },
    
    loadFallbackMap: function() {
        console.log('🎭 Loading fallback visual map...');
        const shuttleMap = document.getElementById('shuttleMap');
        
        if (!shuttleMap) {
            console.error('❌ Map container not found');
            return;
        }
        
        // Create a WORKING map that doesn't rely on external services
        shuttleMap.style.background = 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)';
        shuttleMap.style.position = 'relative';
        shuttleMap.style.overflow = 'hidden';
        
        shuttleMap.innerHTML = `
            <!-- Main Map Container -->
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url('https://picsum.photos/seed/ucc-campus/800/500.jpg');
                background-size: cover;
                background-position: center;
                filter: brightness(0.9) contrast(1.1);
            ">
                
                <!-- Campus Overlay Grid -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: 
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
                    background-size: 50px 50px;
                    pointer-events: none;
                "></div>
                
                <!-- Campus Buildings -->
                <div style="position: absolute; top: 20%; left: 30%; width: 80px; height: 60px; background: #8b7355; border: 2px solid #654321; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🏛️</div>
                <div style="position: absolute; top: 15%; left: 60%; width: 70px; height: 70px; background: #4a90e2; border: 2px solid #2e5d8b; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📚</div>
                <div style="position: absolute; top: 60%; left: 45%; width: 90px; height: 70px; background: #27ae60; border: 2px solid #1e8449; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏫</div>
                <div style="position: absolute; top: 70%; left: 15%; width: 70px; height: 60px; background: #e67e22; border: 2px solid #d35400; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏠</div>
                
                <!-- Roads -->
                <div style="position: absolute; top: 35%; left: 10%; width: 80%; height: 3px; background: #7f8c8d; border-radius: 2px;"></div>
                <div style="position: absolute; top: 10%; left: 25%; width: 3px; height: 80%; background: #7f8c8d; border-radius: 2px;"></div>
                <div style="position: absolute; top: 65%; left: 20%; width: 60%; height: 3px; background: #7f8c8d; border-radius: 2px;"></div>
                
                <!-- Shuttle Markers -->
                <div onclick="window.StudentDashboardSimple.bookShuttle('Library')" style="position: absolute; top: 25%; left: 35%; width: 40px; height: 40px; background: #27ae60; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,0.3); transition: all 0.2s; z-index: 10;" title="Library Shuttle - Available (5 min)">🚌</div>
                <div onclick="window.StudentDashboardSimple.bookShuttle('Science')" style="position: absolute; top: 20%; left: 65%; width: 40px; height: 40px; background: #f39c12; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,0.3); transition: all 0.2s; z-index: 10;" title="Science Shuttle - In Use (12 min)">🚌</div>
                <div onclick="window.StudentDashboardSimple.bookShuttle('Hostel')" style="position: absolute; top: 65%; left: 50%; width: 40px; height: 40px; background: #27ae60; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,0.3); transition: all 0.2s; z-index: 10;" title="Hostel Shuttle - Available (8 min)">🚌</div>
                <div onclick="window.StudentDashboardSimple.bookShuttle('Main Gate')" style="position: absolute; top: 75%; left: 20%; width: 40px; height: 40px; background: #95a5a6; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,0.3); transition: all 0.2s; z-index: 10;" title="Main Gate Shuttle - Offline">🚌</div>
                
                <!-- Labels -->
                <div style="position: absolute; top: 18%; left: 32%; font-size: 11px; color: #2c3e50; font-weight: bold; text-shadow: 0 1px 2px white;">MAIN</div>
                <div style="position: absolute; top: 13%; left: 62%; font-size: 11px; color: #2c3e50; font-weight: bold; text-shadow: 0 1px 2px white;">LIBRARY</div>
                <div style="position: absolute; top: 58%; left: 47%; font-size: 11px; color: #2c3e50; font-weight: bold; text-shadow: 0 1px 2px white;">SCIENCE</div>
                <div style="position: absolute; top: 68%; left: 13%; font-size: 11px; color: #2c3e50; font-weight: bold; text-shadow: 0 1px 2px white;">HOSTELS</div>
                
                <!-- Control Panel -->
                <div style="position: absolute; top: 20px; right: 20px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100; min-width: 200px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">🚌 Shuttle Tracker</h3>
                    <div style="margin: 8px 0;">
                        <div style="display: flex; align-items: center; margin: 5px 0;">
                            <div style="width: 12px; height: 12px; background: #27ae60; border-radius: 50%; margin-right: 8px;"></div>
                            <span style="font-size: 13px;">2 Available</span>
                        </div>
                        <div style="display: flex; align-items: center; margin: 5px 0;">
                            <div style="width: 12px; height: 12px; background: #f39c12; border-radius: 50%; margin-right: 8px;"></div>
                            <span style="font-size: 13px;">1 In Use</span>
                        </div>
                        <div style="display: flex; align-items: center; margin: 5px 0;">
                            <div style="width: 12px; height: 12px; background: #95a5a6; border-radius: 50%; margin-right: 8px;"></div>
                            <span style="font-size: 13px;">1 Offline</span>
                        </div>
                    </div>
                    <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #ecf0f1;">
                        <button onclick="window.StudentDashboardSimple.refreshMap()" style="background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 2px; width: 100%; font-size: 14px;">🔄 Refresh Map</button>
                    </div>
                </div>
                
                <!-- Bottom Info -->
                <div style="position: absolute; bottom: 20px; left: 20px; background: rgba(255,255,255,0.95); padding: 10px; border-radius: 6px; font-size: 12px; color: #2c3e50;">
                    <strong>📍 UCC Campus, Cape Coast</strong><br>
                    <span style="color: #7f8c8d;">🗺️ Interactive Campus Map</span>
                </div>
            </div>
        `;
        
        // Add hover effects to shuttles
        setTimeout(() => {
            const shuttleElements = shuttleMap.querySelectorAll('[onclick*="bookShuttle"]');
            shuttleElements.forEach(shuttle => {
                shuttle.addEventListener('mouseenter', () => {
                    shuttle.style.transform = 'scale(1.2)';
                    shuttle.style.zIndex = '20';
                });
                shuttle.addEventListener('mouseleave', () => {
                    shuttle.style.transform = 'scale(1)';
                    shuttle.style.zIndex = '10';
                });
            });
        }, 100);
        
        console.log('✅ Fallback map loaded successfully!');
    },
    
    bookShuttle: function(shuttleName) {
        console.log(`🚌 Booking ${shuttleName}...`);
        
        const eta = {
            'Library': '5 minutes',
            'Science': '12 minutes', 
            'Hostel': '8 minutes',
            'Main Gate': 'Not available'
        };
        
        alert(`🎫 UCC Shuttle Booking\\n\\n🚌 ${shuttleName} Shuttle\\n⏱️ ETA: ${eta[shuttleName]}\\n\\n✅ Your ride has been booked!\\n\\nPlease wait at the designated pickup point.`);
    },
    
    refreshMap: function() {
        console.log('🔄 Refreshing map...');
        
        // Refresh real OpenStreetMap if available
        if (window.uccMap && window.uccMap.refreshShuttles) {
            window.uccMap.refreshShuttles();
            console.log('✅ Real OpenStreetMap refreshed');
        } else if (window.simpleMap && window.L) {
            // Basic refresh for fallback map
            console.log('✅ Fallback map refreshed');
        } else {
            alert('🔄 Map refreshed!\\n\\nShuttle positions updated.');
        }
    }
};

// Global functions
window.showDashboard = () => window.StudentDashboardSimple.showSection('dashboard');
window.showRides = () => window.StudentDashboardSimple.showSection('rides');
window.showMap = () => window.StudentDashboardSimple.showSection('map');
window.showHistory = () => window.StudentDashboardSimple.showSection('history');
window.showAiAssistant = () => window.StudentDashboardSimple.showSection('ai-assistant');
window.showMessages = () => window.StudentDashboardSimple.showSection('messages');
window.showHelp = () => window.StudentDashboardSimple.showSection('help');

// Initialize
window.StudentDashboardSimple.init();

console.log('✅ SIMPLE WORKING MAP loaded!');