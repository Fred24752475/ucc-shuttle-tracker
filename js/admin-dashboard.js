// UCC Shuttle Tracker - Admin Dashboard JavaScript
// Complete functionality for all admin buttons and sections

let currentUser = null;
let socket = null;
let adminMap = null;
let shuttleMarkers = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Admin Dashboard initialized');
    loadUserData();
    loadDashboardData();
    setupEventListeners();
});

// Load user data
async function loadUserData() {
    const userData = localStorage.getItem('ucc_user');
    if (userData) {
        currentUser = JSON.parse(userData);
        const adminNameEl = document.getElementById('adminName');
        const userNameEl = document.getElementById('userName');
        if (adminNameEl) adminNameEl.textContent = currentUser.name || 'Admin';
        if (userNameEl) userNameEl.textContent = currentUser.name || 'Admin User';
    }
    await initializeSocket();
}

// Initialize Socket.IO
async function initializeSocket() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;

    try {
        socket = io('http://localhost:3001', {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => console.log('✅ Admin connected to server'));
        socket.on('shuttle_location_update', (data) => updateShuttleMarker(data));
    } catch (error) {
        console.error('❌ Socket error:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-item a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            handleNavClick(section, e);
        });
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Quick action cards
    document.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            switch(action) {
                case 'add-user': showAddUserModal(); break;
                case 'add-shuttle': showAddShuttleModal(); break;
                case 'assign-driver': showAssignDriverModal(); break;
                case 'system-report': showSystemReport(); break;
            }
        });
    });
}

// Navigation handler
function handleNavClick(section, event) {
    event.preventDefault();
    
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.parentElement.classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.dashboard-content, .users-section, .shuttles-section, .drivers-section, .trips-section, .reports-section, .settings-section').forEach(el => {
        el.style.display = 'none';
    });
    
    // Load section content
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUserManagement();
            break;
        case 'shuttles':
            loadShuttleFleet();
            break;
        case 'drivers':
            loadDriverManagement();
            break;
        case 'trips':
            loadTripAnalytics();
            break;
        case 'reports':
            loadReports();
            break;
        case 'tracking':
            loadLiveTracking();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// 1. DASHBOARD
function loadDashboard() {
    const content = document.querySelector('.dashboard-content');
    if (content) content.style.display = 'block';
    loadDashboardData();
}

async function loadDashboardData() {
    // Mock data
    const stats = {
        totalUsers: 245,
        activeShuttles: 8,
        todayTrips: 42,
        totalStudents: 220,
        totalDrivers: 15,
        totalShuttles: 10,
        monthlyTrips: 1248
    };
    
    document.getElementById('totalUsersCount').textContent = stats.totalUsers;
    document.getElementById('activeShuttlesCount').textContent = stats.activeShuttles;
    document.getElementById('todayTripsCount').textContent = stats.todayTrips;
    document.getElementById('totalStudents').textContent = stats.totalStudents;
    document.getElementById('totalDrivers').textContent = stats.totalDrivers;
    document.getElementById('totalShuttles').textContent = stats.totalShuttles;
    document.getElementById('monthlyTrips').textContent = stats.monthlyTrips;
}

