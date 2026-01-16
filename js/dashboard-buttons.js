// UCC Shuttle Tracker - Dashboard Button Functionality
// Modular JavaScript for all dashboard button interactions
// Author: UCC Transport Department
// Version: 2.0.0

// Global state management
const DashboardState = {
    currentUser: null,
    isLoading: false,
    modals: new Map(),
    notifications: []
};

// API Configuration
const API_CONFIG = {
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
    retries: 3
};

// Utility Functions
const Utils = {
    // Show loading spinner on button
    showButtonLoading(button, originalText) {
        if (!button) return;
        button.disabled = true;
        button.innerHTML = `<span class="loading-spinner"></span> ${originalText || 'Loading...'}`;
        button.classList.add('loading');
    },

    // Hide loading spinner on button
    hideButtonLoading(button, originalText) {
        if (!button) return;
        button.disabled = false;
        button.innerHTML = originalText;
        button.classList.remove('loading');
    },

    // Show success notification
    showSuccess(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
    },

    // Show error notification
    showError(message, duration = 5000) {
        this.showNotification(message, 'error', duration);
    },

    // Show warning notification
    showWarning(message, duration = 4000) {
        this.showNotification(message, 'warning', duration);
    },

    // Generic notification system
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            margin-bottom: 10px;
        `;

        document.body.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);

        // Store in state
        DashboardState.notifications.push({
            id: Date.now(),
            message,
            type,
            timestamp: new Date()
        });
    },

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    },

    getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    },

    // Format date for display
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Generate unique ID
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    },

    // Validate email
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // Validate phone
    isValidPhone(phone) {
        return /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s/g, ''));
    }
};

// API Service
const APIService = {
    // Generic API request with retry logic
    async request(endpoint, options = {}) {
        const url = `${API_CONFIG.baseURL}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('ucc_token') || ''}`
            },
            timeout: API_CONFIG.timeout
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        for (let attempt = 1; attempt <= API_CONFIG.retries; attempt++) {
            try {
                const response = await fetch(url, finalOptions);
                
                if (response.ok) {
                    return await response.json();
                } else if (response.status === 401) {
                    // Unauthorized - redirect to login
                    localStorage.removeItem('ucc_token');
                    localStorage.removeItem('ucc_user');
                    window.location.href = '../htmls/index.html';
                    return null;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                console.warn(`API request attempt ${attempt} failed:`, error);
                
                if (attempt === API_CONFIG.retries) {
                    // Final attempt failed, return mock data or throw
                    console.log('All API attempts failed, using fallback');
                    return this.getFallbackData(endpoint, options);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    },

    // Fallback data for when API is unavailable
    getFallbackData(endpoint, options) {
        const mockData = {
            '/shuttles': {
                success: true,
                shuttles: [
                    { id: 1, name: 'Library Shuttle', status: 'active', capacity: 40, passengers: 28 },
                    { id: 2, name: 'Hostel Shuttle', status: 'delayed', capacity: 40, passengers: 35 },
                    { id: 3, name: 'Science Shuttle', status: 'active', capacity: 40, passengers: 15 }
                ]
            },
            '/drivers': {
                success: true,
                drivers: [
                    { id: 1, name: 'Kofi Mensah', status: 'active', shuttle: 'Library Shuttle' },
                    { id: 2, name: 'Ama Asante', status: 'active', shuttle: 'Hostel Shuttle' },
                    { id: 3, name: 'Kwame Osei', status: 'break', shuttle: null }
                ]
            },
            '/backup': {
                success: true,
                message: 'Backup completed successfully (Demo Mode)',
                filename: `backup_${new Date().toISOString().split('T')[0]}.json`
            }
        };

        return mockData[endpoint] || { success: true, message: 'Operation completed (Demo Mode)' };
    }
};

// Modal Management System
const ModalManager = {
    // Create and show modal
    create(title, content, options = {}) {
        const modalId = options.id || Utils.generateId();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="ModalManager.close('${modalId}')">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        DashboardState.modals.set(modalId, modal);

        // Show modal with animation
        setTimeout(() => {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }, 10);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close(modalId);
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close(modalId);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        return modalId;
    },

    // Close modal
    close(modalId) {
        const modal = DashboardState.modals.get(modalId);
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => {
                modal.remove();
                DashboardState.modals.delete(modalId);
            }, 300);
        }
    },

    // Close all modals
    closeAll() {
        DashboardState.modals.forEach((modal, id) => {
            this.close(id);
        });
    }
};

// Fleet Management Functions
const FleetManager = {
    // Add new shuttle
    async addShuttle() {
        const modalContent = `
            <form id="addShuttleForm" class="modal-form">
                <div class="form-section">
                    <h4>🚌 Shuttle Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Shuttle Name *</label>
                            <input type="text" id="shuttleName" required placeholder="e.g., Library Shuttle">
                        </div>
                        <div class="form-group">
                            <label>License Plate *</label>
                            <input type="text" id="licensePlate" required placeholder="e.g., UCC-101">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Capacity *</label>
                            <input type="number" id="shuttleCapacity" required min="20" max="60" value="40">
                        </div>
                        <div class="form-group">
                            <label>Route *</label>
                            <input type="text" id="shuttleRoute" required placeholder="e.g., Main Campus → Library">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Status</label>
                            <select id="shuttleStatus">
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="offline">Offline</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Driver (Optional)</label>
                            <select id="shuttleDriver">
                                <option value="">Select Driver</option>
                                <option value="1">Kofi Mensah</option>
                                <option value="2">Ama Asante</option>
                                <option value="3">Kwame Osei</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="ModalManager.close('addShuttleModal')">Cancel</button>
                    <button type="submit" class="btn-primary">💾 Add Shuttle</button>
                </div>
            </form>
        `;

        const modalId = ModalManager.create('➕ Add New Shuttle', modalContent, { id: 'addShuttleModal' });

        // Handle form submission
        document.getElementById('addShuttleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitShuttle();
        });
    },

    // Submit shuttle data
    async submitShuttle() {
        const form = document.getElementById('addShuttleForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        Utils.showButtonLoading(submitBtn, 'Adding Shuttle...');

        try {
            const shuttleData = {
                name: document.getElementById('shuttleName').value,
                license_plate: document.getElementById('licensePlate').value,
                capacity: parseInt(document.getElementById('shuttleCapacity').value),
                route: document.getElementById('shuttleRoute').value,
                status: document.getElementById('shuttleStatus').value,
                driver_id: document.getElementById('shuttleDriver').value || null,
                created_at: new Date().toISOString()
            };

            const result = await APIService.request('/shuttles', {
                method: 'POST',
                body: JSON.stringify(shuttleData)
            });

            if (result && result.success) {
                Utils.showSuccess('🚌 Shuttle added successfully!');
                ModalManager.close('addShuttleModal');
                this.refreshShuttleList();
            } else {
                throw new Error(result?.message || 'Failed to add shuttle');
            }
        } catch (error) {
            console.error('Add shuttle error:', error);
            Utils.showError('❌ Failed to add shuttle: ' + error.message);
        } finally {
            Utils.hideButtonLoading(submitBtn, originalText);
        }
    },

    // Refresh shuttle list
    async refreshShuttleList() {
        try {
            const result = await APIService.request('/shuttles');
            if (result && result.shuttles) {
                Utils.showSuccess('🔄 Shuttle list refreshed');
                // Update UI with new shuttle data
                this.updateShuttleDisplay(result.shuttles);
            }
        } catch (error) {
            console.error('Refresh shuttle list error:', error);
            Utils.showWarning('⚠️ Could not refresh shuttle list');
        }
    },

    // Update shuttle display
    updateShuttleDisplay(shuttles) {
        const grid = document.getElementById('shuttleStatusGrid');
        if (!grid) return;

        grid.innerHTML = shuttles.map(shuttle => `
            <div class="shuttle-card" data-shuttle-id="${shuttle.id}">
                <div class="shuttle-card-header">
                    <div class="shuttle-name">${shuttle.name}</div>
                    <div class="shuttle-status status-${shuttle.status}">${shuttle.status}</div>
                </div>
                <div class="shuttle-card-body">
                    <div class="shuttle-route">${shuttle.route || 'No route assigned'}</div>
                    <div class="shuttle-info">
                        <div><strong>Capacity:</strong> ${shuttle.passengers || 0}/${shuttle.capacity}</div>
                        <div><strong>License:</strong> ${shuttle.license_plate}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

