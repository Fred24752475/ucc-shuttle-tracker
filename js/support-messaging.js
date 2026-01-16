class SupportMessaging {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = new Map();
        this.queueItems = new Map();
        this.typingTimers = new Map();
        this.unreadCount = 0;
        this.isAvailable = true;
        
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
            
            // Load conversations and queue
            await this.loadSupportData();
            
            // Setup UI event listeners
            this.setupEventListeners();
            
            // Update dashboard stats
            this.updateDashboardStats();
            
            console.log('✅ Support messaging initialized');
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
                
                // Update support availability
                this.updateSupportStatus(this.isAvailable);
            });

            this.socket.on('authenticated', (data) => {
                console.log('✅ Socket authenticated:', data);
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

            this.socket.on('users:online', (data) => {
                this.updateOnlineUsers(data.users);
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from messaging server');
            });

        } catch (error) {
            console.error('❌ Error initializing socket:', error);
        }
    }

    async loadSupportData() {
        try {
            // Load conversations
            const response = await fetch('/api/conversations?mine=true', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });

            const data = await response.json();
            if (data.conversations) {
                data.conversations.forEach(conv => {
                    if (conv.type === 'student_support' || conv.type === 'driver_support') {
                        this.conversations.set(conv.id, conv);
                    }
                });
                this.updateConversationsList();
                this.updateUnreadBadge();
            }

            // Load queue items (conversations without support participants)
            await this.loadQueueItems();
            
        } catch (error) {
            console.error('❌ Error loading support data:', error);
        }
    }

    async loadQueueItems() {
        try {
            // Get all student_support and driver_support conversations without support participants
            const response = await fetch('/api/conversations/unassigned', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });

            const data = await response.json();
            if (data.conversations) {
                data.conversations.forEach(conv => {
                    this.queueItems.set(conv.id, conv);
                });
                this.updateQueueList();
            }
        } catch (error) {
            console.error('❌ Error loading queue items:', error);
        }
    }

    updateQueueList() {
        const queueList = document.getElementById('queueList');
        if (!queueList) return;

        const queue = Array.from(this.queueItems.values())
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        if (queue.length === 0) {
            queueList.innerHTML = `
                <div class="no-queue-items">
                    <i class="fas fa-check-circle"></i>
                    <p>No users waiting</p>
                    <small>All users are being assisted</small>
                    <div class="support-status-info">
                        <div class="status-indicator">
                            <i class="fas fa-circle ${this.isAvailable ? 'online' : 'offline'}"></i>
                            <span>You are ${this.isAvailable ? 'available' : 'unavailable'}</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        queueList.innerHTML = queue.map((item, index) => {
            const waitTime = this.getWaitTime(item.created_at);
            const priority = this.getPriority(item);
            
            return `
                <div class="queue-item priority-${priority}" onclick="claimConversation(${item.id}, '${item.other_user_name}', '${item.other_user_role}')">
                    <div class="queue-priority">
                        ${index === 0 ? '<i class="fas fa-exclamation-circle high-priority"></i>' : ''}
                        <span class="priority-badge ${priority}">${priority.toUpperCase()}</span>
                    </div>
                    <div class="queue-avatar">
                        <i class="fas fa-${item.other_user_role === 'student' ? 'graduation-cap' : 'user-tie'}"></i>
                    </div>
                    <div class="queue-content">
                        <h4>${item.other_user_name}</h4>
                        <span class="queue-role">${item.other_user_role}</span>
                        <div class="queue-meta">
                            <span class="queue-time"><i class="fas fa-clock"></i> ${waitTime}</span>
                            <span class="queue-type">${item.type.replace('_', ' ')}</span>
                        </div>
                    </div>
                    <button class="claim-btn" title="Claim this conversation">
                        <i class="fas fa-user-plus"></i>
                        Claim
                    </button>
                </div>
            `;
        }).join('');
    }

    getWaitTime(createdAt) {
        const date = new Date(createdAt);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min`;
        if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
        return `${Math.floor(diffHours / 24)}d`;
    }

    getPriority(item) {
        const waitTime = new Date() - new Date(item.created_at);
        const waitMins = Math.floor(waitTime / 60000);
        
        if (waitMins > 30) return 'high';
        if (waitMins > 15) return 'medium';
        return 'low';
    }

updateConversationsList() {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;

        const conversations = Array.from(this.conversations.values())
            .sort((a, b) => new Date(b.last_message_time || b.created_at) - new Date(a.last_message_time || a.created_at));

        if (conversations.length === 0) {
            conversationsList.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-comments"></i>
                    <p>No active conversations</p>
                    <small>Claim conversations from queue to start helping</small>
                </div>
            `;
            return;
        }

        conversationsList.innerHTML = conversations.map(conv => {
            const lastMessagePreview = conv.last_message ? 
                (conv.last_message.length > 30 ? conv.last_message.substring(0, 30) + '...' : conv.last_message) :
                'Click to view conversation';
            
            return `
                <div class="conversation-item ${conv.unread_count > 0 ? 'unread' : ''}" 
                     onclick="openConversation(${conv.id}, '${conv.other_user_name}', '${conv.other_user_role}')">
                    <div class="conversation-avatar">
                        <i class="fas fa-${conv.other_user_role === 'student' ? 'graduation-cap' : 'user-tie'}"></i>
                        ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
                        <span class="conversation-type">${conv.type.replace('_', ' ')}</span>
                    </div>
                    <div class="conversation-content">
                        <div class="conversation-header">
                            <h4>${conv.other_user_name}</h4>
                            <span class="conversation-time">${this.formatTime(conv.last_message_time || conv.created_at)}</span>
                        </div>
                        <div class="conversation-preview">
                            <p>${lastMessagePreview}</p>
                            ${conv.unread_count > 0 ? `<span class="unread-indicator">${conv.unread_count} unread</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

        conversationsList.innerHTML = conversations.map(conv => `
            <div class="conversation-item ${conv.unread_count > 0 ? 'unread' : ''}" 
                 onclick="openConversation(${conv.id}, '${conv.other_user_name}', '${conv.other_user_role}')">
                <div class="conversation-avatar">
                    <i class="fas fa-${conv.other_user_role === 'student' ? 'graduation-cap' : 'user-tie'}"></i>
                    ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
                </div>
                <div class="conversation-content">
                    <div class="conversation-header">
                        <h4>${conv.other_user_name}</h4>
                        <span class="conversation-time">${this.formatTime(conv.last_message_time || conv.created_at)}</span>
                    </div>
                    <div class="conversation-preview">
                        <p>Active conversation</p>
                        ${conv.unread_count > 0 ? `<span class="unread-indicator">${conv.unread_count} unread messages</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async claimConversation(conversationId, userName, userRole) {
        try {
            // Add support user to conversation
            const response = await fetch(`/api/conversations/${conversationId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ucc_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                // Move from queue to conversations
                const item = this.queueItems.get(conversationId);
                if (item) {
                    this.queueItems.delete(conversationId);
                    this.conversations.set(conversationId, item);
                }

                // Update UI
                this.updateQueueList();
                this.updateConversationsList();
                
                // Open the conversation
                this.openConversation(conversationId, userName, userRole);
                
                // Notify other support agents
                if (this.socket) {
                    this.socket.emit('conversation:claimed', { conversationId, supportAgent: this.currentUser.name });
                }
            }
        } catch (error) {
            console.error('❌ Error claiming conversation:', error);
        }
    }

    openConversation(conversationId, userName, userRole) {
        try {
            this.currentConversation = conversationId;
            this.openChatWindow(userName, userRole);
            this.loadMessages(conversationId);
            
            // Mark conversation as read
            const conv = this.conversations.get(conversationId);
            if (conv && conv.unread_count > 0) {
                conv.unread_count = 0;
                this.updateUnreadBadge();
                this.updateConversationsList();
            }
        } catch (error) {
            console.error('❌ Error opening conversation:', error);
        }
    }

    openChatWindow(userName, userRole) {
        const chatHeader = document.getElementById('chatHeader');
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');

        chatHeader.innerHTML = `
            <div class="chat-info">
                <i class="fas fa-${userRole === 'student' ? 'graduation-cap' : 'user-tie'}"></i>
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
        chatInput.style.display = 'block';
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
                        <div class="message-sender">${isOwn ? 'You' : message.sender_name}</div>
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
            this.showErrorMessage('Failed to send message');
        }
    }

    sendQuickReply(message) {
        const input = document.getElementById('messageInput');
        input.value = message;
        this.sendMessage();
    }

    showQuickReplies() {
        const chatInput = document.getElementById('chatInput');
        if (!chatInput) return;

        const quickRepliesHTML = `
            <div class="quick-replies">
                <div class="quick-reply-header">
                    <i class="fas fa-bolt"></i>
                    <span>Quick Replies</span>
                    <button class="close-quick-replies" onclick="hideQuickReplies()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="quick-reply-buttons">
                    <button onclick="sendQuickReply('I understand your concern. Let me help you with that.')" class="quick-reply-btn">
                        Acknowledge concern
                    </button>
                    <button onclick="sendQuickReply('I\'m looking into this for you. One moment please.')" class="quick-reply-btn">
                        Checking issue
                    </button>
                    <button onclick="sendQuickReply('Thank you for your patience. I can help you with that.')" class="quick-reply-btn">
                        Thank & assist
                    </button>
                    <button onclick="sendQuickReply('Let me transfer you to the right department.')" class="quick-reply-btn">
                        Transfer
                    </button>
                    <button onclick="sendQuickReply('Is there anything else I can help you with?')" class="quick-reply-btn">
                        Ask follow-up
                    </button>
                    <button onclick="sendQuickReply('Thank you for contacting UCC Support!')" class="quick-reply-btn">
                        Closing message
                    </button>
                </div>
            </div>
        `;

        // Remove existing quick replies
        const existing = chatInput.querySelector('.quick-replies');
        if (existing) existing.remove();

        // Add new quick replies
        chatInput.insertAdjacentHTML('beforeend', quickRepliesHTML);
    }

    addOptimisticMessage(content) {
        const chatMessages = document.getElementById('chatMessages');
        const messageHTML = `
            <div class="message own-message optimistic">
                <div class="message-content">
                    <div class="message-sender">You</div>
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
            this.loadSupportData();
            return;
        }

        // Remove optimistic message if it exists
        const optimisticMessages = document.querySelectorAll('.message.optimistic');
        optimisticMessages.forEach(msg => msg.remove());

        // Add real message
        const chatMessages = document.getElementById('chatMessages');
        const isOwn = message.senderId === this.currentUser.id;
        const messageClass = isOwn ? 'own-message' : 'other-message';
        
        const messageHTML = `
            <div class="message ${messageClass}" data-message-id="${message.id}">
                <div class="message-content">
                    <div class="message-sender">${isOwn ? 'You' : message.senderName}</div>
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
                <span>User is typing...</span>
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

    updateSupportStatus(isAvailable) {
        this.isAvailable = isAvailable;
        
        // Update UI
        const statusToggle = document.getElementById('supportStatusToggle');
        const statusText = document.querySelector('.status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        
        if (statusToggle) statusToggle.checked = isAvailable;
        if (statusText) statusText.textContent = isAvailable ? 'Available for chats' : 'Unavailable';
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isAvailable ? 'online' : 'offline'}`;
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

            // Quick replies shortcut (Ctrl+Q)
            messageInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'q') {
                    e.preventDefault();
                    this.showQuickReplies();
                }
            });
        }

        // Support status toggle
        const statusToggle = document.getElementById('supportStatusToggle');
        if (statusToggle) {
            statusToggle.addEventListener('change', (e) => {
                this.updateSupportStatus(e.target.checked);
            });
        }

        // Quick replies button
        const quickRepliesBtn = document.getElementById('quickRepliesBtn');
        if (quickRepliesBtn) {
            quickRepliesBtn.addEventListener('click', () => {
                this.showQuickReplies();
            });
        }

        // Auto-refresh queue and conversations every 5 seconds
        setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.loadSupportData();
            }
        }, 5000);
    }

    updateUserPresence(data) {
        console.log('User presence updated:', data);
    }

    updateOnlineUsers(users) {
        // Update dashboard stats
        const activeUsersCount = document.getElementById('activeUsersCount');
        if (activeUsersCount) {
            activeUsersCount.textContent = users.length;
        }
    }

    updateDashboardStats() {
        // Update various dashboard statistics
        const activeConversationsCount = document.getElementById('activeConversationsCount');
        if (activeConversationsCount) {
            activeConversationsCount.textContent = this.conversations.size;
        }

        const totalMessagesCount = document.getElementById('totalMessagesCount');
        if (totalMessagesCount) {
            totalMessagesCount.textContent = '0'; // This would be calculated from actual data
        }

        const responseTimeCount = document.getElementById('responseTimeCount');
        if (responseTimeCount) {
            responseTimeCount.textContent = '2m'; // This would be calculated from actual data
        }

        const satisfactionRate = document.getElementById('satisfactionRate');
        if (satisfactionRate) {
            satisfactionRate.textContent = '95%'; // This would be calculated from actual data
        }
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
                <i class="fas fa-headset"></i>
                <p>Choose a conversation to start helping users</p>
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
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString();
    }
}