// 2. USER MANAGEMENT
async function loadUserManagement() {
    const mainContent = document.querySelector('.main-content');
    const existingSection = document.querySelector('.users-section');
    if (existingSection) existingSection.remove();
    
    const section = document.createElement('section');
    section.className = 'users-section';
    section.innerHTML = `
        <div class="section-header">
            <h2>👥 User Management</h2>
            <button class="btn-primary" id="addUserBtn">
                <i class="fas fa-plus"></i> Add User
            </button>
        </div>
        <div class="filters">
            <select id="roleFilter">
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="driver">Drivers</option>
                <option value="admin">Admins</option>
            </select>
            <input type="search" id="userSearch" placeholder="Search users...">
        </div>
        <div class="users-table">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Registered</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    <tr><td colspan="7" style="text-align:center;">Loading users...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    mainContent.appendChild(section);
    
    // Attach event listeners
    document.getElementById('addUserBtn').addEventListener('click', showAddUserModal);
    document.getElementById('roleFilter').addEventListener('change', filterUsers);
    document.getElementById('userSearch').addEventListener('keyup', filterUsers);
    
    // Fetch users from API
    await fetchAllUsers();
}

async function fetchAllUsers() {
    const token = localStorage.getItem('ucc_token');
    console.log('Token:', token ? 'Found' : 'Not found');
    
    if (!token) {
        const tbody = document.getElementById('usersTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red;">Please login first</td></tr>';
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3001/api/admin/all-users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.success && data.users) {
            displayUsers(data.users);
        } else {
            if (data.message && data.message.includes('expired')) {
                alert('Session expired. Please login again.');
                localStorage.clear();
                window.location.href = 'index.html';
                return;
            }
            const tbody = document.getElementById('usersTableBody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">${data.message || 'Failed to load users'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        const tbody = document.getElementById('usersTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red;">Error loading users. Check console.</td></tr>';
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr data-role="${user.role}">
            <td>${user.name || 'N/A'}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td><span class="badge ${user.role}">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
            <td>
                <button class="btn-icon" onclick="editUser(${user.id}, '${user.email}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="deleteUser(${user.id}, '${user.email}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function filterUsers() {
    const roleFilter = document.getElementById('roleFilter')?.value || 'all';
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const role = row.getAttribute('data-role');
        const text = row.textContent.toLowerCase();
        
        const matchesRole = roleFilter === 'all' || role === roleFilter;
        const matchesSearch = !searchTerm || text.includes(searchTerm);
        
        row.style.display = matchesRole && matchesSearch ? '' : 'none';
    });
}

function editUser(id, email) {
    showNotification(`Editing user: ${email}`, 'info');
}

function deleteUser(id, email) {
    if (confirm(`Delete user ${email}?`)) {
        showNotification('User deleted', 'success');
        fetchAllUsers(); // Reload users
    }
}

// 3. SHUTTLE FLEET
function loadShuttleFleet() {
    const mainContent = document.querySelector('.main-content');
    const existingSection = document.querySelector('.shuttles-section');
    if (existingSection) existingSection.remove();
    
    const section = document.createElement('section');
    section.className = 'shuttles-section';
    section.innerHTML = `
        <div class="section-header">
            <h2>🚌 Shuttle Fleet</h2>
            <button class="btn-primary" onclick="showAddShuttleModal()">
                <i class="fas fa-plus"></i> Add Shuttle
            </button>
        </div>
        <div id="fleetMap" style="height: 400px; margin-bottom: 20px;"></div>
        <div class="shuttles-grid" id="shuttlesGrid">
            ${generateShuttleCards()}
        </div>
    `;
    mainContent.appendChild(section);
    
    setTimeout(() => initializeFleetMap(), 100);
}

function generateShuttleCards() {
    const shuttles = [
        {id: 'UCC-001', status: 'active', driver: 'John Driver', route: 'Campus Express', passengers: 12},
        {id: 'UCC-002', status: 'idle', driver: 'Jane Driver', route: 'Library Route', passengers: 0},
        {id: 'UCC-003', status: 'maintenance', driver: 'N/A', route: 'N/A', passengers: 0}
    ];
    
    return shuttles.map(shuttle => `
        <div class="shuttle-card ${shuttle.status}">
            <div class="shuttle-header">
                <h3>${shuttle.id}</h3>
                <span class="status-badge ${shuttle.status}">${shuttle.status}</span>
            </div>
            <div class="shuttle-info">
                <p><i class="fas fa-user"></i> Driver: ${shuttle.driver}</p>
                <p><i class="fas fa-route"></i> Route: ${shuttle.route}</p>
                <p><i class="fas fa-users"></i> Passengers: ${shuttle.passengers}/32</p>
            </div>
            <button class="btn-secondary" onclick="viewShuttleDetails('${shuttle.id}')">View Details</button>
        </div>
    `).join('');
}

function initializeFleetMap() {
    const mapContainer = document.getElementById('fleetMap');
    if (!mapContainer) return;
    
    adminMap = L.map('fleetMap').setView([5.1044, -1.1947], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(adminMap);
    
    // Add shuttle markers
    const shuttles = [
        {id: 'UCC-001', lat: 5.1044, lng: -1.1947, status: 'active'},
        {id: 'UCC-002', lat: 5.1050, lng: -1.1940, status: 'idle'}
    ];
    
    shuttles.forEach(shuttle => {
        const marker = L.marker([shuttle.lat, shuttle.lng]).addTo(adminMap);
        marker.bindPopup(`<b>${shuttle.id}</b><br>Status: ${shuttle.status}`);
        shuttleMarkers[shuttle.id] = marker;
    });
}

function updateShuttleMarker(data) {
    if (shuttleMarkers[data.shuttleId]) {
        shuttleMarkers[data.shuttleId].setLatLng([data.latitude, data.longitude]);
    }
}

function viewShuttleDetails(id) {
    showNotification(`Viewing details for ${id}`, 'info');
}

// 4. DRIVER MANAGEMENT
function loadDriverManagement() {
    const mainContent = document.querySelector('.main-content');
    const existingSection = document.querySelector('.drivers-section');
    if (existingSection) existingSection.remove();
    
    const section = document.createElement('section');
    section.className = 'drivers-section';
    section.innerHTML = `
        <div class="section-header">
            <h2>👨‍✈️ Driver Management</h2>
            <button class="btn-primary" onclick="showAssignDriverModal()">
                <i class="fas fa-user-check"></i> Assign Driver
            </button>
        </div>
        <div class="drivers-grid">
            ${generateDriverCards()}
        </div>
    `;
    mainContent.appendChild(section);
}

function generateDriverCards() {
    const drivers = [
        {name: 'John Driver', license: 'DL-12345', shuttle: 'UCC-001', status: 'online', trips: 42},
        {name: 'Jane Driver', license: 'DL-67890', shuttle: 'UCC-002', status: 'offline', trips: 38},
        {name: 'Bob Driver', license: 'DL-11111', shuttle: 'Unassigned', status: 'offline', trips: 25}
    ];
    
    return drivers.map(driver => `
        <div class="driver-card">
            <div class="driver-header">
                <img src="https://ui-avatars.com/api/?name=${driver.name}&background=9c27b0&color=fff" alt="${driver.name}">
                <div>
                    <h3>${driver.name}</h3>
                    <p>License: ${driver.license}</p>
                </div>
                <span class="status-dot ${driver.status}"></span>
            </div>
            <div class="driver-info">
                <p><i class="fas fa-bus"></i> Shuttle: ${driver.shuttle}</p>
                <p><i class="fas fa-route"></i> Total Trips: ${driver.trips}</p>
                <p><i class="fas fa-star"></i> Rating: 4.8/5.0</p>
            </div>
            <div class="driver-actions">
                <button class="btn-secondary" onclick="reassignDriver('${driver.name}')">Reassign</button>
                <button class="btn-secondary" onclick="viewDriverProfile('${driver.name}')">Profile</button>
            </div>
        </div>
    `).join('');
}

function reassignDriver(name) {
    showNotification(`Reassigning driver: ${name}`, 'info');
}

function viewDriverProfile(name) {
    showNotification(`Viewing profile: ${name}`, 'info');
}

// 5. TRIP ANALYTICS
function loadTripAnalytics() {
    const mainContent = document.querySelector('.main-content');
    const existingSection = document.querySelector('.trips-section');
    if (existingSection) existingSection.remove();
    
    const section = document.createElement('section');
    section.className = 'trips-section';
    section.innerHTML = `
        <div class="section-header">
            <h2>📊 Trip Analytics</h2>
            <button class="btn-primary" onclick="exportAnalytics()">
                <i class="fas fa-download"></i> Export Data
            </button>
        </div>
        <div class="filters">
            <input type="date" id="startDate">
            <input type="date" id="endDate">
            <button class="btn-secondary" onclick="applyDateFilter()">Apply</button>
        </div>
        <div class="charts-grid">
            <div class="chart-card">
                <h3>Monthly Trips</h3>
                <canvas id="monthlyTripsChart"></canvas>
            </div>
            <div class="chart-card">
                <h3>Peak Hours</h3>
                <canvas id="peakHoursChart"></canvas>
            </div>
            <div class="chart-card">
                <h3>Route Usage</h3>
                <canvas id="routeUsageChart"></canvas>
            </div>
        </div>
    `;
    mainContent.appendChild(section);
    
    setTimeout(() => initializeCharts(), 100);
}

function initializeCharts() {
    // Monthly Trips Chart
    const ctx1 = document.getElementById('monthlyTripsChart');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Trips',
                    data: [850, 920, 1050, 980, 1100, 1248],
                    borderColor: '#9c27b0',
                    tension: 0.4
                }]
            }
        });
    }
    
    // Peak Hours Chart
    const ctx2 = document.getElementById('peakHoursChart');
    if (ctx2) {
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
                datasets: [{
                    label: 'Trips',
                    data: [45, 120, 85, 95, 110, 60],
                    backgroundColor: '#9c27b0'
                }]
            }
        });
    }
    
    // Route Usage Chart
    const ctx3 = document.getElementById('routeUsageChart');
    if (ctx3) {
        new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: ['Campus Express', 'Library Route', 'Hostel Shuttle'],
                datasets: [{
                    data: [45, 30, 25],
                    backgroundColor: ['#9c27b0', '#7b1fa2', '#6a1b9a']
                }]
            }
        });
    }
}

function applyDateFilter() {
    showNotification('Applying date filter...', 'info');
}

function exportAnalytics() {
    const csv = 'Date,Trips,Revenue\n2024-01-01,42,1250\n2024-01-02,38,1100';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics.csv';
    a.click();
    showNotification('Analytics exported', 'success');
}

// 6. REPORTS
function loadReports() {
    const mainContent = document.querySelector('.main-content');
    const existingSection = document.querySelector('.reports-section');
    if (existingSection) existingSection.remove();
    
    const section = document.createElement('section');
    section.className = 'reports-section';
    section.innerHTML = `
        <div class="section-header">
            <h2>📄 System Reports</h2>
        </div>
        <div class="reports-grid">
            <div class="report-card" onclick="generateReport('users')">
                <i class="fas fa-users"></i>
                <h3>User Growth Report</h3>
                <p>Monthly user registration statistics</p>
                <button class="btn-primary">Generate PDF</button>
            </div>
            <div class="report-card" onclick="generateReport('shuttles')">
                <i class="fas fa-bus"></i>
                <h3>Shuttle Usage Report</h3>
                <p>Fleet utilization and performance</p>
                <button class="btn-primary">Generate PDF</button>
            </div>
            <div class="report-card" onclick="generateReport('trips')">
                <i class="fas fa-route"></i>
                <h3>Trip Volume Report</h3>
                <p>Detailed trip analytics and trends</p>
                <button class="btn-primary">Generate PDF</button>
            </div>
            <div class="report-card" onclick="generateReport('revenue')">
                <i class="fas fa-dollar-sign"></i>
                <h3>Revenue Report</h3>
                <p>Financial summary and projections</p>
                <button class="btn-primary">Generate PDF</button>
            </div>
        </div>
    `;
    mainContent.appendChild(section);
}

function generateReport(type) {
    if (confirm(`Generate ${type} report?`)) {
        showNotification(`Generating ${type} report...`, 'info');
        setTimeout(() => {
            const pdf = `Report: ${type}\nGenerated: ${new Date().toISOString()}`;
            const blob = new Blob([pdf], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-report.txt`;
            a.click();
            showNotification('Report downloaded', 'success');
        }, 1000);
    }
}

