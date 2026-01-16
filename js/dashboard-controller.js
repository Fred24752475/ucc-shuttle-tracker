/**
 * UCC Shuttle Tracker - Unified Dashboard Controller
 * Provides modular dashboard functionality for drivers and admins
 */

class UCCDashboard {
    constructor(role, user) {
        this.role = role; // 'driver' | 'admin'
        this.user = user;
        this.currentSection = 'dashboard';
        this.socket = null;
        this.components = {};
        this.data = {
            trips: [],
            routes: [],
            shuttles: [],
            users: [],
            messages: []
        };
        
        console.log(`🚀 UCC Dashboard initialized for ${role}:`, user);
        
        this.init();
    }
    
    // Initialize dashboard
    init() {
        this.setupSocketConnection();
        this.setupNavigation();
        this.loadInitialData();
        this.showSection('dashboard');
    }
    
    // Setup WebSocket connection for real-time updates
    setupSocketConnection() {
        try {
            this.socket = io('http://localhost:3001', {
                auth: {
                    token: localStorage.getItem('ucc_token')
                }
            });
            
            this.socket.on('connect', () => {
                console.log('📡 Connected to real-time updates');
            });
            
            this.socket.on('shuttle-location', (data) => {
                this.updateShuttleLocation(data);
            });
            
            this.socket.on('new-message', (data) => {
                this.addNewMessage(data);
            });
            
            this.socket.on('emergency-alert', (data) => {
                this.handleEmergencyAlert(data);
            });
            
        } catch (error) {
            console.error('❌ Socket connection failed:', error);
        }
    }
    