// Global functions for HTML onclick handlers
let supportMessaging;

function claimConversation(conversationId, userName, userRole) {
    if (supportMessaging) {
        supportMessaging.claimConversation(conversationId, userName, userRole);
    }
}

function openConversation(conversationId, userName, userRole) {
    if (supportMessaging) {
        supportMessaging.openConversation(conversationId, userName, userRole);
    }
}

function sendMessage() {
    if (supportMessaging) {
        supportMessaging.sendMessage();
    }
}

function sendQuickReply(message) {
    if (supportMessaging) {
        supportMessaging.sendQuickReply(message);
    }
}

function hideQuickReplies() {
    const quickReplies = document.querySelector('.quick-replies');
    if (quickReplies) {
        quickReplies.remove();
    }
}

function closeChat() {
    if (supportMessaging) {
        supportMessaging.closeChat();
    }
}

// Navigation function
function handleNavClick(section, event) {
    if (event) event.preventDefault();
    
    // Hide all sections
    document.querySelectorAll('.dashboard-content, .messages-section, .tickets-section, .knowledge-section, .reports-section').forEach(s => {
        s.style.display = 'none';
    });
    
    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const sectionElement = document.getElementById(section + 'Section');
    if (sectionElement) {
        sectionElement.style.display = 'block';
    }
    
    // Add active class to clicked nav item
    const clickedNavItem = document.querySelector(`[data-section="${section}"]`);
    if (clickedNavItem) {
        clickedNavItem.classList.add('active');
    }
    
    // Initialize support messaging when messages section is opened
    if (section === 'messages' && !supportMessaging) {
        supportMessaging = new SupportMessaging();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Support dashboard loaded');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupportMessaging;
}