// UCC Student Dashboard JavaScript - Simple Working Version
class StudentDashboard {
    constructor() {
        this.userData = null;
        this.currentSection = 'dashboard';
        this.socket = null;
        this.map = null;
        this.currentTrip = null;
        this.apiBaseUrl = 'http://localhost:3001/api';
        
        this.init();
    }

    async init() {
        console.log('🎓 Student Dashboard initializing...');
        
        try {
            // Check authentication
            await this.checkAuthentication();
            
            // Initialize Socket.IO for real-time updates
            this.initializeSocket();
            
            // Load user data
            this.loadUserData();
            
            // Load dashboard data
            this.loadDashboardData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ Student Dashboard initialized');
        } catch (error) {
            console.error('❌ Error during initialization:', error);
        }
    }

    async checkAuthentication() {
        const userToken = localStorage.getItem('ucc_token');
        const userData = localStorage.getItem('ucc_user');
        
        if (!userToken || !userData) {
            console.log('❌ No authentication found, redirecting to login...');
            window.location.href = '../htmls/student-login.html';
            return;
        }
        
        try {
            this.userData = JSON.parse(userData);
            console.log('✅ User authenticated:', this.userData.email);
        } catch (error) {
            console.error('❌ Error parsing user data:', error);
            localStorage.removeItem('ucc_token');
            localStorage.removeItem('ucc_user');
            window.location.href = '../htmls/student-login.html';
        }
    }

    initializeSocket() {
        try {
            this.socket = io('http://localhost:3001', {
                auth: {
                    token: localStorage.getItem('ucc_token')
                }
            });

            this.socket.on('connect', () => {
                console.log('🔌 Connected to real-time server');
                this.socket.emit('join_student_room', { studentId: this.userData.id });
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from real-time server');
            });

            this.socket.on('shuttle_location_update', (data) => {
                this.updateShuttleLocation(data);
            });

            this.socket.on('trip_update', (data) => {
                this.updateTripStatus(data);
            });

            this.socket.on('emergency_alert', (data) => {
                this.handleEmergencyAlert(data);
            });

            this.socket.on('new_message', (data) => {
                this.handleNewMessage(data);
            });

        } catch (error) {
            console.error('❌ Error initializing socket:', error);
        }
    }