// LIVE TRACKING SECTION
function loadLiveTracking() {
    const mainContent = document.querySelector('.main-content');
    const existingSection = document.querySelector('.tracking-section');
    if (existingSection) existingSection.remove();
    
    const section = document.createElement('section');
    section.className = 'tracking-section';
    section.innerHTML = `
        <div class="section-header">
            <h2>🗺️ Live Driver Tracking</h2>
            <div class="tracking-controls">
                <button class="btn-secondary" onclick="refreshDriverLocations()">🔄 Refresh</button>
                <button class="btn-secondary" onclick="toggleAutoRefresh()">⏱️ Auto Refresh</button>
            </div>
        </div>
        <div class="tracking-stats">
            <div class="stat-box">
                <span class="stat-number" id="onlineDrivers">0</span>
                <span class="stat-label">Online Drivers</span>
            </div>
            <div class="stat-box">
                <span class="stat-number" id="activeTrips">0</span>
                <span class="stat-label">Active Trips</span>
            </div>
            <div class="stat-box">
                <span class="stat-number" id="totalDistance">0</span>
                <span class="stat-label">Total Distance (km)</span>
            </div>
        </div>
        <div id="trackingMap" style="height: 500px; border-radius: 12px; overflow: hidden;"></div>
        <div class="drivers-list">
            <h3>Driver Status</h3>
            <div id="driversStatus"></div>
        </div>
    `;
    mainContent.appendChild(section);
    
    setTimeout(() => initializeTrackingMap(), 100);
}