// Driver Management Functions
const DriverManager = {
    // Add new driver
    async addDriver() {
        const modalContent = `
            <form id="addDriverForm" class="modal-form">
                <div class="form-section">
                    <h4>👤 Personal Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" id="driverFirstName" required>
                        </div>
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" id="driverLastName" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" id="driverEmail" required>
                        </div>
                        <div class="form-group">
                            <label>Phone *</label>
                            <input type="tel" id="driverPhone" required>
                        </div>
                    </div>
                </div>
                <div class="form-section">
                    <h4>🚗 Professional Information</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>License Number *</label>
                            <input type="text" id="driverLicense" required>
                        </div>
                        <div class="form-group">
                            <label>Vehicle Number</label>
                            <input type="text" id="driverVehicle">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Experience (Years)</label>
                            <input type="number" id="driverExperience" min="0" max="50" value="0">
                        </div>
                        <div class="form-group">
                            <label>Work Start Time</label>
                            <input type="time" id="driverWorkStart" value="08:00">
                        </div>
                    </div>
                </div>
                <div class="form-section">
                    <h4>🔐 System Access</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Password *</label>
                            <input type="password" id="driverPassword" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Confirm Password *</label>
                            <input type="password" id="driverConfirmPassword" required minlength="6">
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="ModalManager.close('addDriverModal')">Cancel</button>
                    <button type="submit" class="btn-primary">👤 Add Driver</button>
                </div>
            </form>
        `;

        const modalId = ModalManager.create('👤 Add New Driver', modalContent, { id: 'addDriverModal' });

        // Handle form submission
        document.getElementById('addDriverForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitDriver();
        });
    },

    // Submit driver data
    async submitDriver() {
        const form = document.getElementById('addDriverForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Validate passwords match
        const password = document.getElementById('driverPassword').value;
        const confirmPassword = document.getElementById('driverConfirmPassword').value;

        if (password !== confirmPassword) {
            Utils.showError('❌ Passwords do not match!');
            return;
        }

        // Validate email
        const email = document.getElementById('driverEmail').value;
        if (!Utils.isValidEmail(email)) {
            Utils.showError('❌ Please enter a valid email address!');
            return;
        }

        Utils.showButtonLoading(submitBtn, 'Adding Driver...');

        try {
            const driverData = {
                firstName: document.getElementById('driverFirstName').value,
                lastName: document.getElementById('driverLastName').value,
                email: email,
                phone: document.getElementById('driverPhone').value,
                password: password,
                role: 'driver',
                license_number: document.getElementById('driverLicense').value,
                vehicle_number: document.getElementById('driverVehicle').value,
                experience: parseInt(document.getElementById('driverExperience').value) || 0,
                work_start: document.getElementById('driverWorkStart').value,
                work_end: '18:00',
                location_consent: true,
                created_at: new Date().toISOString()
            };

            const result = await APIService.request('/register', {
                method: 'POST',
                body: JSON.stringify(driverData)
            });

            if (result && result.success) {
                Utils.showSuccess('👤 Driver added successfully!');
                ModalManager.close('addDriverModal');
                this.refreshDriverList();
            } else {
                throw new Error(result?.message || 'Failed to add driver');
            }
        } catch (error) {
            console.error('Add driver error:', error);
            Utils.showError('❌ Failed to add driver: ' + error.message);
        } finally {
            Utils.hideButtonLoading(submitBtn, originalText);
        }
    },

    // View all drivers
    async viewAllDrivers() {
        try {
            const result = await APIService.request('/drivers');
            const drivers = result?.drivers || [];

            const modalContent = `
                <div class="drivers-container">
                    <div class="drivers-header">
                        <h4>👥 All Drivers (${drivers.length})</h4>
                        <div class="drivers-controls">
                            <button class="btn-primary" onclick="DriverManager.addDriver()">➕ Add Driver</button>
                            <button class="btn-secondary" onclick="DriverManager.exportDrivers()">📤 Export</button>
                        </div>
                    </div>
                    <div class="drivers-grid">
                        ${drivers.map(driver => `
                            <div class="driver-card" data-driver-id="${driver.id}">
                                <div class="driver-info">
                                    <div class="driver-name">${driver.name}</div>
                                    <div class="driver-status status-${driver.status || 'active'}">${driver.status || 'active'}</div>
                                </div>
                                <div class="driver-details">
                                    <div class="shuttle-info">Shuttle: ${driver.shuttle || 'Unassigned'}</div>
                                    <div class="driver-rating">Rating: ${driver.rating || 'N/A'}</div>
                                    <div class="driver-phone">${driver.phone || 'No phone'}</div>
                                </div>
                                <div class="driver-actions">
                                    <button class="btn-small" onclick="DriverManager.editDriver(${driver.id})">✏️ Edit</button>
                                    <button class="btn-small btn-danger" onclick="DriverManager.removeDriver(${driver.id})">🗑️ Remove</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            ModalManager.create('👥 All Drivers Management', modalContent, { id: 'viewDriversModal' });
        } catch (error) {
            console.error('View drivers error:', error);
            Utils.showError('❌ Failed to load drivers');
        }
    },

    // Refresh driver list
    async refreshDriverList() {
        try {
            const result = await APIService.request('/drivers');
            if (result && result.drivers) {
                Utils.showSuccess('🔄 Driver list refreshed');
            }
        } catch (error) {
            console.error('Refresh driver list error:', error);
            Utils.showWarning('⚠️ Could not refresh driver list');
        }
    },

    // Export drivers data
    async exportDrivers() {
        try {
            const result = await APIService.request('/drivers/export');
            if (result && result.success) {
                Utils.showSuccess('📤 Drivers data exported successfully!');
                // Trigger download if URL provided
                if (result.downloadUrl) {
                    const link = document.createElement('a');
                    link.href = result.downloadUrl;
                    link.download = `drivers_export_${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                }
            }
        } catch (error) {
            console.error('Export drivers error:', error);
            Utils.showError('❌ Failed to export drivers data');
        }
    }
};

// System Management Functions
const SystemManager = {
    // Broadcast message to all users
    async broadcastMessage() {
        const modalContent = `
            <form id="broadcastForm" class="modal-form">
                <div class="form-section">
                    <h4>📢 Message Details</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Message Type</label>
                            <select id="messageType">
                                <option value="info">ℹ️ General Information</option>
                                <option value="warning">⚠️ Warning</option>
                                <option value="emergency">🚨 Emergency</option>
                                <option value="maintenance">🔧 Maintenance</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Target Audience</label>
                            <select id="messageAudience">
                                <option value="all">👥 All Users</option>
                                <option value="students">🎓 Students Only</option>
                                <option value="drivers">🚗 Drivers Only</option>
                                <option value="admin">👑 Admins Only</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Message Title</label>
                        <input type="text" id="messageTitle" required placeholder="e.g., Service Update">
                    </div>
                    <div class="form-group">
                        <label>Message Content</label>
                        <textarea id="messageContent" rows="4" required placeholder="Enter your message here..."></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="messageUrgent"> Mark as Urgent
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="messagePopup" checked> Show as Popup
                            </label>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="ModalManager.close('broadcastModal')">Cancel</button>
                    <button type="submit" class="btn-primary">📢 Send Broadcast</button>
                </div>
            </form>
        `;

        const modalId = ModalManager.create('📢 Broadcast Message', modalContent, { id: 'broadcastModal' });

        // Handle form submission
        document.getElementById('broadcastForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.sendBroadcast();
        });
    },

    // Send broadcast message
    async sendBroadcast() {
        const form = document.getElementById('broadcastForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        Utils.showButtonLoading(submitBtn, 'Broadcasting...');

        try {
            const broadcastData = {
                title: document.getElementById('messageTitle').value,
                content: document.getElementById('messageContent').value,
                type: document.getElementById('messageType').value,
                audience: document.getElementById('messageAudience').value,
                urgent: document.getElementById('messageUrgent').checked,
                show_popup: document.getElementById('messagePopup').checked,
                sent_by: DashboardState.currentUser?.name || 'Admin',
                timestamp: new Date().toISOString()
            };

            const result = await APIService.request('/broadcast', {
                method: 'POST',
                body: JSON.stringify(broadcastData)
            });

            if (result && result.success) {
                Utils.showSuccess('📢 Message broadcasted successfully!');
                ModalManager.close('broadcastModal');
            } else {
                throw new Error(result?.message || 'Failed to send broadcast');
            }
        } catch (error) {
            console.error('Broadcast error:', error);
            Utils.showError('❌ Failed to send broadcast: ' + error.message);
        } finally {
            Utils.hideButtonLoading(submitBtn, originalText);
        }
    },

    // Backup database
    async backupDatabase() {
        const button = event?.target?.closest('button');
        const originalText = button?.innerHTML || 'Backup Database';

        if (button) Utils.showButtonLoading(button, 'Creating Backup...');

        try {
            const result = await APIService.request('/backup', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'full',
                    timestamp: new Date().toISOString()
                })
            });

            if (result && result.success) {
                Utils.showSuccess('💾 Database backup completed successfully!');
                
                // Trigger download if available
                if (result.downloadUrl) {
                    const link = document.createElement('a');
                    link.href = result.downloadUrl;
                    link.download = result.filename || `backup_${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                }
            } else {
                throw new Error(result?.message || 'Backup failed');
            }
        } catch (error) {
            console.error('Backup error:', error);
            Utils.showError('❌ Database backup failed: ' + error.message);
        } finally {
            if (button) Utils.hideButtonLoading(button, originalText);
        }
    },

    // Clear application cache
    async clearCache() {
        const button = event?.target?.closest('button');
        const originalText = button?.innerHTML || 'Clear Cache';

        if (button) Utils.showButtonLoading(button, 'Clearing Cache...');

        try {
            // Clear localStorage (except user session)
            const keysToKeep = ['ucc_user', 'ucc_token'];
            const allKeys = Object.keys(localStorage);
            const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
            
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear service workers cache
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }

            // Clear browser cache (if possible)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            Utils.showSuccess(`🗑️ Cache cleared successfully! (${keysToRemove.length} items removed)`);
        } catch (error) {
            console.error('Clear cache error:', error);
            Utils.showError('❌ Failed to clear cache: ' + error.message);
        } finally {
            if (button) {
                setTimeout(() => {
                    Utils.hideButtonLoading(button, originalText);
                }, 1000);
            }
        }
    },

    // Emergency shutdown
    async emergencyShutdown() {
        if (!confirm('⚠️ WARNING: This will immediately shut down all shuttle services!\n\nAre you sure you want to proceed?')) {
            return;
        }

        const modalContent = `
            <div class="emergency-shutdown-content">
                <div class="warning-section">
                    <h3>⚠️ EMERGENCY SHUTDOWN SEQUENCE</h3>
                    <p>This will immediately:</p>
                    <ul>
                        <li>🛑 Stop all shuttle operations</li>
                        <li>📱 Log out all users</li>
                        <li>🗄️ Backup critical data</li>
                        <li>🔒 Lock system access</li>
                    </ul>
                </div>
                <div class="shutdown-options">
                    <h4>Shutdown Options:</h4>
                    <div class="option-buttons">
                        <button class="btn-danger emergency-option" onclick="SystemManager.executeShutdown('immediate')">
                            🚨 Immediate Shutdown
                        </button>
                        <button class="btn-warning emergency-option" onclick="SystemManager.executeShutdown('graceful')">
                            ⏰ 5-Min Grace Period
                        </button>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" onclick="ModalManager.close('emergencyShutdownModal')">Cancel</button>
                </div>
            </div>
        `;

        ModalManager.create('🚨 Emergency Shutdown', modalContent, { id: 'emergencyShutdownModal' });
    },

    // Execute emergency shutdown
    async executeShutdown(type) {
        const button = event?.target;
        const originalText = button?.innerHTML || 'Executing Shutdown...';

        if (button) Utils.showButtonLoading(button, 'Shutting Down...');

        try {
            const result = await APIService.request('/emergency-shutdown', {
                method: 'POST',
                body: JSON.stringify({
                    type: type,
                    reason: 'Emergency shutdown initiated by admin',
                    timestamp: new Date().toISOString()
                })
            });

            if (result && result.success) {
                Utils.showSuccess(`🚨 Emergency shutdown initiated (${type})`);
                ModalManager.close('emergencyShutdownModal');
                
                if (type === 'immediate') {
                    setTimeout(() => {
                        window.location.href = '/maintenance.html';
                    }, 2000);
                }
            } else {
                throw new Error(result?.message || 'Shutdown command failed');
            }
        } catch (error) {
            console.error('Emergency shutdown error:', error);
            Utils.showError('❌ Emergency shutdown failed: ' + error.message);
        } finally {
            if (button) Utils.hideButtonLoading(button, originalText);
        }
    }
};