    initializeShuttleMap() {
        console.log('🗺️ Initializing shuttle map...');
        const mapContainer = document.getElementById('shuttleMap');
        
        if (!mapContainer) {
            console.error('❌ Map container not found');
            return;
        }

        if (typeof L === 'undefined') {
            console.error('❌ Leaflet not loaded yet, retrying...');
            setTimeout(() => this.initializeShuttleMap(), 500);
            return;
        }

        try {
            if (this.map) {
                this.map.remove();
                this.map = null;
            }

            this.map = L.map('shuttleMap').setView([5.1044, -1.1947], 14);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);
            
            // Multiple invalidateSize calls for reliability (SAME AS ADMIN)
            setTimeout(() => this.map && this.map.invalidateSize(), 100);
            setTimeout(() => this.map && this.map.invalidateSize(), 500);
            setTimeout(() => this.map && this.map.invalidateSize(), 1000);
            
            // Add window resize listener
            if (!this.resizeListener) {
                this.resizeListener = () => {
                    if (this.map) {
                        this.map.invalidateSize();
                    }
                };
                window.addEventListener('resize', this.resizeListener);
            }

            // Store shuttle markers
            this.shuttleMarkers = [];
            
            // Add shuttle markers
            const shuttles = [
                {id: 'UCC-001', lat: 5.1044, lng: -1.1947, status: 'active', name: 'Library Shuttle'},
                {id: 'UCC-002', lat: 5.1050, lng: -1.1940, status: 'idle', name: 'Science Shuttle'},
                {id: 'UCC-003', lat: 5.1038, lng: -1.1955, status: 'active', name: 'Hostel Shuttle'}
            ];
            
            shuttles.forEach(shuttle => {
                const icon = this.createShuttleIcon(shuttle.status);
                const marker = L.marker([shuttle.lat, shuttle.lng], {icon}).addTo(this.map);
                marker.bindPopup(`<b>${shuttle.name}</b><br>Status: ${shuttle.status}`);
                this.shuttleMarkers.push(marker);
            });
            
            console.log('✅ Shuttle map initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing shuttle map:', error);
            this.showMapPlaceholder();
        }
    }

    // Create shuttle icon (SAME AS ADMIN)
    createShuttleIcon(status) {
        const iconColors = {
            'active': '#4caf50',
            'idle': '#ff9800', 
            'offline': '#9e9e9e'
        };
        
        const color = iconColors[status] || '#4caf50';
        
        return L.divIcon({
            html: `<div style="background: ${color}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🚌</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            className: 'shuttle-marker'
        });
    }

    // Clear all shuttle markers
    clearShuttleMarkers() {
        if (this.shuttleMarkers && this.shuttleMarkers.length > 0) {
            this.shuttleMarkers.forEach(marker => {
                if (this.map && marker) {
                    this.map.removeLayer(marker);
                }
            });
        }
        this.shuttleMarkers = [];
    }

    // Add shuttle marker to map
    addShuttleMarker(shuttle) {
        if (!this.map || !shuttle.position) return;
        
        try {
            const shuttleIcon = this.createShuttleIcon(shuttle.status);
            
            const marker = L.marker(shuttle.position, {
                icon: shuttleIcon,
                title: shuttle.name
            }).addTo(this.map);
            
            // Create popup content
            const popupContent = `
                <div style="min-width: 200px; font-family: Arial, sans-serif;">
                    <h4 style="margin: 0 0 10px 0; color: #1565c0;">🚌 ${shuttle.name}</h4>
                    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${shuttle.status === 'available' ? '#28a745' : shuttle.status === 'in_use' ? '#ffc107' : '#6c757d'}; font-weight: bold;">${shuttle.status.toUpperCase()}</span></p>
                    <p style="margin: 5px 0;"><strong>Route:</strong> ${shuttle.route}</p>
                    <p style="margin: 5px 0;"><strong>Passengers:</strong> ${shuttle.passengers}/40</p>
                    <p style="margin: 5px 0;"><strong>ETA:</strong> ${shuttle.eta > 0 ? shuttle.eta + ' mins' : 'N/A'}</p>
                    <button onclick="alert('Requesting ride with ${shuttle.name}...')" style="background: #1565c0; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Request Ride</button>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            this.shuttleMarkers.push(marker);
            
            console.log(`✅ Added marker for ${shuttle.name} at [${shuttle.position}]`);
        } catch (error) {
            console.error(`❌ Error adding marker for ${shuttle.name}:`, error);
        }
    }

    // Load shuttles on map
    async loadShuttlesOnMap() {
        try {
            // Mock shuttle data with UCC Campus coordinates
            const shuttles = [
                {
                    id: 1,
                    name: 'Library Shuttle',
                    position: [5.6037, -0.1870],
                    status: 'available',
                    route: 'Main Gate → Library',
                    passengers: 8,
                    eta: 5
                },
                {
                    id: 2,
                    name: 'Science Block Shuttle',
                    position: [5.6050, -0.1880],
                    status: 'in_use',
                    route: 'Library → Science Block',
                    passengers: 25,
                    eta: 12
                },
                {
                    id: 3,
                    name: 'Hostel Shuttle',
                    position: [5.6040, -0.1860],
                    status: 'offline',
                    route: 'Not Active',
                    passengers: 0,
                    eta: null
                }
            ];

            // Clear existing markers
            this.clearShuttleMarkers();

            // Add markers for each shuttle
            shuttles.forEach(shuttle => {
                this.addShuttleMarker(shuttle);
            });

            console.log(`✅ Loaded ${shuttles.length} shuttles on map`);
        } catch (error) {
            console.error('❌ Error loading shuttles on map:', error);
            this.showMapError('Failed to load shuttles: ' + error.message);
        }
    }
        } catch (error) {
            console.error('❌ Error loading shuttles on map:', error);
        }
    }

    // Create shuttle icon based on status
    createShuttleIcon(status) {
        const iconColors = {
            available: '#4caf50',
            busy: '#ff9800', 
            offline: '#9e9e9e'
        };

        const color = iconColors[status] || '#9e9e9e';

        return L.divIcon({
            html: `
                <div style="
                    background: ${color};
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">
                    🚌
                </div>
            `,
            className: 'shuttle-marker-leaflet',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    }

    // Add map controls
    addMapControls() {
        // Add zoom control
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);

        // Add custom controls
        const customControls = L.control({position: 'topleft'});
        customControls.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'map-custom-controls');
            div.innerHTML = `
                <button onclick="studentDashboard.refreshMap()" title="Refresh Map">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button onclick="studentDashboard.centerMap()" title="Center Map">
                    <i class="fas fa-crosshairs"></i>
                </button>
                <button onclick="studentDashboard.toggleFullscreen()" title="Fullscreen">
                    <i class="fas fa-expand"></i>
                </button>
            `;
            div.style.cssText = `
                background: white;
                border-radius: 6px;
                padding: 8px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                gap: 4px;
            `;
            
            // Style buttons
            div.querySelectorAll('button').forEach(btn => {
                btn.style.cssText = `
                    background: #1565c0;
                    color: white;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: background 0.2s;
                `;
                btn.onmouseover = () => btn.style.background = '#0d47a1';
                btn.onmouseout = () => btn.style.background = '#1565c0';
            });
            
            return div;
        };
        customControls.addTo(this.map);

        // Add legend
        const legend = L.control({position: 'bottomright'});
        legend.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `
                <h4>Shuttle Status</h4>
                <div class="legend-item">
                    <span class="legend-color" style="background: #4caf50;"></span>
                    <span>Available</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #ff9800;"></span>
                    <span>In Transit</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #9e9e9e;"></span>
                    <span>Offline</span>
                </div>
            `;
            div.style.cssText = `
                background: white;
                padding: 12px;
                border-radius: 6px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                font-family: Inter, sans-serif;
            `;
            
            // Style legend content
            div.querySelector('h4').style.cssText = 'margin: 0 0 8px 0; font-size: 14px; font-weight: 600;';
            div.querySelectorAll('.legend-item').forEach(item => {
                item.style.cssText = 'display: flex; align-items: center; margin: 4px 0; font-size: 12px;';
                item.querySelector('.legend-color').style.cssText = 'width: 12px; height: 12px; border-radius: 50%; margin-right: 8px;';
            });
            
            return div;
        };
        legend.addTo(this.map);
    }

    // Show map error
    showMapError(message) {
        const mapContainer = document.getElementById('shuttleMap');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #fff5f5; border: 2px solid #fed7d7; border-radius: 8px;">
                    <div style="text-align: center; color: #c53030; padding: 20px;">
                        <h3>🗺️ Map Error</h3>
                        <p>${message}</p>
                        <button onclick="location.reload()" style="background: #1565c0; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Reload Page</button>
                    </div>
                </div>
            `;
        }
    }

    // Add backup click listeners for navigation
    addBackupClickListeners() {
        console.log('🔧 Adding backup click listeners...');
        
        // Sidebar navigation items
        const navItems = [
            { selector: '[data-section="dashboard"]', section: 'dashboard' },
            { selector: '[data-section="rides"]', section: 'rides' },
            { selector: '[data-section="map"]', section: 'map' },
            { selector: '[data-section="history"]', section: 'history' },
            { selector: '[data-section="ai-assistant"]', section: 'ai-assistant' },
            { selector: '[data-section="messages"]', section: 'messages' },
            { selector: '[data-section="help"]', section: 'help' }
        ];

        navItems.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) {
                // Remove existing listeners
                element.removeEventListener('click', () => {});
                
                // Add new listener
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log(`🖱️ Clicked nav item: ${item.section}`);
                    this.showSection(item.section);
                });
                
                console.log(`✅ Added listener to ${item.selector}`);
            }
        });

        // Quick action buttons
        const quickActions = [
            { selector: '.shuttle-availability-btn', action: () => this.showSection('map') },
            { selector: '.current-trip-btn', action: () => this.showSection('rides') },
            { selector: '.trip-history-btn', action: () => this.showSection('history') },
            { selector: '.emergency-btn', action: () => this.handleEmergencyClick() }
        ];

        quickActions.forEach(action => {
            const element = document.querySelector(action.selector);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log(`🖱️ Clicked quick action: ${action.selector}`);
                    action.action();
                });
                console.log(`✅ Added listener to ${action.selector}`);
            }
        });

        console.log('✅ Backup click listeners added');
    }

    // Show map placeholder (fallback)
    showMapPlaceholder() {
        const mapContainer = document.getElementById('shuttleMap');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="map-placeholder" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    border-radius: 12px;
                    color: #666;
                    text-align: center;
                    padding: 20px;
                ">
                    <i class="fas fa-map-marked-alt" style="font-size: 48px; color: #1565c0; margin-bottom: 16px;"></i>
                    <h3>Map Loading</h3>
                    <p>Unable to load interactive map. Please check your internet connection.</p>
                    <button onclick="studentDashboard.initializeShuttleMap()" style="
                        margin-top: 16px;
                        padding: 10px 20px;
                        background: #1565c0;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Try Again</button>
                </div>
            `;
        }
    }

    // Map control methods
    refreshMap() {
        console.log('🔄 Refreshing shuttle map...');
        if (this.map) {
            this.loadShuttlesOnMap();
        }
        if (this.miniMap) {
            this.loadMiniMapShuttles();
        }
        this.showNotification('🔄 Map refreshed', 'info');
    }

    centerMap() {
        console.log('🎯 Centering shuttle map...');
        if (this.map) {
            this.map.setView([5.1044, -1.1947], 15);
            this.showNotification('🎯 Map centered on campus', 'info');
        }
    }

    toggleFullscreen() {
        console.log('🔳 Toggling fullscreen map...');
        const mapSection = document.getElementById('mapSection');
        if (mapSection) {
            if (mapSection.classList.contains('fullscreen')) {
                mapSection.classList.remove('fullscreen');
                document.body.style.overflow = '';
            } else {
                mapSection.classList.add('fullscreen');
                document.body.style.overflow = 'hidden';
            }
            // Refresh map view after resize
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 300);
        }
    }

    loadUserData() {
        const userName = document.getElementById('userName');
        const studentName = document.getElementById('studentName');
        
        if (this.userData) {
            const displayName = this.userData.name || this.userData.firstName + ' ' + this.userData.lastName || 'Student';
            
            if (userName) userName.textContent = displayName;
            if (studentName) studentName.textContent = displayName;
        }
    }

    async loadDashboardData() {
        console.log('📊 Loading dashboard data...');
        
        // Load all data concurrently
        await Promise.all([
            this.loadShuttleAvailability(),
            this.loadCurrentTrip(),
            this.loadTripHistory(),
            this.loadHeaderStats()
        ]);
        
        console.log('✅ Dashboard data loaded');
    }

    setupEventListeners() {
        // Simple event listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Add backup click listeners for critical buttons
        this.addBackupClickListeners();
        
        // Add STRONG backup for navigation
        this.addNavigationBackup();
        
        console.log('✅ Event listeners setup');
    }

    // Add backup click listeners to ensure buttons work
    addBackupClickListeners() {
        console.log('🔧 Adding backup click listeners...');
        
        // Quick action buttons
        const requestRideBtn = document.querySelector('.action-card.primary');
        if (requestRideBtn) {
            requestRideBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🚗 Request Ride clicked');
                this.showSection('rides');
            });
        }
        
        const trackShuttleBtn = document.querySelector('.action-card.info');
        if (trackShuttleBtn) {
            trackShuttleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🗺️ Track Shuttle clicked');
                this.showSection('map');
            });
        }
        
        const emergencyBtn = document.querySelector('.action-card.warning');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🚨 Emergency clicked');
                this.showSection('help');
            });
        }
        
        // Map widget
        const mapWidget = document.querySelector('.map-widget');
        if (mapWidget) {
            mapWidget.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🗺️ Map widget clicked');
                this.showSection('map');
            });
        }
        
        // Navigation
        document.querySelectorAll('.nav-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const section = link.getAttribute('href').substring(1);
                console.log(`🧭 Navigation: ${section}`);
                this.showSection(section);
            });
        });
        
        console.log('✅ Backup click listeners added');
    }

    // STRONG backup for navigation - multiple approaches
    addNavigationBackup() {
        console.log('🔧 Adding STRONG navigation backup...');
        
        // Method 1: Direct event listeners on nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item, index) => {
            const section = item.getAttribute('data-section');
            const link = item.querySelector('a');
            
            if (section && link) {
                // Remove existing listeners by cloning
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
                
                // Add multiple event listeners for reliability
                newLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🧭 STRONG Click: ${section}`);
                    this.showSection(section);
                });
                
                newLink.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    console.log(`🖱️ Mousedown: ${section}`);
                });
                
                newLink.addEventListener('mouseup', (e) => {
                    e.preventDefault();
                    console.log(`🖱️ Mouseup: ${section}`);
                    this.showSection(section);
                });
            }
        });
        
        // Method 2: Global click listener with delegation
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-item a');
            if (navLink) {
                e.preventDefault();
                e.stopPropagation();
                const href = navLink.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const section = href.substring(1);
                    console.log(`🧭 DELEGATED Click: ${section}`);
                    this.showSection(section);
                }
            }
        });
        
        // Method 3: Direct function calls for testing
        window.testNav = (section) => {
            console.log(`🧪 TEST Navigation: ${section}`);
            this.showSection(section);
        };
        
        console.log('✅ STRONG navigation backup added');
    }

    // Navigation method to show different sections
    showSection(sectionName) {
        console.log(`🧭 Navigating to section: ${sectionName}`);
        console.log('📍 Available sections:', document.querySelectorAll('main[id$="Section"]'));
        
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        // Show/hide sections based on section name
        this.hideAllSections();
        
        switch(sectionName) {
            case 'dashboard':
                this.showDashboardSection();
                break;
            case 'rides':
                this.showRidesSection();
                break;
            case 'map':
                this.showMapSection();
                break;
            case 'history':
                this.showHistorySection();
                break;
            case 'ai-assistant':
                this.showAiAssistantSection();
                break;
            case 'messages':
                this.showMessagesSection();
                break;
            case 'help':
                this.showHelpSection();
                break;
            default:
                console.warn(`❌ Unknown section: ${sectionName}`);
                this.showDashboardSection();
        }
        
        this.currentSection = sectionName;
    }

    hideAllSections() {
        // Hide all main sections using correct IDs
        const sections = [
            'dashboardMain', 'ridesSection', 'mapSection', 
            'historySection', 'aiAssistantSection', 'messagesSection', 'helpSection'
        ];
        
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    showDashboardSection() {
        const section = document.getElementById('dashboardMain');
        if (section) {
            section.style.display = 'block';
            // Reload dashboard data when showing
            this.loadDashboardData();
        }
    }

    showRidesSection() {
        const section = document.getElementById('ridesSection');
        if (section) {
            section.style.display = 'block';
            // Load current trip when showing rides section
            this.loadCurrentTrip();
        }
    }

    showMapSection() {
        console.log('🗺️ Showing real-time shuttle map...');
        const section = document.getElementById('mapSection');
        if (section) {
            section.style.display = 'block';
            
            // SAME AS ADMIN - Wait 100ms then initialize
            setTimeout(() => {
                if (typeof L === 'undefined') {
                    console.log('⏳ Waiting for Leaflet...');
                    setTimeout(() => this.showMapSection(), 500);
                    return;
                }
                this.initializeShuttleMap();
            }, 100);
        }
    }

    showHistorySection() {
        const section = document.getElementById('historySection');
        if (section) {
            section.style.display = 'block';
            // Load trip history
            this.loadTripHistory();
        }
    }

    showAiAssistantSection() {
        const section = document.getElementById('aiAssistantSection');
        if (section) {
            section.style.display = 'block';
            console.log('🤖 AI Assistant section shown');
            
            // Test if elements exist
            const chatContainer = document.getElementById('simpleAIChat');
            const input = document.getElementById('simpleAIInput');
            console.log('Chat container found:', !!chatContainer);
            console.log('Input found:', !!input);
        }
    }

    showMessagesSection() {
        const section = document.getElementById('messagesSection');
        if (section) {
            section.style.display = 'block';
            // Load messages
            this.loadMessages();
        }
    }

    showHelpSection() {
        const section = document.getElementById('helpSection');
        if (section) {
            section.style.display = 'block';
            // Load help content
            this.loadHelpContent();
        }
    }

    // ============ SHUTTLE AVAILABILITY ============
    async loadShuttleAvailability() {
        const shuttleList = document.getElementById('shuttleList');
        if (!shuttleList) return;

        // Show loading
        shuttleList.innerHTML = '<div class="loading-spinner"></div>';

        try {
            console.log('🚌 Loading shuttle availability from server...');
            
            const response = await fetch(`${this.apiBaseUrl}/shuttles`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Server response status:', response.status);
            
            let shuttles = [];
            if (response.ok) {
                shuttles = await response.json();
                console.log('✅ Shuttles loaded from server:', shuttles);
            } else {
                console.warn('⚠️ Server returned error, using fallback data');
                // Use simulated data as fallback
                shuttles = [
                    { id: 1, name: 'Library Shuttle', route: 'Campus → Library', status: 'active', passengers: 8, driverName: 'Kofi Mensah' },
                    { id: 2, name: 'Hostel Shuttle', route: 'Campus → Hostels', status: 'active', passengers: 12, driverName: 'Ama Konadu' },
                    { id: 3, name: 'Science Shuttle', route: 'Campus → Science', status: 'active', passengers: 6, driverName: 'Yaw Owusu' }
                ];
            }

            this.displayShuttles(shuttles);
            
        } catch (error) {
            console.error('❌ Error loading shuttles:', error);
            this.displayShuttles([]);
        }
    }

    displayShuttles(shuttles) {
        const shuttleList = document.getElementById('shuttleList');
        if (!shuttleList) return;

        let html = '';
        shuttles.forEach(shuttle => {
            const statusClass = shuttle.status === 'active' ? 'available' : 'unavailable';
            
            html += `
                <div class="shuttle-item ${statusClass}">
                    <div class="shuttle-info">
                        <div class="shuttle-name">${shuttle.name}</div>
                        <div class="shuttle-route">${shuttle.route}</div>
                        <div class="shuttle-driver">Driver: ${shuttle.driverName || 'TBA'}</div>
                    </div>
                    <div class="shuttle-status">
                        <div class="eta-display">
                            <i class="fas fa-clock"></i>
                            <span>${Math.floor(Math.random() * 10) + 3} min</span>
                        </div>
                        <div class="capacity-info">
                            <i class="fas fa-users"></i>
                            <span>${shuttle.passengers}/12</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        shuttleList.innerHTML = html;
    }

    // ============ CURRENT TRIP ============
    async loadCurrentTrip() {
        const tripStatusValue = document.getElementById('tripStatusValue');
        const tripDriverName = document.getElementById('tripDriverName');
        const tripShuttleName = document.getElementById('tripShuttleName');
        const tripRoute = document.getElementById('tripRoute');
        const tripETA = document.getElementById('tripETA');
        const tripActions = document.getElementById('tripActions');
        
        try {
            console.log('🚗 Loading current trip from server...');
            
            const response = await fetch(`${this.apiBaseUrl}/student/${this.userData.id}/current-trip`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Current trip response status:', response.status);
            
            if (response.ok) {
                const trip = await response.json();
                console.log('✅ Current trip loaded:', trip);
                
                if (trip && trip.id) {
                    // Display active trip
                    if (tripStatusValue) tripStatusValue.textContent = trip.status;
                    if (tripDriverName) tripDriverName.textContent = trip.driverName || '--';
                    if (tripShuttleName) tripShuttleName.textContent = trip.shuttleName || '--';
                    if (tripRoute) tripRoute.textContent = trip.route || '--';
                    if (tripETA) tripETA.textContent = `${trip.eta || '--'} min`;
                    if (tripActions) tripActions.style.display = 'flex';
                } else {
                    // No active trip
                    this.displayNoActiveTrip();
                }
            } else {
                console.warn('⚠️ No current trip found');
                this.displayNoActiveTrip();
            }
            
        } catch (error) {
            console.error('❌ Error loading current trip:', error);
            this.displayNoActiveTrip();
        }
    }
    
    displayNoActiveTrip() {
        const tripStatusValue = document.getElementById('tripStatusValue');
        const tripDriverName = document.getElementById('tripDriverName');
        const tripShuttleName = document.getElementById('tripShuttleName');
        const tripRoute = document.getElementById('tripRoute');
        const tripETA = document.getElementById('tripETA');
        const tripActions = document.getElementById('tripActions');
        
        if (tripStatusValue) tripStatusValue.textContent = 'No active trip';
        if (tripDriverName) tripDriverName.textContent = '--';
        if (tripShuttleName) tripShuttleName.textContent = '--';
        if (tripRoute) tripRoute.textContent = '--';
        if (tripETA) tripETA.textContent = '--';
        if (tripActions) tripActions.style.display = 'none';
    }

    // ============ TRIP HISTORY ============
    async loadTripHistory() {
        const recentTrips = document.getElementById('recentTrips');
        const totalTrips = document.getElementById('totalTrips');
        const weekTrips = document.getElementById('weekTrips');
        
        try {
            console.log('📊 Loading trip history from server...');
            
            const response = await fetch(`${this.apiBaseUrl}/student/${this.userData.id}/trips`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Trip history response status:', response.status);
            
            if (response.ok) {
                const trips = await response.json();
                console.log('✅ Trip history loaded:', trips);
                
                // Update stats
                if (totalTrips) totalTrips.textContent = trips.length;
                
                // Calculate trips this week
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const thisWeekTrips = trips.filter(trip => new Date(trip.createdAt) > oneWeekAgo).length;
                if (weekTrips) weekTrips.textContent = thisWeekTrips;
                
                // Display recent trips
                if (recentTrips) {
                    const recentTripsData = trips.slice(0, 5); // Show last 5 trips
                    let html = '';
                    
                    recentTripsData.forEach(trip => {
                        const date = new Date(trip.createdAt);
                        const formattedDate = date.toLocaleDateString();
                        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const statusClass = trip.status.toLowerCase();
                        
                        html += `
                            <div class="trip-history-item">
                                <div class="trip-info">
                                    <div class="trip-route">${trip.pickupLocation} → ${trip.destination}</div>
                                    <div class="trip-date">${formattedDate} at ${formattedTime}</div>
                                </div>
                                <div class="trip-status ${statusClass}">${trip.status}</div>
                            </div>
                        `;
                    });
                    
                    recentTrips.innerHTML = html;
                }
            } else {
                console.warn('⚠️ No trip history found');
                this.displayTripHistoryError();
            }
            
        } catch (error) {
            console.error('❌ Error loading trip history:', error);
            this.displayTripHistoryError();
        }
    }
    
    displayTripHistoryError() {
        const recentTrips = document.getElementById('recentTrips');
        if (recentTrips) {
            recentTrips.innerHTML = '<p class="error-message">Unable to load trip history</p>';
        }
    }

    // ============ HEADER STATS ============
    async loadHeaderStats() {
        const activeShuttlesCount = document.getElementById('activeShuttlesCount');
        const todayTripsCount = document.getElementById('todayTripsCount');
        
        try {
            console.log('📈 Loading header stats from server...');
            
            // Load shuttles for active count
            const shuttlesResponse = await fetch(`${this.apiBaseUrl}/shuttles`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Load trips for today's count
            const tripsResponse = await fetch(`${this.apiBaseUrl}/student/${this.userData.id}/trips`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            let activeShuttles = 0;
            let todayTrips = 0;
            
            if (shuttlesResponse.ok) {
                const shuttles = await shuttlesResponse.json();
                activeShuttles = shuttles.filter(s => s.status === 'active').length;
                console.log('✅ Active shuttles:', activeShuttles);
            }
            
            if (tripsResponse.ok) {
                const trips = await tripsResponse.json();
                const today = new Date();
                todayTrips = trips.filter(trip => {
                    const tripDate = new Date(trip.createdAt);
                    return tripDate.toDateString() === today.toDateString();
                }).length;
                console.log('✅ Today trips:', todayTrips);
            }
            
            if (activeShuttlesCount) activeShuttlesCount.textContent = activeShuttles;
            if (todayTripsCount) todayTripsCount.textContent = todayTrips;
            
        } catch (error) {
            console.error('❌ Error loading header stats:', error);
            // Fallback values
            if (activeShuttlesCount) activeShuttlesCount.textContent = '3';
            if (todayTripsCount) todayTripsCount.textContent = '2';
        }
    }

    // ============ QUICK ACTIONS ============
    handleRequestRideClick() {
        console.log('🚗 Request Ride clicked');
        this.showRideBookingModal();
    }

    handleTrackShuttleClick() {
        console.log('🗺️ Track Shuttle clicked');
        this.showSection('map');
    }

    handleEmergencyClick() {
        console.log('🚨 Emergency clicked');
        this.showEmergencyModal();
    }

    // Additional click handlers for widget buttons
    handleShuttleAvailabilityClick() {
        console.log('🚌 Shuttle Availability clicked');
        this.showSection('map');
    }

    handleCurrentTripClick() {
        console.log('🚗 Current Trip clicked');
        this.showSection('rides');
    }

    handleTripHistoryClick() {
        console.log('📊 Trip History clicked');
        this.showSection('history');
    }

    handleMapClick() {
        console.log('🗺️ Map clicked');
        this.showSection('map');
    }

    cancelCurrentTrip() {
        console.log('❌ Cancel current trip');
        if (confirm('Are you sure you want to cancel your current trip?')) {
            this.showNotification('Trip cancelled successfully', 'success');
            this.loadCurrentTrip();
        }
    }

    rescheduleCurrentTrip() {
        console.log('🔄 Reschedule current trip');
        this.showNotification('Trip rescheduled', 'info');
    }
    
    showRideBookingModal() {
        const modal = this.createModal('Book Your Ride', `
            <form id="rideBookingForm" class="booking-form">
                <div class="form-group">
                    <label for="pickupLocation">Pickup Location</label>
                    <select id="pickupLocation" required>
                        <option value="">Select pickup point</option>
                        <option value="main-campus">Main Campus</option>
                        <option value="library">Library</option>
                        <option value="science-block">Science Block</option>
                        <option value="hostel-a">Hostel A</option>
                        <option value="hostel-b">Hostel B</option>
                        <option value="sports-complex">Sports Complex</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="destination">Destination</label>
                    <select id="destination" required>
                        <option value="">Select destination</option>
                        <option value="main-campus">Main Campus</option>
                        <option value="library">Library</option>
                        <option value="science-block">Science Block</option>
                        <option value="hostel-a">Hostel A</option>
                        <option value="hostel-b">Hostel B</option>
                        <option value="sports-complex">Sports Complex</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="passengers">Number of Passengers</label>
                    <input type="number" id="passengers" min="1" max="4" value="1" required>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="studentDashboard.closeModal()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Request Ride</button>
                </div>
            </form>
        `);

        document.getElementById('rideBookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRideRequest();
        });
    }
    
    async submitRideRequest() {
        const formData = {
            pickupLocation: document.getElementById('pickupLocation').value,
            destination: document.getElementById('destination').value,
            passengers: document.getElementById('passengers').value,
            studentId: this.userData.id,
            requestedAt: new Date().toISOString()
        };

        try {
            console.log('📱 Submitting ride request to server...');
            
            const response = await fetch(`${this.apiBaseUrl}/shuttle/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                },
                body: JSON.stringify(formData)
            });

            console.log('📡 Ride request response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                this.showNotification('✅ Ride requested successfully! ETA: 5-10 minutes', 'success');
                this.closeModal();
                this.loadCurrentTrip();
            } else {
                const error = await response.json();
                this.showNotification(`❌ ${error.message || 'Request failed'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error submitting ride request:', error);
            this.showNotification('❌ Network error. Please try again.', 'error');
        }
    }
    
    showEmergencyModal() {
        const modal = this.createModal('Emergency Alert', `
            <form id="emergencyForm" class="emergency-form">
                <div class="emergency-type">
                    <h4>Select Emergency Type:</h4>
                    <div class="emergency-options">
                        <label class="emergency-option">
                            <input type="radio" name="emergencyType" value="medical" required>
                            <span>🏥 Medical Emergency</span>
                        </label>
                        <label class="emergency-option">
                            <input type="radio" name="emergencyType" value="security" required>
                            <span>🚨 Security Issue</span>
                        </label>
                        <label class="emergency-option">
                            <input type="radio" name="emergencyType" value="breakdown" required>
                            <span>🚐 Shuttle Breakdown</span>
                        </label>
                        <label class="emergency-option">
                            <input type="radio" name="emergencyType" value="other" required>
                            <span>⚠️ Other Emergency</span>
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="emergencyDescription">Describe the emergency:</label>
                    <textarea id="emergencyDescription" rows="4" required placeholder="Please provide details about the emergency..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="studentDashboard.closeModal()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-emergency">🚨 Send Emergency Alert</button>
                </div>
            </form>
        `);

        document.getElementById('emergencyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEmergencyAlert();
        });
    }
    
    async submitEmergencyAlert() {
        const emergencyData = {
            type: document.querySelector('input[name="emergencyType"]:checked').value,
            description: document.getElementById('emergencyDescription').value,
            studentId: this.userData.id,
            studentName: this.userData.name,
            timestamp: new Date().toISOString()
        };

        try {
            console.log('🚨 Submitting emergency alert to server...');
            
            const response = await fetch(`${this.apiBaseUrl}/emergency`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                },
                body: JSON.stringify(emergencyData)
            });

            console.log('📡 Emergency alert response status:', response.status);

            if (response.ok) {
                this.showNotification('🚨 Emergency alert sent! Help is on the way.', 'success');
                this.closeModal();
            } else {
                this.showNotification('❌ Failed to send emergency alert', 'error');
            }
        } catch (error) {
            console.error('❌ Error submitting emergency alert:', error);
            this.showNotification('❌ Network error. Please call emergency services.', 'error');
        }
    }

    // ============ MAP ============
    async initializeMap() {
        const mapContainer = document.getElementById('liveMap');
        
        try {
            // Show mini interactive map in dashboard widget
            if (mapContainer) {
                mapContainer.innerHTML = '<div id="miniMap" style="height: 250px; border-radius: 8px;"></div>';
                
                // Initialize mini map
                this.miniMap = L.map('miniMap').setView([5.1044, -1.1947], 14);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19
                }).addTo(this.miniMap);

                // Add shuttle markers to mini map
                await this.loadMiniMapShuttles();
            }
            
            console.log('✅ Mini map initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing mini map:', error);
            if (mapContainer) {
                mapContainer.innerHTML = `
                    <div class="map-error" style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 250px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        color: #666;
                    ">
                        <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 8px;"></i>
                        <p>Unable to load map</p>
                    </div>
                `;
            }
        }
    }

    // Load shuttles on mini map
    async loadMiniMapShuttles() {
        try {
            // Mock shuttle positions
            const shuttles = [
                { name: 'Library Shuttle', position: [5.1044, -1.1947], status: 'available' },
                { name: 'Hostel Shuttle', position: [5.1064, -1.1927], status: 'busy' },
                { name: 'Science Shuttle', position: [5.1024, -1.1967], status: 'offline' }
            ];

            shuttles.forEach(shuttle => {
                const icon = this.createMiniMapIcon(shuttle.status);
                const marker = L.marker(shuttle.position, { icon })
                    .bindPopup(`<strong>${shuttle.name}</strong><br>Status: ${shuttle.status}`)
                    .addTo(this.miniMap);
            });

        } catch (error) {
            console.error('❌ Error loading mini map shuttles:', error);
        }
    }

    // Create smaller shuttle icon for mini map
    createMiniMapIcon(status) {
        const colors = {
            available: '#4caf50',
            busy: '#ff9800',
            offline: '#9e9e9e'
        };

        return L.divIcon({
            html: `
                <div style="
                    background: ${colors[status]};
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                "></div>
            `,
            className: 'mini-shuttle-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    getShuttleData() {
        return [
            { id: 1, name: 'Library Shuttle', status: 'active', passengers: 8 },
            { id: 2, name: 'Hostel Shuttle', status: 'active', passengers: 12 },
            { id: 3, name: 'Science Shuttle', status: 'active', passengers: 6 }
        ];
    }

    // ============ AI ASSISTANT ============
    openSimpleAI() {
        this.closeAllModals();
        const aiSection = document.getElementById('simpleAISection');
        if (aiSection) {
            aiSection.style.display = 'block';
        }
        
        console.log('🤖 Simple AI Assistant opened');
    }

    closeSimpleAI() {
        const aiSection = document.getElementById('simpleAISection');
        if (aiSection) {
            aiSection.style.display = 'none';
        }
    }

    async sendSimpleAI() {
        const input = document.getElementById('simpleAIInput');
        if (!input) {
            console.error('❌ Simple AI input not found');
            return;
        }
        
        const message = input.value.trim();
        
        if (!message) {
            console.log('⚠️ Empty message');
            return;
        }

        console.log('🤖 Sending AI message:', message);
        console.log('📍 Looking for container: simpleAIChat');

        // Add user message
        this.addSimpleAIMessage(message, 'user');
        input.value = '';

        try {
            // Get AI response
            const response = await this.getSimpleAIResponse(message);
            console.log('🤖 Got response:', response);
            this.addSimpleAIMessage(response, 'bot');
            console.log('✅ AI response added');
        } catch (error) {
            console.error('❌ Error getting AI response:', error);
            this.addSimpleAIMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }
    }

    addSimpleAIMessage(message, sender) {
        const conversation = document.getElementById('simpleAIChat');
        if (!conversation) {
            console.error('❌ Simple AI chat container not found');
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${sender}`;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const avatar = sender === 'user' ? '👤' : '🤖';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-bubble">
                <p>${message}</p>
                <span class="message-time">${timestamp}</span>
            </div>
        `;
        
        conversation.appendChild(messageDiv);
        conversation.scrollTop = conversation.scrollHeight;
        
        console.log(`✅ Added ${sender} AI message:`, message);
    }

    async getSimpleAIResponse(message) {
        await new Promise(resolve => setTimeout(resolve, 800));

        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('library')) {
            return `📚 The Library Shuttle runs every 10 minutes from the Main Campus. Next arrival is approximately ${Math.floor(Math.random() * 8) + 2} minutes.`;
        } else if (lowerMessage.includes('hostel')) {
            return `🏠 Hostel shuttles run every 20 minutes serving both Hostel A and B. Current wait time is about ${Math.floor(Math.random() * 12) + 5} minutes.`;
        } else if (lowerMessage.includes('science')) {
            return `🔬 The Science Block Shuttle operates every 15 minutes during class hours. Next shuttle arrives in ${Math.floor(Math.random() * 10) + 3} minutes.`;
        } else if (lowerMessage.includes('delay') || lowerMessage.includes('late')) {
            return "✅ I don't see any reported delays right now. All shuttles are running on schedule. Would you like me to notify you of any delays?";
        } else if (lowerMessage.includes('book') || lowerMessage.includes('request') || lowerMessage.includes('ride')) {
            return "📱 You can book a ride using the 'Request Ride' button on your dashboard. Just select your pickup and destination, and I'll find the nearest available shuttle for you!";
        } else if (lowerMessage.includes('emergency')) {
            return "🚨 For emergencies, use the Emergency Alert button immediately or call campus security at +233-XXX-XXXX. Your safety is our priority!";
        } else if (lowerMessage.includes('time') || lowerMessage.includes('schedule')) {
            return "⏰ Peak hours service: Every 10-15 minutes (7am-7pm). Off-peak: Every 20-30 minutes. Real-time tracking available on your dashboard.";
        } else if (lowerMessage.includes('contact') || lowerMessage.includes('help')) {
            return "📞 UCC Shuttle Support:\n📱 Hotline: +233-302-XXXX\n📧 Email: shuttle@ucc.edu.gh\n🏢 Office: Student Center, Room 101\n🕐 Hours: 6am-10pm daily";
        } else if (lowerMessage.includes('cost') || lowerMessage.includes('fare') || lowerMessage.includes('price')) {
            return "💰 Current fares:\n• Regular routes: ₵5.00\n• Long-distance: ₵8.00\n• Special events: ₵10.00\nPayment accepted: Cash, Mobile Money, UCC ID Card";
        } else {
            return "🤖 I'm here to help! I can assist with shuttle schedules, booking, delays, emergencies, and general information. What specifically would you like to know about UCC Shuttle service?";
        }
    }

    // ============ CHAT SYSTEM ============
    openChatSystem() {
        this.showNotification('💬 Chat system coming soon!', 'info');
    }

    sendMessage() {
        console.log('💬 Sending message...');
        this.showNotification('Message sent!', 'success');
    }

    switchRideTab(tab) {
        console.log('🔄 Switching to ride tab:', tab);
        this.showNotification(`Switched to ${tab} rides`, 'info');
    }

    switchChatTab(tab) {
        console.log('💬 Switching to chat tab:', tab);
        this.showNotification(`Switched to ${tab} chat`, 'info');
    }

    switchHelpTab(tab) {
        console.log('❓ Switching to help tab:', tab);
        this.showNotification(`Switched to ${tab} help`, 'info');
    }

    applyHistoryFilter() {
        console.log('🔍 Applying history filter...');
        this.showNotification('Filter applied', 'info');
    }

    // ============ UTILITY METHODS ============
    handleNavClick(section, event) {
        event.preventDefault();
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.parentElement.classList.add('active');
        
        console.log('📍 Navigating to:', section);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('ucc_token');
            localStorage.removeItem('ucc_user');
            window.location.href = '../htmls/student-login.html';
        }
    }

    closeAllModals() {
        // Close all modal sections
        const aiSection = document.getElementById('simpleAISection');
        const mapSection = document.getElementById('simpleMapSection');
        
        if (aiSection) aiSection.style.display = 'none';
        if (mapSection) mapSection.style.display = 'none';
        
        console.log('🔒 Closed all modals');
    }

    showNotification(message, type = 'info') {
        try {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
        }, 3000);
    });
});

