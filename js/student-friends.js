class StudentFriendsSystem {
    constructor() {
        this.current = null;
        this.directory = { students: [], drivers: [], requests: [], friends: [], conversations: [] };
        this.socket = null;
        this.bound = false;
        this.seen = new Set();
        this.tab = 'chats';
    }

    me() {
        try { return JSON.parse(localStorage.getItem('ucc_user') || '{}'); }
        catch (error) { return {}; }
    }

    token() {
        return localStorage.getItem('ucc_token');
    }

    esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }

    async init() {
        if (!this.token()) return;
        if (!this.bound) {
            this.bindEvents();
            this.connectSocket();
            this.bound = true;
        }
        this.applyRoleTabs();
        await this.loadDirectory();
    }

    applyRoleTabs() {
        const driver = this.me().role === 'driver';
        document.querySelectorAll('[data-tab="requests"], [data-tab="students"]').forEach((button) => {
            button.style.display = driver ? 'none' : '';
        });
        const people = document.querySelector('[data-tab="people"]');
        if (people) people.textContent = driver ? 'Students' : 'Students';
    }

    bindEvents() {
        document.querySelectorAll('.chat-tab-btn').forEach((button) => {
            button.addEventListener('click', () => this.showTab(button.getAttribute('data-tab')));
        });
        const search = document.getElementById('studentSearch');
        if (search) search.addEventListener('input', () => this.filterPeople());
        const input = document.getElementById('messageInput');
        if (input) {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.sendMessage();
                }
            });
        }
        const back = document.getElementById('chatBackBtn');
        if (back) back.addEventListener('click', () => this.closeChat());
    }

    connectSocket() {
        if (typeof io === 'undefined' || this.socket) return;
        this.socket = io({ auth: { token: this.token() } });
        this.socket.on('chat:message', (message) => this.onIncoming(message));
        this.socket.on('chat:request', () => {
            this.loadDirectory();
            this.showNotification('New friend request');
        });
        this.socket.on('chat:accepted', () => {
            this.loadDirectory();
            this.showNotification('Your friend request was accepted');
        });
        this.socket.on('chat:presence', () => this.loadDirectory());
    }

    async loadDirectory() {
        const response = await fetch('/api/chat/directory', {
            headers: { Authorization: `Bearer ${this.token()}` }
        });
        const data = await response.json();
        if (!data.success) {
            this.showNotification(data.message || 'Could not load chat', 'error');
            return;
        }
        this.directory = data;
        this.render();
        const unread = (data.conversations || []).reduce((sum, chat) => sum + (chat.unread || 0), 0);
        const badge = document.getElementById('messageBadge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread ? 'inline-block' : 'none';
        }
    }

    showTab(tab) {
        this.tab = tab;
        this.closeChat();
        document.querySelectorAll('.chat-tab-btn').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-tab') === tab);
        });
        this.render();
    }

    render() {
        const pane = document.getElementById('chatDirectoryList');
        if (!pane) return;
        const role = this.me().role;
        let html = '';
        if (this.tab === 'chats') {
            const rows = this.directory.conversations || [];
            html = rows.length ? rows.map((person) => this.personRow(person, 'Open')).join('') : '<div class="no-friends">No chats yet.</div>';
        } else if (this.tab === 'requests') {
            const rows = this.directory.requests || [];
            html = rows.length ? rows.map((person) => this.requestRow(person)).join('') : '<div class="no-requests">No pending requests</div>';
        } else if (this.tab === 'students') {
            html = this.studentRows();
        } else if (this.tab === 'drivers') {
            const rows = role === 'driver' ? (this.directory.students || []) : (this.directory.drivers || []);
            html = rows.length ? rows.map((person) => this.personRow(person, 'Message')).join('') : '<div class="no-students">Nobody to message yet.</div>';
        } else if (this.tab === 'people') {
            html = role === 'driver'
                ? ((this.directory.students || []).map((person) => this.personRow(person, 'Message')).join('') || '<div class="no-students">No students yet.</div>')
                : this.studentRows();
        }
        pane.innerHTML = html;
        pane.querySelectorAll('[data-open]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.openChat(JSON.parse(button.getAttribute('data-open')));
            });
        });
        pane.querySelectorAll('[data-add]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.sendFriendRequest(button.getAttribute('data-add'));
            });
        });
        pane.querySelectorAll('[data-accept]').forEach((button) => {
            button.addEventListener('click', () => this.answerRequest(button.getAttribute('data-accept'), 'accept'));
        });
        pane.querySelectorAll('[data-reject]').forEach((button) => {
            button.addEventListener('click', () => this.answerRequest(button.getAttribute('data-reject'), 'reject'));
        });
        const requestBadge = document.getElementById('friendRequestBadge');
        if (requestBadge) {
            const count = (this.directory.requests || []).length;
            requestBadge.textContent = count;
            requestBadge.style.display = count ? 'inline-block' : 'none';
        }
    }

    studentRows() {
        const rows = this.directory.students || [];
        if (!rows.length) return '<div class="no-students">No other students yet.</div>';
        return rows.map((person) => {
            if (person.friendship === 'accepted') return this.personRow(person, 'Message');
            if (person.incoming) return this.requestRow(person);
            if (person.friendship === 'pending') return this.personRow(person, 'Requested', true);
            return this.personRow(person, 'Add', false, true);
        }).join('');
    }

    when(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    personRow(person, label, disabled, add) {
        const open = this.esc(JSON.stringify({ id: person.id, name: person.name, profileImage: person.profileImage, role: person.role }));
        const preview = person.lastMessage || (person.role === 'driver' ? 'Driver' : 'Student');
        const action = add
            ? `<button class="btn-add-friend" type="button" data-add="${person.id}">Add</button>`
            : '';
        return `
            <div class="student-card wa-row" data-name="${this.esc(person.name)}" ${add || disabled ? '' : `data-open="${open}"`}>
                <img src="${this.esc(person.profileImage || '/images/default-user.svg')}" alt="" onerror="this.onerror=null;this.src='/images/default-user.svg'">
                <div class="wa-row-body">
                    <div class="wa-row-top">
                        <strong>${this.esc(person.name)}</strong>
                        <time class="${person.unread ? 'unread' : ''}">${this.esc(this.when(person.lastAt))}</time>
                    </div>
                    <div class="wa-row-bottom">
                        <span>${this.esc(preview)}</span>
                        ${person.unread ? `<em class="wa-badge">${person.unread}</em>` : ''}
                        ${disabled ? `<em class="wa-wait">${this.esc(label)}</em>` : ''}
                    </div>
                </div>
                ${action}
            </div>`;
    }

    requestRow(person) {
        return `
            <div class="friend-request-card">
                <div class="request-avatar"><img src="${this.esc(person.profileImage || '/images/default-user.svg')}" alt="" onerror="this.onerror=null;this.src='/images/default-user.svg'"></div>
                <div class="request-info">
                    <h4>${this.esc(person.name)}</h4>
                    <p>Wants to chat</p>
                </div>
                <div class="request-actions">
                    <button class="btn-accept" data-accept="${person.requestId}">Accept</button>
                    <button class="btn-reject" data-reject="${person.requestId}">Reject</button>
                </div>
            </div>`;
    }

    filterPeople() {
        const search = (document.getElementById('studentSearch').value || '').toLowerCase();
        document.querySelectorAll('#chatDirectoryList .student-card, #chatDirectoryList .friend-request-card').forEach((card) => {
            const name = (card.getAttribute('data-name') || card.textContent || '').toLowerCase();
            card.style.display = name.includes(search) ? 'flex' : 'none';
        });
    }

    async sendFriendRequest(receiverId) {
        const response = await fetch('/api/friends/request', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiver_id: Number(receiverId) })
        });
        const data = await response.json();
        this.showNotification(data.message || (data.success ? 'Request sent' : 'Could not send'), data.success ? 'success' : 'error');
        if (data.success) this.loadDirectory();
    }

    async answerRequest(requestId, action) {
        const response = await fetch(`/api/friends/${action}/${requestId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.token()}` }
        });
        const data = await response.json();
        if (!data.success) this.showNotification(data.message || 'Could not update request', 'error');
        this.loadDirectory();
    }

    async openChat(person) {
        this.current = person;
        const layout = document.querySelector('.chat-layout');
        if (layout) layout.classList.add('chat-open');
        const box = document.getElementById('chatContainer');
        if (box) box.style.display = '';
        document.getElementById('chatHeader').innerHTML = `
            <div class="chat-header-content">
                <button type="button" class="chat-back" id="chatBackBtn" aria-label="Back">‹</button>
                <img src="${this.esc(person.profileImage || '/images/default-user.svg')}" alt="" onerror="this.onerror=null;this.src='/images/default-user.svg'">
                <div>
                    <h3>${this.esc(person.name)}</h3>
                    <p>${person.online ? 'online' : this.esc(person.role === 'driver' ? 'Driver' : 'Student')}</p>
                </div>
            </div>`;
        document.getElementById('chatBackBtn').addEventListener('click', () => this.closeChat());
        document.getElementById('chatMessages').style.display = 'block';
        document.getElementById('chatInput').style.display = 'flex';
        const response = await fetch(`/api/messages/${person.id}`, {
            headers: { Authorization: `Bearer ${this.token()}` }
        });
        const data = await response.json();
        this.seen = new Set();
        this.paintMessages(data.messages || []);
        this.loadDirectory();
    }

    closeChat() {
        this.current = null;
        const layout = document.querySelector('.chat-layout');
        if (layout) layout.classList.remove('chat-open');
        const box = document.getElementById('chatContainer');
        if (box) box.style.display = '';
        const messages = document.getElementById('chatMessages');
        const input = document.getElementById('chatInput');
        if (messages) messages.style.display = 'none';
        if (input) input.style.display = 'none';
        const header = document.getElementById('chatHeader');
        if (header) header.innerHTML = '<div class="no-chat-selected"><p>Select someone to start chatting</p></div>';
    }

    paintMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        const mine = Number(this.me().id);
        if (!messages.length) {
            container.innerHTML = '<div class="no-messages">No messages yet. Say hello.</div>';
            return;
        }
        container.innerHTML = messages.map((message) => this.bubble(message, mine)).join('');
        messages.forEach((message) => this.seen.add(message.id));
        container.scrollTop = container.scrollHeight;
    }

    bubble(message, mine) {
        const own = Number(message.sender_id) === Number(mine);
            return `
                <div class="message ${own ? 'message-sent' : 'message-received'}" data-id="${message.id}">
                    <div class="message-content">
                        <p>${this.esc(message.content)}</p>
                        <small>${this.esc(this.when(message.created_at))}</small>
                    </div>
                </div>`;
    }

    onIncoming(message) {
        if (!message || this.seen.has(message.id)) return;
        const other = Number(message.sender_id) === Number(this.me().id) ? Number(message.receiver_id) : Number(message.sender_id);
        if (this.current && Number(this.current.id) === other) {
            const container = document.getElementById('chatMessages');
            const empty = container.querySelector('.no-messages');
            if (empty) empty.remove();
            container.insertAdjacentHTML('beforeend', this.bubble(message, this.me().id));
            this.seen.add(message.id);
            container.scrollTop = container.scrollHeight;
        } else if (Number(message.sender_id) !== Number(this.me().id)) {
            this.showNotification('New message');
        }
        this.loadDirectory();
    }

    async sendMessage() {
        if (!this.current) return;
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        if (!content) return;
        input.value = '';
        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiver_id: this.current.id, content })
        });
        const data = await response.json();
        if (!data.success) {
            input.value = content;
            this.showNotification(data.message || 'Could not send', 'error');
            return;
        }
        this.onIncoming({
            id: data.message.id,
            sender_id: this.me().id,
            receiver_id: this.current.id,
            content: data.message.content,
            created_at: data.message.created_at
        });
    }

    showNotification(message, type) {
        const note = document.createElement('div');
        note.className = 'notification';
        note.textContent = message;
        note.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 18px;background:${type === 'error' ? '#c62828' : '#128a3a'};color:#fff;border-radius:10px;z-index:10000`;
        document.body.appendChild(note);
        setTimeout(() => note.remove(), 2800);
    }
}

window.friendsSystem = null;
document.addEventListener('DOMContentLoaded', () => {
    window.friendsSystem = new StudentFriendsSystem();
});
