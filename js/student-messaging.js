class StudentMessaging {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentConversation = null;
        this.onlineUsers = new Map();
        this.conversations = new Map();
        this.typingTimers = new Map();
        this.unreadCount = 0;
        
        this.init();
    }

    async init() {
        try {
            // Get current user from localStorage
            const userData = localStorage.getItem('ucc_user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
            } else {
                console.error('No user data found');
                return;
            }

            // Initialize socket connection
            await this.initSocket();
            
            // Load conversations
            await this.loadConversations();
            
            // Setup UI event listeners
            this.setupEventListeners();
            
            console.log('✅ Student messaging initialized');
        } catch (error) {
            console.error('❌ Error initializing messaging:', error);
        }
    }

    async initSocket() {
        try {
            const token = localStorage.getItem('ucc_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Connect to Socket.IO server
            this.socket = io('http://localhost:3001', {
                auth: {
                    token: token
                }
            });

            // Connection events
            this.socket.on('connect', () => {
                console.log('🔌 Connected to messaging server');
                
                // Authenticate with socket
                this.socket.emit('authenticate', token);
            });

            this.socket.on('authenticated', (data) => {
                console.log('✅ Socket authenticated:', data);
                this.loadOnlineUsers();
            });

            this.socket.on('authentication_error', (error) => {
                console.error('❌ Socket authentication failed:', error);
            });

            // Message events
            this.socket.on('message:new', (message) => {
                this.handleNewMessage(message);
            });

            this.socket.on('message:delivered', (data) => {
                this.handleMessageDelivered(data);
            });

            this.socket.on('message:read', (data) => {
                this.handleMessageRead(data);
            });

            // Typing events
            this.socket.on('typing:started', (data) => {
                this.showTypingIndicator(data);
            });

            this.socket.on('typing:stopped', (data) => {
                this.hideTypingIndicator(data);
            });

            // Presence events
            this.socket.on('presence:update', (data) => {
                this.updateUserPresence(data);
            });

            this.socket.on('drivers:online', (data) => {
                this.updateOnlineDriversList(data.drivers);
            });

            this.socket.on('support:agents', (data) => {
                this.updateOnlineSupportList(data.agents);
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from messaging server');
            });

        } catch (error) {
            console.error('❌ Error initializing socket:', error);
        }
    }

    async loadConversations() {
        try {
            const response = await fetch('/api/conversations?mine=true', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });

            const data = await response.json();
            if (data.conversations) {
                data.conversations.forEach(conv => {
                    this.conversations.set(conv.id, conv);
                });
                this.updateConversationList();
                this.updateUnreadBadge();
            }
        } catch (error) {
            console.error('❌ Error loading conversations:', error);
        }
    }

    async loadOnlineUsers() {
        try {
            // Get online drivers
            this.socket.emit('drivers:online');
            
            // Get online support users
            this.socket.emit('support:agents');
        } catch (error) {
            console.error('❌ Error loading online users:', error);
        }
    }

    updateOnlineDriversList(drivers) {
        drivers.forEach(driver => {
            this.onlineUsers.set(driver.id, driver);
        });
        this.updateUserListUI();
    }

    updateOnlineSupportList(agents) {
        agents.forEach(agent => {
            this.onlineUsers.set(agent.id, agent);
        });
        this.updateUserListUI();
    }

    updateUserPresence(data) {
        const user = this.onlineUsers.get(data.userId);
        if (user) {
            user.is_online = data.isOnline;
            this.updateUserListUI();
        }
    }

    updateUserListUI() {
        // Update driver list
        const drivers = Array.from(this.onlineUsers.values()).filter(u => u.role === 'driver');
        const driversList = document.getElementById('driversList');
        if (driversList) {
            if (drivers.length === 0) {
                driversList.innerHTML = `
                    <div class="no-users">
                        <i class="fas fa-user-slash"></i>
                        <p>No drivers available</p>
                        <button class="chat-anyway-btn" onclick="chatWithAnyDriver()">
                            Chat with Support Instead
                        </button>
                    </div>
                `;
            } else {
                driversList.innerHTML = drivers.map(driver => `
                    <div class="user-item ${driver.is_online ? 'online' : 'offline'}" 
                         onclick="startConversationWithUser(${driver.id}, '${driver.name}', 'driver')">
                        <div class="user-avatar">
                            <i class="fas fa-user-tie"></i>
                            <span class="status-indicator ${driver.is_online ? 'online' : 'offline'}"></span>
                        </div>
                        <div class="user-info">
                            <div class="user-name">${driver.name}</div>
                            <div class="user-status">${driver.is_online ? 'Online' : 'Offline'}</div>
                            ${driver.shuttle_id ? `<div class="user-shuttle">Shuttle: ${driver.shuttle_id}</div>` : ''}
                            ${driver.route_name ? `<div class="user-route">Route: ${driver.route_name}</div>` : ''}
                        </div>
                        <button class="chat-btn">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                `).join('');
                
                // Add "Chat with any available driver" option
                if (drivers.length > 1) {
                    driversList.insertAdjacentHTML('afterbegin', `
                        <div class="any-driver-option" onclick="chatWithAnyDriver()">
                            <div class="user-avatar">
                                <i class="fas fa-random"></i>
                            </div>
                            <div class="user-info">
                                <div class="user-name">Chat with Any Available Driver</div>
                                <div class="user-status">Auto-route to first available</div>
                            </div>
                            <button class="chat-btn">
                                <i class="fas fa-comment-medical"></i>
                            </button>
                        </div>
                    `);
                }
            }
        }

        // Update support list
        const supportUsers = Array.from(this.onlineUsers.values()).filter(u => u.role === 'support');
        const supportList = document.getElementById('supportList');
        if (supportList) {
            if (supportUsers.length === 0) {
                supportList.innerHTML = `
                    <div class="no-users">
                        <i class="fas fa-headset-slash"></i>
                        <p>No support agents available</p>
                        <p>Please try again later</p>
                    </div>
                `;
            } else {
                supportList.innerHTML = supportUsers.map(support => `
                    <div class="user-item ${support.is_online ? 'online' : 'offline'}" 
                         onclick="startConversationWithUser(${support.id}, '${support.name}', 'support')">
                        <div class="user-avatar">
                            <i class="fas fa-headset"></i>
                            <span class="status-indicator ${support.is_online ? 'online' : 'offline'}"></span>
                        </div>
                        <div class="user-info">
                            <div class="user-name">${support.name}</div>
                            <div class="user-status">${support.is_online ? 'Online' : 'Offline'}</div>
                        </div>
                        <button class="chat-btn">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                `).join('');
            }
        }
    }

    async startConversationWithUser(userId, userName, userRole) {
        try {
            const conversationType = userRole === 'driver' ? 'student_driver' : 'student_support';
            const participantIds = [this.currentUser.id, userId];

            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                },
                body: JSON.stringify({
                    participantIds,
                    type: conversationType
                })
            });

            const data = await response.json();
            if (data.conversationId) {
                this.currentConversation = data.conversationId;
                this.openChatWindow(userName, userRole);
                await this.loadMessages(data.conversationId);
            }
        } catch (error) {
            console.error('❌ Error starting conversation:', error);
        }
    }

    async chatWithAnyDriver() {
        try {
            // Get first available driver
            this.socket.emit('drivers:available');
            
            // Listen for the response
            this.socket.once('drivers:available', async (data) => {
                if (data.driver) {
                    await this.startConversationWithUser(
                        data.driver.id, 
                        data.driver.name, 
                        'driver'
                    );
                } else {
                    // Fallback to support
                    const supportUsers = Array.from(this.onlineUsers.values())
                        .filter(u => u.role === 'support');
                    
                    if (supportUsers.length > 0) {
                        const firstSupport = supportUsers[0];
                        await this.startConversationWithUser(
                            firstSupport.id,
                            firstSupport.name,
                            'support'
                        );
                    } else {
                        this.showErrorMessage('No drivers or support agents available');
                    }
                }
            });
        } catch (error) {
            console.error('❌ Error with auto-routing:', error);
        }
    }

    openChatWindow(userName, userRole) {
        const chatHeader = document.getElementById('chatHeader');
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');

        chatHeader.innerHTML = `
            <div class="chat-info">
                <i class="fas fa-${userRole === 'driver' ? 'user-tie' : 'headset'}"></i>
                <div>
                    <h3>${userName}</h3>
                    <span class="user-role">${userRole}</span>
                </div>
            </div>
            <button class="close-chat-btn" onclick="closeChat()">
                <i class="fas fa-times"></i>
            </button>
        `;

        chatMessages.innerHTML = '<div class="loading-spinner"></div>';
        chatInput.style.display = 'flex';

        // Scroll to chat input
        chatInput.scrollIntoView({ behavior: 'smooth' });
    }

    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });

            const data = await response.json();
            if (data.messages) {
                this.displayMessages(data.messages);
                this.markMessagesAsRead(data.messages);
            }
        } catch (error) {
            console.error('❌ Error loading messages:', error);
        }
    }

    displayMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        
        const messagesHTML = messages.map(message => {
            const isOwn = message.sender_id === this.currentUser.id;
            const messageClass = isOwn ? 'own-message' : 'other-message';
            
            return `
                <div class="message ${messageClass}" data-message-id="${message.id}">
                    <div class="message-content">
                        <div class="message-text">${this.escapeHtml(message.content)}</div>
                        <div class="message-time">
                            ${this.formatTime(message.created_at)}
                            ${this.getMessageStatus(message, isOwn)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        chatMessages.innerHTML = messagesHTML;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    getMessageStatus(message, isOwn) {
        if (!isOwn) return '';
        
        if (message.read_at) {
            return '<i class="fas fa-check-double read"></i>';
        } else if (message.delivered_at) {
            return '<i class="fas fa-check-double delivered"></i>';
        } else {
            return '<i class="fas fa-check sent"></i>';
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentConversation) return;

        try {
            // Optimistic UI update
            this.addOptimisticMessage(content);
            input.value = '';

            // Send via socket for real-time delivery
            this.socket.emit('message:send', {
                conversationId: this.currentConversation,
                content: content
            });

            // Also send via REST for persistence
            await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                },
                body: JSON.stringify({
                    conversationId: this.currentConversation,
                    content: content
                })
            });

        } catch (error) {
            console.error('❌ Error sending message:', error);
            // Show error state
            this.showErrorMessage('Failed to send message');
        }
    }

    addOptimisticMessage(content) {
        const chatMessages = document.getElementById('chatMessages');
        const messageHTML = `
            <div class="message own-message optimistic">
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(content)}</div>
                    <div class="message-time">
                        ${this.formatTime(new Date())}
                        <i class="fas fa-clock sending"></i>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    handleNewMessage(message) {
        if (message.conversationId !== this.currentConversation) {
            // Update conversation list and unread badge
            this.loadConversations();
            return;
        }

        // Remove optimistic message if it exists
        const optimisticMessages = document.querySelectorAll('.message.optimistic');
        optimisticMessages.forEach(msg => msg.remove());

        // Add the real message
        const chatMessages = document.getElementById('chatMessages');
        const isOwn = message.senderId === this.currentUser.id;
        const messageClass = isOwn ? 'own-message' : 'other-message';
        
        const messageHTML = `
            <div class="message ${messageClass}" data-message-id="${message.id}">
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.content)}</div>
                    <div class="message-time">
                        ${this.formatTime(message.createdAt)}
                        ${isOwn ? '<i class="fas fa-check sent"></i>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Mark as read if not own message
        if (!isOwn) {
            this.socket.emit('message:read', { messageId: message.id });
        }
    }

    handleMessageDelivered(data) {
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            const statusIcon = messageElement.querySelector('.sending, .sent, .delivered, .read');
            if (statusIcon) {
                statusIcon.className = 'fas fa-check-double delivered';
            }
        }
    }

    handleMessageRead(data) {
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            const statusIcon = messageElement.querySelector('.sending, .sent, .delivered, .read');
            if (statusIcon) {
                statusIcon.className = 'fas fa-check-double read';
            }
        }
    }

    markMessagesAsRead(messages) {
        const unreadMessages = messages.filter(msg => 
            msg.sender_id !== this.currentUser.id && !msg.read_at
        );
        
        unreadMessages.forEach(message => {
            this.socket.emit('message:read', { messageId: message.id });
        });
    }

    showTypingIndicator(data) {
        if (data.conversationId !== this.currentConversation) return;

        const chatMessages = document.getElementById('chatMessages');
        const existingIndicator = document.getElementById('typingIndicator');
        
        if (existingIndicator) return;

        const indicatorHTML = `
            <div class="typing-indicator" id="typingIndicator">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
                <span>Someone is typing...</span>
            </div>
        `;
        
        chatMessages.insertAdjacentHTML('beforeend', indicatorHTML);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator(data) {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Typing indicators
            messageInput.addEventListener('input', () => {
                if (this.currentConversation) {
                    this.socket.emit('typing:start', { conversationId: this.currentConversation });
                    
                    clearTimeout(this.typingTimers.get('stopTyping'));
                    this.typingTimers.set('stopTyping', setTimeout(() => {
                        this.socket.emit('typing:stop', { conversationId: this.currentConversation });
                    }, 1000));
                }
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.textContent.toLowerCase();
                this.switchChatTab(tab);
            });
        });

        // Auto-refresh online users every 30 seconds
        setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.loadOnlineUsers();
            }
        }, 30000);
    }

    switchChatTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Update chat list
        const chatList = document.getElementById('chatList');
        
        switch(tab) {
            case 'students':
                chatList.innerHTML = '<div class="no-users">Students messaging not available</div>';
                break;
            case 'drivers':
                chatList.innerHTML = `
                    <h4>Available Drivers</h4>
                    <div id="driversList" class="users-list">
                        <div class="loading-spinner"></div>
                    </div>
                `;
                this.loadOnlineUsers();
                break;
            case 'support':
                chatList.innerHTML = `
                    <h4>Support Team</h4>
                    <div id="supportList" class="users-list">
                        <div class="loading-spinner"></div>
                    </div>
                `;
                this.loadOnlineUsers();
                break;
        }
    }

    updateConversationList() {
        // Update conversation list if needed
    }

    updateUnreadBadge() {
        this.unreadCount = Array.from(this.conversations.values())
            .reduce((total, conv) => total + (conv.unread_count || 0), 0);
        
        const badge = document.getElementById('messageBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    closeChat() {
        this.currentConversation = null;
        const chatHeader = document.getElementById('chatHeader');
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');

        chatHeader.innerHTML = '<h3>Select a conversation</h3>';
        chatMessages.innerHTML = `
            <div class="no-chat-selected">
                <i class="fas fa-comments"></i>
                <p>Choose a conversation to start messaging</p>
            </div>
        `;
        chatInput.style.display = 'none';
    }

    showErrorMessage(message) {
        const errorHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.insertAdjacentHTML('beforeend', errorHTML);
        
        setTimeout(() => {
            const errorMsg = chatMessages.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        }, 3000);
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }
}

// Global functions for HTML onclick handlers
let studentMessaging;

function switchChatTab(tab) {
    if (studentMessaging) {
        studentMessaging.switchChatTab(tab);
    }
}

function startConversationWithUser(userId, userName, userRole) {
    if (studentMessaging) {
        studentMessaging.startConversationWithUser(userId, userName, userRole);
    }
}

function chatWithAnyDriver() {
    if (studentMessaging) {
        studentMessaging.chatWithAnyDriver();
    }
}

function sendMessage() {
    if (studentMessaging) {
        studentMessaging.sendMessage();
    }
}

function closeChat() {
    if (studentMessaging) {
        studentMessaging.closeChat();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize messaging when messages section is first opened
    const messagesNav = document.querySelector('[data-section="messages"]');
    if (messagesNav) {
        messagesNav.addEventListener('click', () => {
            if (!studentMessaging) {
                studentMessaging = new StudentMessaging();
            }
        });
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentMessaging;
}