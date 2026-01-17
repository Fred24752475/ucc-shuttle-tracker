// Student Friends & Messaging System
class StudentFriendsSystem {
    constructor() {
        this.currentChatFriend = null;
        this.friends = [];
        this.friendRequests = [];
        this.allStudents = [];
        this.socket = null;
    }

    async init() {
        console.log('🤝 Initializing Friends System...');
        await this.loadFriends();
        await this.loadFriendRequests();
        await this.loadAllStudents();
        this.setupSocketListeners();
        this.setupEventListeners();
    }

    setupSocketListeners() {
        if (typeof io !== 'undefined') {
            this.socket = io(API_CONFIG.API_URL);
            const userId = JSON.parse(localStorage.getItem('ucc_user')).id;
            
            // Listen for friend requests
            this.socket.on(`friend_request_${userId}`, (data) => {
                this.loadFriendRequests();
                this.showNotification('New friend request!', 'info');
            });
            
            // Listen for new messages
            this.socket.on(`new_message_${userId}`, (data) => {
                if (this.currentChatFriend && this.currentChatFriend.friend_id == data.from) {
                    this.loadMessages(data.from);
                }
                this.showNotification('New message!', 'info');
            });
        }
    }

    setupEventListeners() {
        // Tab buttons
        document.querySelectorAll('.chat-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.showFriendsTab(tab);
            });
        });

        // Search input
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', () => this.filterStudents());
        }

        // Send message button
        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Message input enter key
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    showFriendsTab(tab) {
        // Hide all tabs
        document.getElementById('friendsTabContent').style.display = 'none';
        document.getElementById('requestsTabContent').style.display = 'none';
        document.getElementById('findTabContent').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'none';
        
        // Remove active class
        document.querySelectorAll('.chat-tab-btn').forEach(btn => btn.classList.remove('active'));
        
        // Show selected tab
        if (tab === 'friends') {
            document.getElementById('friendsTabContent').style.display = 'block';
            document.querySelector('[data-tab="friends"]').classList.add('active');
            this.loadFriends();
        } else if (tab === 'requests') {
            document.getElementById('requestsTabContent').style.display = 'block';
            document.querySelector('[data-tab="requests"]').classList.add('active');
            this.loadFriendRequests();
        } else if (tab === 'find') {
            document.getElementById('findTabContent').style.display = 'block';
            document.querySelector('[data-tab="find"]').classList.add('active');
            this.loadAllStudents();
        }
    }

    filterStudents() {
        const search = document.getElementById('studentSearch').value.toLowerCase();
        const cards = document.querySelectorAll('.student-card');
        cards.forEach(card => {
            const name = card.querySelector('h4').textContent.toLowerCase();
            card.style.display = name.includes(search) ? 'flex' : 'none';
        });
    }

    async loadAllStudents() {
        try {
            const token = localStorage.getItem('ucc_token');
            console.log('📚 Loading all students...');
            
            if (!token) {
                console.error('❌ No token found');
                this.showNotification('Please login first', 'error');
                return;
            }
            
            const response = await fetch(`${API_CONFIG.API_URL}/api/students/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('📡 Students API response status:', response.status);
            
            const data = await response.json();
            console.log('📦 Students data:', data);
            
            if (data.success) {
                this.allStudents = data.students;
                console.log(`✅ Loaded ${this.allStudents.length} students`);
                this.displayStudentsList();
            } else {
                console.error('❌ Failed to load students:', data.message);
                this.showNotification(data.message || 'Failed to load students', 'error');
            }
        } catch (error) {
            console.error('❌ Error loading students:', error);
            this.showNotification('Error loading students', 'error');
        }
    }

    displayStudentsList() {
        const container = document.getElementById('allStudentsList');
        if (!container) return;

        if (this.allStudents.length === 0) {
            container.innerHTML = '<div class="no-students">No other students found</div>';
            return;
        }

        container.innerHTML = this.allStudents.map(student => `
            <div class="student-card">
                <div class="student-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=1565c0&color=fff" alt="${student.name}">
                </div>
                <div class="student-info">
                    <h4>${student.name}</h4>
                    <p>${student.student_id || 'Student'}</p>
                </div>
                <button class="btn-add-friend" data-student-id="${student.id}">
                    ➕ Add Friend
                </button>
            </div>
        `).join('');

        // Add event listeners to all add friend buttons
        container.querySelectorAll('.btn-add-friend').forEach(btn => {
            btn.addEventListener('click', () => {
                const studentId = parseInt(btn.getAttribute('data-student-id'));
                this.sendFriendRequest(studentId);
            });
        });
    }

    async sendFriendRequest(receiverId) {
        try {
            const token = localStorage.getItem('ucc_token');
            const response = await fetch(`${API_CONFIG.API_URL}/api/friends/request`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ receiver_id: receiverId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Friend request sent! ✅', 'success');
                this.loadAllStudents();
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            this.showNotification('Error sending request', 'error');
        }
    }

    async loadFriendRequests() {
        try {
            const token = localStorage.getItem('ucc_token');
            const response = await fetch(`${API_CONFIG.API_URL}/api/friends/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.friendRequests = data.requests;
                this.displayFriendRequests();
                this.updateRequestBadge();
            }
        } catch (error) {
            console.error('Error loading friend requests:', error);
        }
    }

    displayFriendRequests() {
        const container = document.getElementById('friendRequestsList');
        if (!container) return;

        if (this.friendRequests.length === 0) {
            container.innerHTML = '<div class="no-requests">No pending requests</div>';
            return;
        }

        container.innerHTML = this.friendRequests.map(request => `
            <div class="friend-request-card">
                <div class="request-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(request.name)}&background=4caf50&color=fff" alt="${request.name}">
                </div>
                <div class="request-info">
                    <h4>${request.name}</h4>
                    <p>${request.student_id || 'Student'}</p>
                    <small>${new Date(request.created_at).toLocaleDateString()}</small>
                </div>
                <div class="request-actions">
                    <button class="btn-accept" data-request-id="${request.id}">✓ Accept</button>
                    <button class="btn-reject" data-request-id="${request.id}">✗ Reject</button>
                </div>
            </div>
        `).join('');

        // Add event listeners to accept buttons
        container.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', () => {
                const requestId = parseInt(btn.getAttribute('data-request-id'));
                this.acceptRequest(requestId);
            });
        });

        // Add event listeners to reject buttons
        container.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', () => {
                const requestId = parseInt(btn.getAttribute('data-request-id'));
                this.rejectRequest(requestId);
            });
        });
    }

    updateRequestBadge() {
        const badge = document.getElementById('friendRequestBadge');
        if (badge) {
            if (this.friendRequests.length > 0) {
                badge.textContent = this.friendRequests.length;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    async acceptRequest(requestId) {
        try {
            const token = localStorage.getItem('ucc_token');
            const response = await fetch(`${API_CONFIG.API_URL}/api/friends/accept/${requestId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Friend request accepted! 🎉', 'success');
                this.loadFriendRequests();
                this.loadFriends();
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    }

    async rejectRequest(requestId) {
        try {
            const token = localStorage.getItem('ucc_token');
            const response = await fetch(`${API_CONFIG.API_URL}/api/friends/reject/${requestId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Request rejected', 'info');
                this.loadFriendRequests();
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    }

    async loadFriends() {
        try {
            const token = localStorage.getItem('ucc_token');
            const response = await fetch(`${API_CONFIG.API_URL}/api/friends`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.friends = data.friends;
                this.displayFriendsList();
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    displayFriendsList() {
        const container = document.getElementById('friendsList');
        if (!container) return;

        if (this.friends.length === 0) {
            container.innerHTML = '<div class="no-friends">No friends yet. Add some friends to start chatting!</div>';
            return;
        }

        container.innerHTML = this.friends.map(friend => `
            <div class="friend-card" data-friend-id="${friend.friend_id}" data-friend-name="${friend.name}">
                <div class="friend-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=667eea&color=fff" alt="${friend.name}">
                    <span class="online-status ${friend.last_login ? 'online' : 'offline'}"></span>
                </div>
                <div class="friend-info">
                    <h4>${friend.name}</h4>
                    <p>${friend.student_id || 'Student'}</p>
                    <small>Friends since ${new Date(friend.friends_since).toLocaleDateString()}</small>
                </div>
                <div class="chat-icon">💬</div>
            </div>
        `).join('');

        // Add event listeners to friend cards
        container.querySelectorAll('.friend-card').forEach(card => {
            card.addEventListener('click', () => {
                const friendId = parseInt(card.getAttribute('data-friend-id'));
                const friendName = card.getAttribute('data-friend-name');
                this.openChat(friendId, friendName);
            });
        });
    }

    async openChat(friendId, friendName) {
        this.currentChatFriend = { friend_id: friendId, name: friendName };
        
        // Show chat area
        document.getElementById('chatHeader').innerHTML = `
            <div class="chat-header-content">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(friendName)}&background=667eea&color=fff" alt="${friendName}">
                <div>
                    <h3>${friendName}</h3>
                    <p class="online-status">Online</p>
                </div>
            </div>
        `;
        
        document.getElementById('chatMessages').style.display = 'block';
        document.getElementById('chatInput').style.display = 'flex';
        
        await this.loadMessages(friendId);
    }

    async loadMessages(friendId) {
        try {
            const token = localStorage.getItem('ucc_token');
            const response = await fetch(`${API_CONFIG.API_URL}/api/messages/${friendId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.displayMessages(data.messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    displayMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const currentUserId = JSON.parse(localStorage.getItem('ucc_user')).id;

        if (messages.length === 0) {
            container.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isMe = msg.sender_id == currentUserId;
            return `
                <div class="message ${isMe ? 'message-sent' : 'message-received'}">
                    <div class="message-content">
                        ${!isMe ? `<strong>${msg.sender_name}</strong>` : ''}
                        <p>${msg.content}</p>
                        <small>${new Date(msg.created_at).toLocaleTimeString()}</small>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        if (!this.currentChatFriend) return;

        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content) return;

        try {
            const token = localStorage.getItem('ucc_token');
            const response = await fetch(`${API_CONFIG.API_URL}/api/messages/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiver_id: this.currentChatFriend.friend_id,
                    content
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                input.value = '';
                this.loadMessages(this.currentChatFriend.friend_id);
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Error sending message', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize when DOM is ready and make globally available
window.friendsSystem = null;
document.addEventListener('DOMContentLoaded', () => {
    window.friendsSystem = new StudentFriendsSystem();
    console.log('✅ Friends system created and ready');
});