    // Setup navigation event handlers
    setupNavigation() {
        // Override the global handleNavClick function
        window.handleNavClick = (section, event) => {
            event.preventDefault();
            this.navigateTo(section);
        };
        
        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key >= '1' && e.key <= '9') {
                const sections = ['dashboard', 'routes', 'shuttle', 'trips', 'messages', 'help', 'users', 'shuttles'];
                const sectionIndex = parseInt(e.key) - 1;
                if (sections[sectionIndex]) {
                    this.navigateTo(sections[sectionIndex]);
                }
            }
        });
    }
    
    // Core navigation system
    navigateTo(section) {
        console.log(`🧭 Navigating to: ${section}`);
        
        // Hide all sections
        this.hideAllSections();
        
        // Show selected section
        this.showSection(section);
        
        // Update active navigation
        this.updateActiveNav(section);
        
        // Load section data
        this.loadSectionData(section);
        
        this.currentSection = section;
    }
    
    // Hide all dashboard sections
    hideAllSections() {
        const sections = [
            'dashboard-section', 'routes-section', 'shuttle-section', 
            'trips-section', 'messages-section', 'help-section',
            'users-section', 'shuttles-section'
        ];
        
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.style.display = 'none';
                element.classList.remove('active');
            }
        });
    }
    
    // Show specific section
    showSection(section) {
        const sectionMap = {
            'dashboard': 'dashboard-section',
            'routes': 'routes-section',
            'shuttle': 'shuttle-section',
            'trips': 'trips-section',
            'messages': 'messages-section',
            'help': 'help-section',
            'users': 'users-section',
            'shuttles': 'shuttles-section'
        };
        
        const sectionId = sectionMap[section];
        if (sectionId) {
            const element = document.getElementById(sectionId);
            if (element) {
                element.style.display = 'block';
                element.classList.add('active');
            }
        }
    }
    
    // Update active navigation item
    updateActiveNav(section) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`[data-section="${section}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }
    }
    
    // Load data for specific section
    async loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'routes':
                await this.loadRoutesData();
                break;
            case 'shuttle':
                await this.loadShuttleStatus();
                break;
            case 'trips':
                await this.loadTripsHistory();
                break;
            case 'messages':
                await this.loadMessages();
                break;
            case 'help':
                this.showHelpContent();
                break;
            case 'users':
                await this.loadUsersData();
                break;
            case 'shuttles':
                await this.loadShuttlesData();
                break;
        }
    }
    
    // Load initial dashboard data
    async loadInitialData() {
        try {
            console.log('📊 Loading initial dashboard data...');
            
            // Load basic stats
            const statsResponse = await fetch('http://localhost:3001/api/user/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });
            
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                this.updateDashboardStats(stats);
            }
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
        }
    }
    
    // Load dashboard-specific data
    async loadDashboardData() {
        console.log('📊 Loading dashboard data...');
        
        try {
            const response = await fetch('http://localhost:3001/api/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderDashboardContent(data);
            }
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showErrorMessage('Failed to load dashboard data');
        }
    }
    
    // Render dashboard content
    renderDashboardContent(data) {
        // Update user info
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = this.user.name || 'Driver';
        }
        
        // Update stats
        const todayTripsElement = document.getElementById('todayTripsCount');
        if (todayTripsElement) {
            todayTripsElement.textContent = data.todayTrips || 0;
        }
        
        const passengersElement = document.getElementById('passengersCount');
        if (passengersElement) {
            passengersElement.textContent = data.totalPassengers || 0;
        }
        
        // Update status
        const statusElement = document.getElementById('shiftStatus');
        if (statusElement) {
            statusElement.textContent = data.shiftStatus || 'Off Duty';
        }
        
        console.log('✅ Dashboard content rendered:', data);
    }
    
    // Update dashboard statistics
    updateDashboardStats(stats) {
        // Implementation for updating stats elements
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = stats[key];
            }
        });
    }
    
    // Load routes data with map
    async loadRoutesData() {
        console.log('🗺️ Loading routes data...');
        
        try {
            const response = await fetch('http://localhost:3001/api/routes', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderRoutesContent(data);
                this.initializeRoutesMap(data.routes);
            }
        } catch (error) {
            console.error('❌ Error loading routes:', error);
            this.showErrorMessage('Failed to load routes');
        }
    }
    
    // Render routes with map
    renderRoutesContent(data) {
        console.log('🗺️ Rendering routes content:', data);
        // Implementation for routes section
        this.data.routes = data.routes || [];
    }
    
    // Initialize Leaflet.js map for routes
    initializeRoutesMap(routes) {
        try {
            // Initialize map if it doesn't exist
            if (!window.routesMap) {
                window.routesMap = L.map('routes-map').setView([5.5, -0.2], 13);
                
                // Add tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(window.routesMap);
                
                // Add route markers
                routes.forEach(route => {
                    if (route.startLocation && route.endLocation) {
                        const marker = L.marker([route.startLocation.lat, route.startLocation.lng])
                            .addTo(window.routesMap)
                            .bindPopup(`<b>${route.name}</b><br>${route.description}`);
                        
                        // Draw route line
                        if (route.endLocation) {
                            const routeLine = L.polyline([
                                [route.startLocation.lat, route.startLocation.lng],
                                [route.endLocation.lat, route.endLocation.lng]
                            ], {
                                color: '#ff6b35',
                                weight: 4,
                                opacity: 0.7
                            }).addTo(window.routesMap);
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error initializing routes map:', error);
        }
    }
    
    // Load shuttle status
    async loadShuttleStatus() {
        console.log('🚌 Loading shuttle status...');
        
        try {
            const response = await fetch('http://localhost:3001/api/shuttle/status', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderShuttleStatus(data);
                this.initializeShuttleMap(data);
            }
        } catch (error) {
            console.error('❌ Error loading shuttle status:', error);
            this.showErrorMessage('Failed to load shuttle status');
        }
    }
    
    // Render shuttle status
    renderShuttleStatus(data) {
        console.log('🚌 Rendering shuttle status:', data);
        
        // Update status elements
        const statusText = document.getElementById('driverStatusText');
        if (statusText) {
            statusText.textContent = data.status || 'Ready';
        }
        
        const currentRoute = document.getElementById('currentRoute');
        if (currentRoute) {
            currentRoute.textContent = data.currentRoute || '--';
        }
        
        const assignedShuttle = document.getElementById('assignedShuttle');
        if (assignedShuttle) {
            assignedShuttle.textContent = data.shuttleNumber || '--';
        }
        
        this.data.shuttles = [data];
    }
    
    // Initialize shuttle tracking map
    initializeShuttleMap(shuttleData) {
        try {
            if (!window.shuttleMap) {
                window.shuttleMap = L.map('shuttle-map').setView([5.5, -0.2], 13);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(window.shuttleMap);
            }
            
            // Update shuttle location
            if (shuttleData.location && shuttleData.location.lat && shuttleData.location.lng) {
                if (window.shuttleMarker) {
                    window.shuttleMarker.setLatLng([shuttleData.location.lat, shuttleData.location.lng]);
                } else {
                    window.shuttleMarker = L.marker([shuttleData.location.lat, shuttleData.location.lng])
                        .addTo(window.shuttleMap)
                        .bindPopup(`<b>Shuttle ${shuttleData.number}</b><br>Status: ${shuttleData.status}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error initializing shuttle map:', error);
        }
    }
    
    // Update shuttle location in real-time
    updateShuttleLocation(data) {
        if (window.shuttleMarker && data.latitude && data.longitude) {
            window.shuttleMarker.setLatLng([data.latitude, data.longitude]);
            window.shuttleMap.panTo([data.latitude, data.longitude]);
        }
        
        console.log('📍 Shuttle location updated:', data);
    }
    
    // Load trips history
    async loadTripsHistory() {
        console.log('📋 Loading trips history...');
        
        try {
            const response = await fetch('http://localhost:3001/api/trips/history', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderTripsHistory(data.trips);
            }
        } catch (error) {
            console.error('❌ Error loading trips history:', error);
            this.showErrorMessage('Failed to load trips history');
        }
    }
    
    // Render trips history
    renderTripsHistory(trips) {
        console.log('📋 Rendering trips history:', trips);
        
        const tripsContainer = document.getElementById('tripsList');
        if (tripsContainer) {
            tripsContainer.innerHTML = '';
            
            trips.forEach(trip => {
                const tripElement = this.createTripElement(trip);
                tripsContainer.appendChild(tripElement);
            });
        }
        
        this.data.trips = trips;
    }
    
    // Create trip element
    createTripElement(trip) {
        const div = document.createElement('div');
        div.className = 'trip-item';
        div.innerHTML = `
            <div class="trip-header">
                <span class="trip-destination">${trip.destination}</span>
                <span class="trip-time">${new Date(trip.timestamp).toLocaleString()}</span>
            </div>
            <div class="trip-details">
                <div class="trip-info">
                    <span class="trip-label">Route:</span>
                    <span class="trip-value">${trip.route || 'N/A'}</span>
                </div>
                <div class="trip-info">
                    <span class="trip-label">Status:</span>
                    <span class="trip-status ${trip.status}">${trip.status}</span>
                </div>
                <div class="trip-info">
                    <span class="trip-label">Passengers:</span>
                    <span class="trip-value">${trip.passengers || 0}</span>
                </div>
            </div>
        `;
        
        return div;
    }
    
    // Load messages
    async loadMessages() {
        console.log('💬 Loading messages...');
        
        try {
            const response = await fetch('http://localhost:3001/api/messages', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderMessages(data.messages);
            }
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            this.showErrorMessage('Failed to load messages');
        }
    }
    
    // Render messages
    renderMessages(messages) {
        console.log('💬 Rendering messages:', messages);
        
        const messagesContainer = document.getElementById('messagesList');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            
            messages.forEach(message => {
                const messageElement = this.createMessageElement(message);
                messagesContainer.appendChild(messageElement);
            });
        }
        
        this.data.messages = messages;
    }
    
    // Create message element
    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message-item ${message.sender === this.user.id ? 'sent' : 'received'}`;
        div.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.senderName}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;
        
        return div;
    }
    
    // Add new message
    addNewMessage(message) {
        this.data.messages.unshift(message);
        this.renderMessages(this.data.messages);
        
        // Update message badge
        const badgeElement = document.getElementById('messageBadge');
        if (badgeElement) {
            const unreadCount = this.data.messages.filter(m => !m.read).length;
            badgeElement.textContent = unreadCount;
            badgeElement.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
    }
    
    // Show help content
    showHelpContent() {
        console.log('❓ Showing help content');
        
        const helpContainer = document.getElementById('helpContent');
        if (helpContainer) {
            helpContainer.innerHTML = `
                <div class="help-sections">
                    <div class="help-category">
                        <h3>🚌 Getting Started</h3>
                        <ul>
                            <li>How to start your shift</li>
                            <li>How to update your location</li>
                            <li>How to accept trip requests</li>
                        </ul>
                    </div>
                    <div class="help-category">
                        <h3>🗺️ Routes & Navigation</h3>
                        <ul>
                            <li>View assigned routes</li>
                            <li>Update route status</li>
                            <li>Report route issues</li>
                        </ul>
                    </div>
                    <div class="help-category">
                        <h3>🚨 Emergency Procedures</h3>
                        <ul>
                            <li>How to send emergency alerts</li>
                            <li>Emergency contact protocols</li>
                            <li>Safety guidelines</li>
                        </ul>
                    </div>
                    <div class="help-category">
                        <h3>📱 Technical Support</h3>
                        <ul>
                            <li>App troubleshooting</li>
                            <li>Report technical issues</li>
                            <li>Contact support team</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }
    
    // Load users data (admin only)
    async loadUsersData() {
        if (this.role !== 'admin') {
            console.log('⚠️ Users data access denied - not admin');
            return;
        }
        
        console.log('👥 Loading users data...');
        
        try {
            const response = await fetch('http://localhost:3001/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderUsersData(data.users);
            }
        } catch (error) {
            console.error('❌ Error loading users data:', error);
            this.showErrorMessage('Failed to load users data');
        }
    }
    
    // Render users data
    renderUsersData(users) {
        console.log('👥 Rendering users data:', users);
        
        const usersContainer = document.getElementById('usersList');
        if (usersContainer) {
            usersContainer.innerHTML = '';
            
            users.forEach(user => {
                const userElement = this.createUserElement(user);
                usersContainer.appendChild(userElement);
            });
        }
        
        this.data.users = users;
    }
    
    // Create user element
    createUserElement(user) {
        const div = document.createElement('div');
        div.className = `user-item ${user.status}`;
        div.innerHTML = `
            <div class="user-avatar">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=${user.role === 'admin' ? '9c27b0' : 'ff6b35'}&color=fff" alt="${user.name}">
            </div>
            <div class="user-details">
                <div class="user-name">${user.name}</div>
                <div class="user-email">${user.email}</div>
                <div class="user-role">${user.role}</div>
                <div class="user-status ${user.status}">${user.status}</div>
            </div>
            <div class="user-actions">
                <button class="action-btn small" onclick="dashboard.editUser('${user.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn small ${user.status === 'active' ? 'warning' : 'success'}" onclick="dashboard.toggleUserStatus('${user.id}')">
                    <i class="fas fa-${user.status === 'active' ? 'pause' : 'play'}"></i> ${user.status === 'active' ? 'Disable' : 'Enable'}
                </button>
            </div>
        `;
        
        return div;
    }
    
    // Load shuttles data (admin only)
    async loadShuttlesData() {
        if (this.role !== 'admin') {
            console.log('⚠️ Shuttles data access denied - not admin');
            return;
        }
        
        console.log('🚌 Loading shuttles data...');
        
        try {
            const response = await fetch('http://localhost:3001/api/admin/shuttles', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderShuttlesData(data.shuttles);
                this.initializeShuttlesMap(data.shuttles);
            }
        } catch (error) {
            console.error('❌ Error loading shuttles data:', error);
            this.showErrorMessage('Failed to load shuttles data');
        }
    }
    
    // Render shuttles data
    renderShuttlesData(shuttles) {
        console.log('🚌 Rendering shuttles data:', shuttles);
        
        const shuttlesContainer = document.getElementById('shuttlesList');
        if (shuttlesContainer) {
            shuttlesContainer.innerHTML = '';
            
            shuttles.forEach(shuttle => {
                const shuttleElement = this.createShuttleElement(shuttle);
                shuttlesContainer.appendChild(shuttleElement);
            });
        }
        
        this.data.shuttles = shuttles;
    }
    
    // Create shuttle element
    createShuttleElement(shuttle) {
        const div = document.createElement('div');
        div.className = `shuttle-item ${shuttle.status}`;
        div.innerHTML = `
            <div class="shuttle-header">
                <span class="shuttle-number">${shuttle.licensePlate}</span>
                <span class="shuttle-status ${shuttle.status}">${shuttle.status}</span>
            </div>
            <div class="shuttle-details">
                <div class="shuttle-info">
                    <span class="shuttle-label">Driver:</span>
                    <span class="shuttle-value">${shuttle.driverName || 'Unassigned'}</span>
                </div>
                <div class="shuttle-info">
                    <span class="shuttle-label">Capacity:</span>
                    <span class="shuttle-value">${shuttle.capacity}</span>
                </div>
                <div class="shuttle-info">
                    <span class="shuttle-label">Location:</span>
                    <span class="shuttle-value">${shuttle.lastLocation || 'Unknown'}</span>
                </div>
            </div>
            <div class="shuttle-actions">
                <button class="action-btn small" onclick="dashboard.trackShuttle('${shuttle.id}')">
                    <i class="fas fa-map-marker-alt"></i> Track
                </button>
                <button class="action-btn small" onclick="dashboard.assignShuttle('${shuttle.id}')">
                    <i class="fas fa-user-plus"></i> Assign Driver
                </button>
            </div>
        `;
        
        return div;
    }
    
    // Initialize shuttles map (admin view)
    initializeShuttlesMap(shuttles) {
        try {
            if (!window.shuttlesMap) {
                window.shuttlesMap = L.map('shuttles-map').setView([5.5, -0.2], 13);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(window.shuttlesMap);
                
                // Add shuttle markers
                shuttles.forEach(shuttle => {
                    if (shuttle.location && shuttle.location.lat && shuttle.location.lng) {
                        const color = shuttle.status === 'active' ? '#00ff00' : shuttle.status === 'maintenance' ? '#ff0000' : '#ff6600';
                        
                        const marker = L.marker([shuttle.location.lat, shuttle.location.lng], {
                            icon: L.divIcon({
                                html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${shuttle.licensePlate}</div>`,
                                className: 'shuttle-marker',
                                iconSize: [20, 20]
                            })
                        }).addTo(window.shuttlesMap)
                        .bindPopup(`<b>${shuttle.licensePlate}</b><br>Driver: ${shuttle.driverName || 'Unassigned'}<br>Status: ${shuttle.status}`);
                        
                        // Store marker reference
                        shuttle.marker = marker;
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error initializing shuttles map:', error);
        }
    }
    
    // Handle emergency alerts
    handleEmergencyAlert(alert) {
        console.log('🚨 Emergency alert received:', alert);
        
        // Show emergency notification
        this.showEmergencyNotification(alert);
        
        // Update emergency status
        const emergencyStatus = document.getElementById('emergencyStatus');
        if (emergencyStatus) {
            emergencyStatus.textContent = 'ACTIVE';
            emergencyStatus.className = 'emergency-status active';
        }
    }
    
    // Show emergency notification
    showEmergencyNotification(alert) {
        const notification = document.createElement('div');
        notification.className = 'emergency-notification';
        notification.innerHTML = `
            <div class="emergency-content">
                <h3>🚨 EMERGENCY ALERT</h3>
                <p><strong>${alert.message}</strong></p>
                <p><strong>Location:</strong> ${alert.location || 'Unknown'}</p>
                <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
                <button class="emergency-btn" onclick="this.dismissEmergency()">Acknowledge</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 30000);
    }
    
    // Dismiss emergency alert
    dismissEmergency() {
        const notifications = document.querySelectorAll('.emergency-notification');
        notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        const emergencyStatus = document.getElementById('emergencyStatus');
        if (emergencyStatus) {
            emergencyStatus.textContent = 'Normal';
            emergencyStatus.className = 'emergency-status';
        }
    }
    
    // Show error message
    showErrorMessage(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }
    
    // Dashboard action methods
    startShift() {
        console.log('▶️ Starting shift...');
        // Implementation for starting shift
        this.updateShiftStatus('On Duty');
    }
    
    endShift() {
        console.log('⏹️ Ending shift...');
        // Implementation for ending shift
        this.updateShiftStatus('Off Duty');
    }
    
    emergencyAlert() {
        console.log('🚨 Sending emergency alert...');
        // Implementation for emergency alert
        this.sendEmergencyAlert();
    }
    
    updateShiftStatus(status) {
        const statusElement = document.getElementById('shiftStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        // Update via API
        this.sendStatusUpdate(status);
    }
    
    sendStatusUpdate(status) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('status-update', {
                userId: this.user.id,
                status: status,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    sendEmergencyAlert() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('emergency-alert', {
                userId: this.user.id,
                message: 'Emergency alert from driver',
                timestamp: new Date().toISOString(),
                location: this.getCurrentLocation()
            });
        }
    }
    
    getCurrentLocation() {
        // Implementation for getting current location
        return 'Current location unavailable';
    }
    
    // Admin methods
    editUser(userId) {
        console.log(`✏️ Editing user: ${userId}`);
        // Implementation for editing user
    }
    
    toggleUserStatus(userId) {
        console.log(`🔄 Toggling user status: ${userId}`);
        // Implementation for toggling user status
    }
    
    trackShuttle(shuttleId) {
        console.log(`🚌 Tracking shuttle: ${shuttleId}`);
        // Implementation for tracking specific shuttle
        this.focusOnShuttle(shuttleId);
    }
    
    assignShuttle(shuttleId) {
        console.log(`👥 Assigning shuttle: ${shuttleId}`);
        // Implementation for assigning shuttle to driver
    }
    
    focusOnShuttle(shuttleId) {
        const shuttle = this.data.shuttles.find(s => s.id === shuttleId);
        if (shuttle && shuttle.marker && window.shuttlesMap) {
            window.shuttlesMap.panTo(shuttle.marker.getLatLng());
            shuttle.marker.openPopup();
        }
    }
}

// Export for global access
window.UCCDashboard = UCCDashboard;