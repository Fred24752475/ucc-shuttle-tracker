/**
 * UCC Shuttle Tracker - Messaging Module
 * Handles real-time messaging functionality
 */

class UCCMessaging {
    constructor() {
        this.apiBaseUrl = '/api/messaging';
        this.token = localStorage.getItem('ucc_token') || null;
        this.user = JSON.parse(localStorage.getItem('ucc_user') || 'null');
        this.currentConversation = null;
        this.conversations = [];
        this.socket = null;
        
        this.init();
    }

    init() {
        console.log('💬 Initializing messaging system...');
        
        if (!this.token || !this.user) {
            console.warn('❌ No authentication found for messaging');
            return;
        }
        
        this.loadConversations();
        this.setupEventListeners();
        this.initializeSocket();
    }

    // Load user's conversations
    async loadConversations() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/conversations`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.conversations = data.conversations || [];
                this.updateConversationsList();
                console.log(`✅ Loaded ${this.conversations.length} conversations`);
            } else {
                console.error('❌ Failed to load conversations');
            }
        } catch (error) {
            console.error('❌ Error loading conversations:', error);
        }
    }

    // Load messages for a conversation
    async loadMessages(conversationId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/conversations/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayMessages(data.messages || []);
                console.log(`✅ Loaded ${data.messages?.length || 0} messages`);
            } else {
                console.error('❌ Failed to load messages');
            }
        } catch (error) {
            console.error('❌ Error loading messages:', error);
        }
    }

    // Send a message
    async sendMessage(conversationId, content, messageType = 'text') {
        if (!content || content.trim() === '') {
            return false;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content.trim(),
                    messageType,
                    metadata: null
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Message sent successfully');
                return data.data;
            } else {
                console.error('❌ Failed to send message');
                return false;
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return false;
        }
    }

    // Create or find conversation
    async createConversation(participantIds, type, title = null) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    participantIds,
                    type,
                    title
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Conversation created/found:', data.conversationId);
                
                // Reload conversations list
                await this.loadConversations();
                
                return data.conversationId;
            } else {
                console.error('❌ Failed to create conversation');
                return null;
            }
        } catch (error) {
            console.error('❌ Error creating conversation:', error);
            return null;
        }
    }

    // Get online users
    async getOnlineUsers(role = null) {
        try {
            let url = `${this.apiBaseUrl}/users/online`;
            if (role) {
                url += `?role=${role}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.users || [];
            } else {
                console.error('❌ Failed to get online users');
                return [];
            }
        } catch (error) {
            console.error('❌ Error getting online users:', error);
            return [];
        }
    }

    // Display messages in chat
    displayMessages(messages) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            messagesContainer.appendChild(messageEl);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Create message element
    createMessageElement(message) {
        const messageEl = document.createElement('div');
        const isOwnMessage = message.sender_id === this.user.id;
        
        messageEl.className = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
        
        const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageEl.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">${message.sender_name}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${message.content}</div>
            </div>
        `;
        
        return messageEl;
    }

    // Update conversations list
    updateConversationsList() {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;

        conversationsList.innerHTML = '';

        this.conversations.forEach(conversation => {
            const conversationEl = this.createConversationElement(conversation);
            conversationsList.appendChild(conversationEl);
        });
    }

    // Create conversation element
    createConversationElement(conversation) {
        const conversationEl = document.createElement('div');
        conversationEl.className = 'conversation-item';
        conversationEl.onclick = () => this.selectConversation(conversation.id);
        
        const lastMessageTime = conversation.last_message_time 
            ? new Date(conversation.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
        
        conversationEl.innerHTML = `
            <div class="conversation-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="conversation-content">
                <div class="conversation-header">
                    <span class="conversation-name">${conversation.title || conversation.other_user_name || 'Unknown'}</span>
                    <span class="conversation-time">${lastMessageTime}</span>
                </div>
                <div class="conversation-preview">
                    <span class="conversation-type">${conversation.type.replace('_', ' ')}</span>
                    ${conversation.unread_count > 0 ? `<span class="unread-badge">${conversation.unread_count}</span>` : ''}
                </div>
            </div>
        `;
        
        return conversationEl;
    }

    // Select conversation
    async selectConversation(conversationId) {
        this.currentConversation = conversationId;
        
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(el => {
            el.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
        // Load messages
        await this.loadMessages(conversationId);
    }

    // Setup event listeners
    setupEventListeners() {
        // Send message button
        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.handleSendMessage();
            });
        }

        // Enter key to send message
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSendMessage();
                }
            });
        }

        // Start chat buttons
        document.querySelectorAll('[data-start-chat]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetUserId = e.currentTarget.dataset.targetUserId;
                const chatType = e.currentTarget.dataset.chatType;
                this.startChat(targetUserId, chatType);
            });
        });
    }

    // Handle send message
    async handleSendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput || !this.currentConversation) return;

        const content = messageInput.value.trim();
        if (!content) return;

        // Send message
        const message = await this.sendMessage(this.currentConversation, content);
        
        if (message) {
            // Clear input
            messageInput.value = '';
            
            // Add message to UI immediately
            this.addMessageToUI(message);
        }
    }

    // Add message to UI
    addMessageToUI(message) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const messageEl = this.createMessageElement(message);
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Start chat with user
    async startChat(targetUserId, chatType) {
        console.log(`🚀 Starting ${chatType} chat with user ${targetUserId}`);
        
        const conversationId = await this.createConversation([targetUserId], chatType);
        
        if (conversationId) {
            this.selectConversation(conversationId);
            
            // Show chat interface
            const chatInterface = document.getElementById('chatInterface');
            if (chatInterface) {
                chatInterface.style.display = 'block';
            }
        }
    }

    // Initialize Socket.IO for real-time messaging
    initializeSocket() {
        if (typeof io === 'undefined') {
            console.warn('❌ Socket.IO not available');
            return;
        }

        this.socket = io('http://localhost:3001', {
            auth: {
                token: this.token
            }
        });

        this.socket.on('connect', () => {
            console.log('💬 Connected to messaging server');
        });

        this.socket.on('new_message', (message) => {
            console.log('📨 New message received:', message);
            if (message.conversation_id === this.currentConversation) {
                this.addMessageToUI(message);
            } else {
                // Update conversation list
                this.loadConversations();
            }
        });

        this.socket.on('message_read', (data) => {
            console.log('✅ Message read:', data);
            // Update read receipts in UI
        });

        this.socket.on('user_typing', (data) => {
            console.log('⌨️ User typing:', data);
            // Show typing indicator
        });
    }
}

// Initialize messaging when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uccMessaging === 'undefined') {
        window.uccMessaging = new UCCMessaging();
    }
});

// Global functions for HTML onclick handlers
window.startChatWithDriver = async (driverId) => {
    if (window.uccMessaging) {
        await window.uccMessaging.startChat(driverId, 'student_driver');
    }
};

window.startChatWithSupport = async () => {
    if (window.uccMessaging) {
        // Find first available support user
        const supportUsers = await window.uccMessaging.getOnlineUsers('support');
        if (supportUsers.length > 0) {
            await window.uccMessaging.startChat(supportUsers[0].id, 'student_support');
        } else {
            alert('No support agents available right now. Please try again later.');
        }
    }
};