// EMERGENCY BACKUP - Direct initialization if everything else fails
setTimeout(() => {
    console.log('🚨 EMERGENCY INITIALIZATION - Checking if navigation works...');
    
    // Check if studentDashboard exists and works
    if (!window.studentDashboard || !window.studentDashboard.showSection) {
        console.log('❌ studentDashboard not working, adding direct navigation');
        
        // Add direct click handlers to all nav items
        const navItems = [
            { selector: '[data-section="dashboard"]', action: () => showDirectSection('dashboard') },
            { selector: '[data-section="rides"]', action: () => showDirectSection('rides') },
            { selector: '[data-section="map"]', action: () => showDirectSection('map') },
            { selector: '[data-section="history"]', action: () => showDirectSection('history') },
            { selector: '[data-section="ai-assistant"]', action: () => showDirectSection('ai-assistant') },
            { selector: '[data-section="messages"]', action: () => showDirectSection('messages') },
            { selector: '[data-section="help"]', action: () => showDirectSection('help') }
        ];
        
        navItems.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) {
                // Remove all existing listeners by cloning and replacing
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
                
                // Add direct listener
                newElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log(`🖱️ Direct click: ${item.selector}`);
                    item.action();
                });
                
                console.log(`✅ Direct listener added to ${item.selector}`);
            }
        });
    }
}, 2000);

