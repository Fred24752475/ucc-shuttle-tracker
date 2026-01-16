// Universal Dark Mode System for UCC Shuttle Tracker
class DarkModeManager {
    constructor() {
        this.isDarkMode = localStorage.getItem('ucc_dark_mode') === 'true';
        this.init();
    }

    init() {
        this.createDarkModeToggle();
        this.applyTheme();
        this.injectDarkModeStyles();
    }

    createDarkModeToggle() {
        // Create dark mode toggle button
        const darkModeToggle = document.createElement('div');
        darkModeToggle.className = 'dark-mode-toggle';
        darkModeToggle.innerHTML = `
            <button class="theme-btn" id="themeBtn" title="Toggle Dark Mode">
                <i class="fas fa-${this.isDarkMode ? 'sun' : 'moon'}"></i>
                <span class="theme-text">${this.isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
        `;

        // Position away from language switcher
        const langSwitcher = document.querySelector('.language-switcher');
        if (langSwitcher) {
            // Keep language switcher on the right, dark mode on the left
            langSwitcher.style.right = '20px';
        }

        // Add CSS for dark mode toggle
        const style = document.createElement('style');
        style.textContent = `
            .dark-mode-toggle {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 9999;
            }
            
            .theme-btn {
                background: var(--bg-primary, white);
                border: 2px solid var(--primary-color, #1565c0);
                border-radius: 25px;
                padding: 8px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-primary, #1565c0);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
                min-width: 80px;
            }
            
            .theme-btn:hover {
                background: var(--primary-color, #1565c0);
                color: var(--bg-primary, white);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(21,101,192,0.3);
            }
            
            .theme-btn i {
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);

        // Insert at top of page
        document.body.insertBefore(darkModeToggle, document.body.firstChild);

        // Add event listener
        document.getElementById('themeBtn').addEventListener('click', () => {
            this.toggleDarkMode();
        });
    }

    injectDarkModeStyles() {
        const darkStyles = document.createElement('style');
        darkStyles.id = 'dark-mode-styles';
        darkStyles.textContent = `
            /* Dark Mode Variables */
            [data-theme="dark"] {
                --bg-primary: #f5f5f5;
                --bg-secondary: #e8e8e8;
                --bg-tertiary: #d0d0d0;
                --text-primary: #1a1a1a;
                --text-secondary: #333333;
                --text-muted: #666666;
                --border-color: #cccccc;
                --primary-color: #1565c0;
                --success-color: #2e7d32;
                --warning-color: #f57c00;
                --error-color: #d32f2f;
                --shadow: 0 2px 8px rgba(0,0,0,0.1);
                --card-bg: #ffffff;
                --sidebar-bg: #e0e0e0;
                --header-bg: #f0f0f0;
            }

            /* Global Dark Mode Styles */
            [data-theme="dark"] body {
                background: var(--bg-primary) !important;
                color: var(--text-primary) !important;
            }

            /* Sidebar Dark Mode */
            [data-theme="dark"] .sidebar {
                background: var(--sidebar-bg) !important;
                border-right: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .sidebar-header {
                background: var(--bg-secondary) !important;
                border-bottom: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .logo span,
            [data-theme="dark"] .user-name,
            [data-theme="dark"] .user-role {
                color: var(--text-primary) !important;
            }

            [data-theme="dark"] .nav-item a {
                color: var(--text-secondary) !important;
            }

            [data-theme="dark"] .nav-item:hover a,
            [data-theme="dark"] .nav-item.active a {
                color: var(--primary-color) !important;
                background: rgba(79, 195, 247, 0.1) !important;
            }

            [data-theme="dark"] .logout-btn {
                background: var(--bg-tertiary) !important;
                color: var(--text-primary) !important;
                border: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .logout-btn:hover {
                background: var(--error-color) !important;
            }

            /* Header Dark Mode */
            [data-theme="dark"] .top-header {
                background: var(--header-bg) !important;
                border-bottom: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .welcome-message h1,
            [data-theme="dark"] .welcome-message p {
                color: var(--text-primary) !important;
            }

            [data-theme="dark"] .stat-label {
                color: var(--text-secondary) !important;
            }

            [data-theme="dark"] .stat-number {
                color: var(--primary-color) !important;
            }

            /* Cards and Widgets Dark Mode */
            [data-theme="dark"] .action-card,
            [data-theme="dark"] .widget-card,
            [data-theme="dark"] .stat-card,
            [data-theme="dark"] .profile-summary-card {
                background: var(--card-bg) !important;
                border: 1px solid var(--border-color) !important;
                box-shadow: var(--shadow) !important;
            }

            [data-theme="dark"] .action-card h3,
            [data-theme="dark"] .widget-card h3,
            [data-theme="dark"] .section-title {
                color: var(--text-primary) !important;
            }

            [data-theme="dark"] .action-card p,
            [data-theme="dark"] .widget-card p {
                color: var(--text-secondary) !important;
            }

            [data-theme="dark"] .action-card:hover {
                transform: translateY(-4px) !important;
                box-shadow: 0 8px 25px rgba(79, 195, 247, 0.2) !important;
            }

            /* AI Assistant Dark Mode */
            [data-theme="dark"] .ai-chat-container {
                background: var(--bg-secondary) !important;
                border: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .ai-header {
                background: var(--bg-tertiary) !important;
                border-bottom: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .ai-info h3,
            [data-theme="dark"] .ai-info p {
                color: var(--text-primary) !important;
            }

            [data-theme="dark"] .ai-messages {
                background: var(--bg-primary) !important;
            }

            [data-theme="dark"] .message-bubble {
                background: var(--bg-tertiary) !important;
                border: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .ai-message.user .message-bubble {
                background: var(--primary-color) !important;
                color: white !important;
            }

            [data-theme="dark"] .ai-input-container input {
                background: var(--bg-tertiary) !important;
                border: 1px solid var(--border-color) !important;
                color: var(--text-primary) !important;
            }

            [data-theme="dark"] .ai-input-container input::placeholder {
                color: var(--text-muted) !important;
            }

            [data-theme="dark"] .ai-send-btn {
                background: var(--primary-color) !important;
            }

            /* Forms Dark Mode */
            [data-theme="dark"] input,
            [data-theme="dark"] select,
            [data-theme="dark"] textarea {
                background: var(--bg-tertiary) !important;
                border: 1px solid var(--border-color) !important;
                color: var(--text-primary) !important;
            }

            [data-theme="dark"] input::placeholder {
                color: var(--text-muted) !important;
            }

            /* Buttons Dark Mode */
            [data-theme="dark"] .btn-primary,
            [data-theme="dark"] .widget-btn {
                background: var(--primary-color) !important;
                color: white !important;
            }

            [data-theme="dark"] .btn-secondary {
                background: var(--bg-tertiary) !important;
                color: var(--text-primary) !important;
                border: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .back-btn {
                background: var(--bg-tertiary) !important;
                color: var(--text-primary) !important;
                border: 1px solid var(--border-color) !important;
            }

            /* Tables Dark Mode */
            [data-theme="dark"] table {
                background: var(--card-bg) !important;
                color: var(--text-primary) !important;
            }

            [data-theme="dark"] th {
                background: var(--bg-tertiary) !important;
                color: var(--text-primary) !important;
                border-bottom: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] td {
                border-bottom: 1px solid var(--border-color) !important;
            }

            /* Map Dark Mode */
            [data-theme="dark"] .leaflet-container {
                background: var(--bg-secondary) !important;
            }

            [data-theme="dark"] .leaflet-control-container {
                filter: invert(1) hue-rotate(180deg);
            }

            /* Status indicators Dark Mode */
            [data-theme="dark"] .status-dot.active {
                background: var(--success-color) !important;
            }

            [data-theme="dark"] .status-dot.ready {
                background: var(--primary-color) !important;
            }

            [data-theme="dark"] .status-text {
                color: var(--text-secondary) !important;
            }

            /* Notification badges Dark Mode */
            [data-theme="dark"] .notification-badge {
                background: var(--error-color) !important;
                color: white !important;
            }

            /* Quick action buttons Dark Mode */
            [data-theme="dark"] .quick-action-btn {
                background: var(--bg-tertiary) !important;
                color: var(--text-primary) !important;
                border: 1px solid var(--border-color) !important;
            }

            [data-theme="dark"] .quick-action-btn:hover {
                background: var(--primary-color) !important;
                color: white !important;
            }

            /* Scrollbars Dark Mode */
            [data-theme="dark"] ::-webkit-scrollbar {
                width: 8px;
                background: var(--bg-secondary);
            }

            [data-theme="dark"] ::-webkit-scrollbar-thumb {
                background: var(--border-color);
                border-radius: 4px;
            }

            [data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
                background: var(--text-muted);
            }

            /* Language switcher dark mode compatibility */
            [data-theme="dark"] .lang-btn {
                background: var(--bg-primary) !important;
                border-color: var(--primary-color) !important;
                color: var(--primary-color) !important;
            }

            [data-theme="dark"] .lang-btn:hover {
                background: var(--primary-color) !important;
                color: var(--bg-primary) !important;
            }

            [data-theme="dark"] .lang-dropdown {
                background: var(--bg-secondary) !important;
                border-color: var(--border-color) !important;
            }

            [data-theme="dark"] .lang-option {
                color: var(--text-primary) !important;
            }

            [data-theme="dark"] .lang-option:hover {
                background: var(--bg-tertiary) !important;
            }

            [data-theme="dark"] .lang-option.active {
                background: var(--primary-color) !important;
                color: white !important;
            }
        `;
        document.head.appendChild(darkStyles);
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('ucc_dark_mode', this.isDarkMode.toString());
        this.applyTheme();
        this.updateToggleButton();
    }

    applyTheme() {
        if (this.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    updateToggleButton() {
        const themeBtn = document.getElementById('themeBtn');
        const icon = themeBtn.querySelector('i');
        const text = themeBtn.querySelector('.theme-text');
        
        if (this.isDarkMode) {
            icon.className = 'fas fa-sun';
            text.textContent = 'Light';
            themeBtn.title = 'Switch to Light Mode';
        } else {
            icon.className = 'fas fa-moon';
            text.textContent = 'Dark';
            themeBtn.title = 'Switch to Dark Mode';
        }
    }
}

// Initialize dark mode when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.darkModeManager = new DarkModeManager();
});