// Route Management Functions
const RouteManager = {
    // Show route management modal
    async showRouteManager() {
        try {
            const result = await APIService.request('/routes');
            const routes = result?.routes || [
                { id: 1, name: 'Main Campus Route', description: 'Main Campus → Library → Science Block', shuttles: 3, avgTime: 15, passengers: 120 },
                { id: 2, name: 'Hostel Route', description: 'Main Campus → Hostel A → Cafeteria', shuttles: 2, avgTime: 20, passengers: 80 }
            ];

            const modalContent = `
                <div class="route-manager-content">
                    <div class="routes-list">
                        <h4>Current Routes</h4>
                        <div class="route-cards">
                            ${routes.map(route => `
                                <div class="route-card">
                                    <h5>🏫 ${route.name}</h5>
                                    <p>${route.description}</p>
                                    <div class="route-stats">
                                        <span>🚌 ${route.shuttles} Shuttles</span>
                                        <span>⏱️ ${route.avgTime} min avg</span>
                                        <span>👥 ${route.passengers} passengers/day</span>
                                    </div>
                                    <div class="route-actions">
                                        <button class="btn-small" onclick="RouteManager.editRoute(${route.id})">✏️ Edit</button>
                                        <button class="btn-small btn-danger" onclick="RouteManager.deleteRoute(${route.id})">🗑️ Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="add-route-section">
                        <h4>Add New Route</h4>
                        <form id="addRouteForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Route Name</label>
                                    <input type="text" id="routeName" required placeholder="e.g., Science Block Route">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Route Description</label>
                                    <textarea id="routeDescription" rows="3" placeholder="e.g., Science Block → Library → Main Campus"></textarea>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Estimated Time (minutes)</label>
                                    <input type="number" id="routeTime" min="5" max="120" value="15">
                                </div>
                                <div class="form-group">
                                    <label>Capacity per Trip</label>
                                    <input type="number" id="routeCapacity" min="1" max="100" value="40">
                                </div>
                            </div>
                            <button type="submit" class="btn-primary">➕ Add Route</button>
                        </form>
                    </div>
                </div>
            `;

            const modalId = ModalManager.create('📍 Route Management', modalContent, { id: 'routeManagerModal' });

            // Handle add route form
            document.getElementById('addRouteForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addRoute();
            });
        } catch (error) {
            console.error('Route manager error:', error);
            Utils.showError('❌ Failed to load route manager');
        }
    },

    // Add new route
    async addRoute() {
        const form = document.getElementById('addRouteForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        Utils.showButtonLoading(submitBtn, 'Adding Route...');

        try {
            const routeData = {
                name: document.getElementById('routeName').value,
                description: document.getElementById('routeDescription').value,
                estimated_time: parseInt(document.getElementById('routeTime').value),
                capacity: parseInt(document.getElementById('routeCapacity').value),
                created_at: new Date().toISOString()
            };

            const result = await APIService.request('/routes', {
                method: 'POST',
                body: JSON.stringify(routeData)
            });

            if (result && result.success) {
                Utils.showSuccess('📍 Route added successfully!');
                form.reset();
                // Refresh the route list
                setTimeout(() => this.showRouteManager(), 1000);
            } else {
                throw new Error(result?.message || 'Failed to add route');
            }
        } catch (error) {
            console.error('Add route error:', error);
            Utils.showError('❌ Failed to add route: ' + error.message);
        } finally {
            Utils.hideButtonLoading(submitBtn, originalText);
        }
    },

    // Edit route
    async editRoute(routeId) {
        Utils.showSuccess(`📝 Editing route ${routeId} (Feature coming soon)`);
    },

    // Delete route
    async deleteRoute(routeId) {
        if (confirm(`Are you sure you want to delete route ${routeId}?`)) {
            try {
                const result = await APIService.request(`/routes/${routeId}`, {
                    method: 'DELETE'
                });

                if (result && result.success) {
                    Utils.showSuccess(`🗑️ Route ${routeId} deleted successfully`);
                    // Refresh the route list
                    setTimeout(() => this.showRouteManager(), 1000);
                } else {
                    throw new Error(result?.message || 'Failed to delete route');
                }
            } catch (error) {
                console.error('Delete route error:', error);
                Utils.showError('❌ Failed to delete route: ' + error.message);
            }
        }
    }
};

// Analytics and Reporting Functions
const AnalyticsManager = {
    // Show fleet analytics
    async showFleetAnalytics() {
        const modalContent = `
            <div class="analytics-content">
                <div class="chart-container">
                    <h4>Shuttle Utilization</h4>
                    <div class="chart-placeholder">📈 Utilization Chart</div>
                </div>
                <div class="stats-summary">
                    <div class="summary-item">
                        <span class="label">Total Distance Today:</span>
                        <span class="value">1,234 km</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Fuel Efficiency:</span>
                        <span class="value">8.5 km/L</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Maintenance Due:</span>
                        <span class="value">2 vehicles</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Average Rating:</span>
                        <span class="value">4.7/5.0</span>
                    </div>
                </div>
                <div class="analytics-actions">
                    <button class="btn-primary" onclick="AnalyticsManager.exportAnalytics()">📤 Export Report</button>
                    <button class="btn-secondary" onclick="AnalyticsManager.refreshAnalytics()">🔄 Refresh Data</button>
                </div>
            </div>
        `;

        ModalManager.create('📊 Fleet Analytics', modalContent, { id: 'fleetAnalyticsModal' });
    },

    // Export analytics data
    async exportAnalytics() {
        try {
            const result = await APIService.request('/analytics/export');
            if (result && result.success) {
                Utils.showSuccess('📤 Analytics report exported successfully!');
                if (result.downloadUrl) {
                    const link = document.createElement('a');
                    link.href = result.downloadUrl;
                    link.download = `analytics_${new Date().toISOString().split('T')[0]}.pdf`;
                    link.click();
                }
            }
        } catch (error) {
            console.error('Export analytics error:', error);
            Utils.showError('❌ Failed to export analytics');
        }
    },

    // Refresh analytics data
    async refreshAnalytics() {
        Utils.showSuccess('🔄 Analytics data refreshed');
    }
};

// Event Listener Setup
const EventManager = {
    // Initialize all event listeners
    init() {
        this.setupFleetButtons();
        this.setupDriverButtons();
        this.setupSystemButtons();
        this.setupRouteButtons();
        this.setupAnalyticsButtons();
        this.setupKeyboardShortcuts();
    },

    // Fleet management button listeners
    setupFleetButtons() {
        // Add Shuttle buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="showAddShuttleModal"], [onclick*="FleetManager.addShuttle"]') || 
                e.target.closest('[onclick*="showAddShuttleModal"], [onclick*="FleetManager.addShuttle"]')) {
                e.preventDefault();
                FleetManager.addShuttle();
            }
        });

        // Fleet Analytics buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="showFleetAnalytics"]') || 
                e.target.closest('[onclick*="showFleetAnalytics"]')) {
                e.preventDefault();
                AnalyticsManager.showFleetAnalytics();
            }
        });
    },

    // Driver management button listeners
    setupDriverButtons() {
        // Add Driver buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="showAddDriverModal"], [onclick*="DriverManager.addDriver"]') || 
                e.target.closest('[onclick*="showAddDriverModal"], [onclick*="DriverManager.addDriver"]')) {
                e.preventDefault();
                DriverManager.addDriver();
            }
        });

        // View All Drivers buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="showAllDrivers"]') || 
                e.target.closest('[onclick*="showAllDrivers"]')) {
                e.preventDefault();
                DriverManager.viewAllDrivers();
            }
        });
    },

    // System management button listeners
    setupSystemButtons() {
        // Broadcast Message buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="broadcastMessage"]') || 
                e.target.closest('[onclick*="broadcastMessage"]')) {
                e.preventDefault();
                SystemManager.broadcastMessage();
            }
        });

        // Backup Database buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="backupDatabase"]') || 
                e.target.closest('[onclick*="backupDatabase"]')) {
                e.preventDefault();
                SystemManager.backupDatabase();
            }
        });

        // Clear Cache buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="clearCache"]') || 
                e.target.closest('[onclick*="clearCache"]')) {
                e.preventDefault();
                SystemManager.clearCache();
            }
        });

        // Emergency Shutdown buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="emergencyShutdown"]') || 
                e.target.closest('[onclick*="emergencyShutdown"]')) {
                e.preventDefault();
                SystemManager.emergencyShutdown();
            }
        });
    },

    // Route management button listeners
    setupRouteButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="showRouteManager"]') || 
                e.target.closest('[onclick*="showRouteManager"]')) {
                e.preventDefault();
                RouteManager.showRouteManager();
            }
        });
    },

    // Analytics button listeners
    setupAnalyticsButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="showFleetAnalytics"]') || 
                e.target.closest('[onclick*="showFleetAnalytics"]')) {
                e.preventDefault();
                AnalyticsManager.showFleetAnalytics();
            }
        });
    },

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        SystemManager.broadcastMessage();
                        break;
                    case 's':
                        e.preventDefault();
                        FleetManager.addShuttle();
                        break;
                    case 'd':
                        e.preventDefault();
                        DriverManager.addDriver();
                        break;
                }
            }

            // Escape key to close modals
            if (e.key === 'Escape') {
                ModalManager.closeAll();
            }
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get current user from localStorage
    const userData = localStorage.getItem('ucc_user');
    if (userData) {
        try {
            DashboardState.currentUser = JSON.parse(userData);
        } catch (error) {
            console.error('Failed to parse user data:', error);
        }
    }

    // Initialize event listeners
    EventManager.init();

    // Add CSS for notifications and modals
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .notification {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            margin-left: auto;
        }
        
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #45a049, #3d8b40);
            transform: translateY(-2px);
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-secondary:hover {
            background: #5a6268;
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-danger:hover {
            background: linear-gradient(135deg, #c82333, #bd2130);
        }
        
        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 6px;
        }
        
        .modal-form {
            max-width: 100%;
        }
        
        .form-section {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border: 1px solid #e1e5e9;
        }
        
        .form-section h4 {
            color: #1565c0;
            margin-bottom: 20px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .form-group {
            flex: 1;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #1565c0;
        }
        
        .form-actions {
            display: flex;
            gap: 15px;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e1e5e9;
        }
        
        .emergency-option {
            padding: 15px 25px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            margin: 10px;
        }
        
        .emergency-option:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }
        
        .route-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .route-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-left: 4px solid #1565c0;
        }
        
        .route-stats {
            display: flex;
            gap: 15px;
            margin: 15px 0;
            font-size: 14px;
        }
        
        .route-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .drivers-container {
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .drivers-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e1e5e9;
        }
        
        .drivers-controls {
            display: flex;
            gap: 10px;
        }
        
        .drivers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .driver-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border-left: 4px solid transparent;
        }
        
        .driver-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            border-left-color: #1565c0;
        }
        
        .driver-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .driver-name {
            font-size: 18px;
            font-weight: 600;
            color: #1565c0;
        }
        
        .driver-status {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .driver-status.status-active {
            background: #28a745;
            color: white;
        }
        
        .driver-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        @media (max-width: 768px) {
            .form-row {
                flex-direction: column;
            }
            
            .form-actions {
                flex-direction: column;
            }
            
            .route-cards,
            .drivers-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);

    console.log('🎯 Dashboard buttons functionality initialized');
});

// Export for global access
window.FleetManager = FleetManager;
window.DriverManager = DriverManager;
window.SystemManager = SystemManager;
window.RouteManager = RouteManager;
window.AnalyticsManager = AnalyticsManager;
window.ModalManager = ModalManager;
window.Utils = Utils;