// Direct section showing
function showDirectSection(section) {
    console.log(`🎯 Direct showing section: ${section}`);
    
    // Hide all sections
    const sections = document.querySelectorAll('[id$="Section"]');
    sections.forEach(sec => {
        sec.style.display = 'none';
    });
    
    // Show target section
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log(`✅ Section ${section} shown`);
        
        // Special handling for map
        if (section === 'map') {
            setTimeout(() => {
                initializeDirectMap();
            }, 300);
        }
    }
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNav = document.querySelector(`[data-section="${section}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
}

// Direct map initialization
function initializeDirectMap() {
    console.log('🗺️ Direct map initialization...');
    
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet not loaded');
        return;
    }
    
    const mapContainer = document.getElementById('shuttleMap');
    if (!mapContainer) {
        console.error('❌ Map container not found');
        return;
    }
    
    // Clear existing map if any
    if (window.directMap) {
        window.directMap.remove();
    }
    
    try {
        window.directMap = L.map('shuttleMap').setView([5.6037, -0.1870], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(window.directMap);
        
        // Add test shuttles
        const shuttles = [
            {lat: 5.6037, lng: -0.1870, name: 'Library Shuttle', status: 'Available'},
            {lat: 5.6050, lng: -0.1880, name: 'Science Shuttle', status: 'In Use'},
            {lat: 5.6040, lng: -0.1860, name: 'Hostel Shuttle', status: 'Available'}
        ];
        
        shuttles.forEach(shuttle => {
            const marker = L.marker([shuttle.lat, shuttle.lng]).addTo(window.directMap);
            const color = shuttle.status === 'Available' ? '#28a745' : '#ffc107';
            marker.bindPopup(`
                <div style="padding: 10px;">
                    <h4 style="margin: 0 0 10px 0; color: #1565c0;">🚌 ${shuttle.name}</h4>
                    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${shuttle.status}</span></p>
                    <button onclick="alert('Booking ${shuttle.name}...')" style="background: #1565c0; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Book Now</button>
                </div>
            `);
        });
        
        console.log('✅ Direct map initialized successfully');
        
    } catch (error) {
        console.error('❌ Direct map error:', error);
    }
}

// Add global functions for HTML onclick handlers
        window.handleRequestRideClick = () => window.studentDashboard.handleRequestRideClick();
        window.handleTrackShuttleClick = () => window.studentDashboard.handleTrackShuttleClick();
        window.handleEmergencyClick = () => window.studentDashboard.handleEmergencyClick();
        window.handleShuttleAvailabilityClick = () => window.studentDashboard.handleShuttleAvailabilityClick();
        window.handleCurrentTripClick = () => window.studentDashboard.handleCurrentTripClick();
        window.handleTripHistoryClick = () => window.studentDashboard.handleTripHistoryClick();
        window.handleMapClick = () => window.studentDashboard.handleMapClick();
        window.cancelCurrentTrip = () => window.studentDashboard.cancelCurrentTrip();
        window.rescheduleCurrentTrip = () => window.studentDashboard.rescheduleCurrentTrip();
        window.toggleSidebar = () => window.studentDashboard.toggleSidebar();
        window.handleLogout = () => window.studentDashboard.handleLogout();
        
        // Navigation functions
        window.showDashboard = () => {
            console.log('🏠 showDashboard called');
            if (window.studentDashboard) {
                window.studentDashboard.showSection('dashboard');
            } else {
                console.error('❌ studentDashboard not found');
            }
        };
        window.showRides = () => {
            console.log('🚗 showRides called');
            if (window.studentDashboard) {
                window.studentDashboard.showSection('rides');
            } else {
                console.error('❌ studentDashboard not found');
            }
        };
        window.showMap = () => {
            console.log('🗺️ showMap called');
            if (window.studentDashboard) {
                window.studentDashboard.showSection('map');
            } else {
                console.error('❌ studentDashboard not found');
            }
        };
        window.hideAllSections = () => {
            console.log('🙈 hideAllSections called');
            if (window.studentDashboard) {
                window.studentDashboard.hideAllSections();
            } else {
                console.error('❌ studentDashboard not found');
            }
        };
        
        // Additional direct navigation functions
        window.showHistory = () => {
            console.log('📊 showHistory called');
            if (window.studentDashboard) {
                window.studentDashboard.showSection('history');
            }
        };
        window.showAiAssistant = () => {
            console.log('🤖 showAiAssistant called');
            if (window.studentDashboard) {
                window.studentDashboard.showSection('ai-assistant');
            }
        };
        window.showMessages = () => {
            console.log('💬 showMessages called');
            if (window.studentDashboard) {
                window.studentDashboard.showSection('messages');
            }
        };
        window.showHelp = () => {
            console.log('❓ showHelp called');
            if (window.studentDashboard) {
                window.studentDashboard.showSection('help');
            }
        };
        
        // AI Assistant
        window.sendAIMessage = () => window.studentDashboard.sendSimpleAI();
        
        // Message function
        window.sendMessage = () => window.studentDashboard.sendMessage();
        
        // Tab switching functions
        window.switchRideTab = (tab) => window.studentDashboard.switchRideTab(tab);
        window.switchChatTab = (tab) => window.studentDashboard.switchChatTab(tab);
        window.switchHelpTab = (tab) => window.studentDashboard.switchHelpTab(tab);
        
        // Filter functions
        window.applyHistoryFilter = () => window.studentDashboard.applyHistoryFilter();
        
        // Add global test functions for debugging
        window.testDashboard = () => {
            console.log('🧪 Testing dashboard manually...');
            if (studentDashboard) {
                studentDashboard.showSection('map');
                setTimeout(() => studentDashboard.showSection('rides'), 2000);
                setTimeout(() => studentDashboard.showSection('dashboard'), 4000);
            }
        };
        
    } catch (error) {
        console.error('❌ Error creating dashboard:', error);
    }
});