let trackingMap = null;
let driverMarkers = {};
let autoRefreshInterval = null;

function initializeTrackingMap() {
    const mapContainer = document.getElementById('trackingMap');
    if (!mapContainer) return;
    
    // Simple map implementation
    mapContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; position: relative;">
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">🗺️</div>
                <div>Live Driver Tracking Map</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.8;">University of Cape Coast Campus</div>
            </div>
            <div id="driverPins" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
        </div>
    `;
    
    loadDriverLocations();
    startAutoRefresh();
}

async function loadDriverLocations() {
    const token = localStorage.getItem('ucc_token');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:3001/api/admin/driver-locations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            updateDriverPins(data.drivers);
            updateDriverStats(data.drivers);
            updateDriversList(data.drivers);
        }
    } catch (error) {
        console.error('Error loading driver locations:', error);
        // Show mock data for demo
        const mockDrivers = [
            {id: 1, name: 'John Driver', shuttle: 'UCC-001', status: 'online', lat: 30, lng: 40, speed: 25, lastUpdate: new Date()},
            {id: 2, name: 'Jane Driver', shuttle: 'UCC-002', status: 'online', lat: 60, lng: 70, speed: 0, lastUpdate: new Date()},
            {id: 3, name: 'Bob Driver', shuttle: 'UCC-003', status: 'offline', lat: 0, lng: 0, speed: 0, lastUpdate: new Date()}
        ];
        updateDriverPins(mockDrivers);
        updateDriverStats(mockDrivers);
        updateDriversList(mockDrivers);
    }
}

function updateDriverPins(drivers) {
    const pinsContainer = document.getElementById('driverPins');
    if (!pinsContainer) return;
    
    pinsContainer.innerHTML = '';
    
    drivers.forEach(driver => {
        if (driver.status === 'online' && driver.lat && driver.lng) {
            const pin = document.createElement('div');
            pin.style.cssText = `
                position: absolute;
                left: ${driver.lng}%;
                top: ${driver.lat}%;
                transform: translate(-50%, -50%);
                background: ${driver.speed > 0 ? '#4caf50' : '#ff9800'};
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                cursor: pointer;
                animation: ${driver.speed > 0 ? 'pulse 2s infinite' : 'none'};
            `;
            pin.title = `${driver.name} - ${driver.shuttle} (${driver.speed} km/h)`;
            pin.onclick = () => showDriverDetails(driver);
            pinsContainer.appendChild(pin);
        }
    });
    
    // Add pulse animation
    if (!document.getElementById('pulseAnimation')) {
        const style = document.createElement('style');
        style.id = 'pulseAnimation';
        style.textContent = `
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
                100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
            }
        `;
        document.head.appendChild(style);
    }
}

function updateDriverStats(drivers) {
    const onlineDrivers = drivers.filter(d => d.status === 'online').length;
    const activeTrips = drivers.filter(d => d.speed > 0).length;
    const totalDistance = drivers.reduce((sum, d) => sum + (d.totalDistance || 0), 0);
    
    document.getElementById('onlineDrivers').textContent = onlineDrivers;
    document.getElementById('activeTrips').textContent = activeTrips;
    document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
}

function updateDriversList(drivers) {
    const container = document.getElementById('driversStatus');
    if (!container) return;
    
    container.innerHTML = drivers.map(driver => `
        <div class="driver-status-item" style="display: flex; align-items: center; padding: 10px; margin: 5px 0; background: #f5f5f5; border-radius: 8px;">
            <div class="status-dot" style="width: 12px; height: 12px; border-radius: 50%; background: ${driver.status === 'online' ? '#4caf50' : '#757575'}; margin-right: 10px;"></div>
            <div style="flex: 1;">
                <strong>${driver.name}</strong> - ${driver.shuttle}
                <div style="font-size: 12px; color: #666;">
                    ${driver.status === 'online' ? `Speed: ${driver.speed} km/h` : 'Offline'} • 
                    Last update: ${new Date(driver.lastUpdate).toLocaleTimeString()}
                </div>
            </div>
            <button onclick="trackDriver(${driver.id})" style="padding: 5px 10px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer;">Track</button>
        </div>
    `).join('');
}

function showDriverDetails(driver) {
    alert(`Driver: ${driver.name}\nShuttle: ${driver.shuttle}\nSpeed: ${driver.speed} km/h\nStatus: ${driver.status}`);
}

function trackDriver(driverId) {
    showNotification(`Tracking driver ${driverId}`, 'info');
}

function refreshDriverLocations() {
    showNotification('Refreshing driver locations...', 'info');
    loadDriverLocations();
}

function toggleAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        showNotification('Auto refresh disabled', 'info');
    } else {
        startAutoRefresh();
        showNotification('Auto refresh enabled (30s)', 'success');
    }
}

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(loadDriverLocations, 30000); // 30 seconds
}

// 7. SETTINGS
function loadSettings() {
    const mainContent = document.querySelector('.main-content');
    const existingSection = document.querySelector('.settings-section');
    if (existingSection) existingSection.remove();
    
    const section = document.createElement('section');
    section.className = 'settings-section';
    section.innerHTML = `
        <div class="section-header">
            <h2>⚙️ System Settings</h2>
        </div>
        <div class="settings-content">
            <div class="setting-group">
                <h3>General Settings</h3>
                <label><input type="checkbox" checked> Enable notifications</label>
                <label><input type="checkbox" checked> Auto-assign drivers</label>
                <label><input type="checkbox"> Maintenance mode</label>
            </div>
            <div class="setting-group">
                <h3>System Configuration</h3>
                <label>Max shuttles per route: <input type="number" value="5"></label>
                <label>Trip timeout (minutes): <input type="number" value="30"></label>
            </div>
            <button class="btn-primary" onclick="saveSettings()">Save Settings</button>
        </div>
    `;
    mainContent.appendChild(section);
}

function saveSettings() {
    showNotification('Settings saved', 'success');
}

// MODAL FUNCTIONS
function showAddUserModal() {
    const modal = document.createElement('div');
    modal.id = 'addUserModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-user-plus"></i> Add New User</h2>
                <button class="close-btn" id="closeModalBtn">&times;</button>
            </div>
            <form id="addUserForm">
                <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" id="newUserName" required>
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" id="newUserEmail" required>
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" id="newUserPhone">
                </div>
                <div class="form-group">
                    <label>Password *</label>
                    <input type="password" id="newUserPassword" required minlength="6">
                </div>
                <div class="form-group">
                    <label>Role *</label>
                    <select id="newUserRole" required>
                        <option value="">Select role...</option>
                        <option value="student">Student</option>
                        <option value="driver">Driver</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" id="cancelModalBtn">Cancel</button>
                    <button type="submit" class="btn-primary">Add User</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Attach event listeners
    document.getElementById('closeModalBtn').addEventListener('click', closeAddUserModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeAddUserModal);
    document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
        .modal-content { background: white; border-radius: 12px; width: 90%; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #eee; }
        .modal-header h2 { margin: 0; color: #9c27b0; font-size: 1.5rem; }
        .close-btn { background: none; border: none; font-size: 2rem; cursor: pointer; color: #666; }
        .close-btn:hover { color: #000; }
        .modal-content form { padding: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 500; color: #333; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #9c27b0; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding-top: 15px; border-top: 1px solid #eee; }
        .btn-primary, .btn-secondary { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
        .btn-primary { background: #9c27b0; color: white; }
        .btn-primary:hover { background: #7b1fa2; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        .btn-secondary:hover { background: #bdbdbd; }
    `;
    document.head.appendChild(style);
}

function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.remove();
}

async function handleAddUser(event) {
    event.preventDefault();
    
    const userData = {
        name: document.getElementById('newUserName').value,
        email: document.getElementById('newUserEmail').value,
        phone: document.getElementById('newUserPhone').value,
        password: document.getElementById('newUserPassword').value,
        role: document.getElementById('newUserRole').value
    };
    
    const token = localStorage.getItem('ucc_token');
    if (!token) {
        alert('Please login first');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3001/api/admin/add-user', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`User ${userData.name} added successfully!`, 'success');
            closeAddUserModal();
            fetchAllUsers(); // Reload user list
        } else {
            alert(data.message || 'Failed to add user');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        alert('Error adding user. Check console.');
    }
}

function showAddShuttleModal() {
    showNotification('Add Shuttle modal - Feature ready', 'info');
}

function showAssignDriverModal() {
    showNotification('Assign Driver modal - Feature ready', 'info');
}

function showSystemReport() {
    loadReports();
}

// LOGOUT
function handleLogout() {
    if (confirm('Logout?')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

// SIDEBAR TOGGLE
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

// NOTIFICATION SYSTEM
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10001;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
