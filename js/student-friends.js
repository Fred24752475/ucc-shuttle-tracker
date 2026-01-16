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
            this.socket = io();
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

    async loadAllStudents() {
        try {
            const token = localStorage.getItem('ucc_token');
            const response = await fetch(`${API_CONFIG.API_URL}/api/students/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.allStudents = data.students;
                this.displayStudentsList();
            }
        } catch (error) {
            console.error('Error loading students:', error);
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
                <button class="btn-add-friend" onclick="friendsSystem.sendFriendRequest(${student.id})">
                    ➕ Add Friend
                </button>
            </div>
        `).join('');
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
                    <button class="btn-accept" onclick="friendsSystem.acceptRequest(${request.id})">✓ Accept</button>
                    <button class="btn-reject" onclick="friendsSystem.rejectRequest(${request.id})">✗ Reject</button>
                </div>
            </div>
        `).join('');
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
            <div class="friend-card" onclick="friendsSystem.openChat(${friend.friend_id}, '${friend.name}')">
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

// Initialize when DOM is ready
let friendsSystem;
document.addEventListener('DOMContentLoaded', () => {
    friendsSystem = new StudentFriendsSystem();
});

// Make it globally available
window.friendsSystem = friendsSystem;
