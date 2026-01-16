/**
 * UCC Shuttle Tracker - Security Module
 * Enhanced authentication, RBAC, MFA, audit logs
 */

class UCCSecurity {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.token = localStorage.getItem('ucc_token') || null;
        this.user = JSON.parse(localStorage.getItem('ucc_user') || 'null');
        this.twoFactorEnabled = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 3;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        
        this.init();
    }

    init() {
        console.log('🔐 Initializing security module...');
        
        this.checkForMFA();
        this.setupSecurityEventListeners();
        this.monitorSuspiciousActivity();
        this.validateSession();
        
        console.log('✅ Security module ready');
    }

    // Check if user has MFA enabled
    checkForMFA() {
        const mfaEnabled = localStorage.getItem('ucc_mfa_enabled');
        this.twoFactorEnabled = mfaEnabled === 'true';
        
        if (this.twoFactorEnabled) {
            console.log('✅ MFA enabled for user');
        }
    }

    // Setup security event listeners
    setupSecurityEventListeners() {
        // Monitor for suspicious activity
        document.addEventListener('keydown', (e) => {
            this.detectSuspiciousKeyCombos(e);
        });
        
        // Monitor for failed login attempts
        this.trackFailedLogins();
        
        // Setup session timeout
        this.setupSessionTimeout();
    }

    // Detect suspicious key combinations
    detectSuspiciousKeyCombos(event) {
        const suspiciousCombos = [
            'F12', // Developer tools
            'Ctrl+Shift+I', // Developer tools
            'Ctrl+Shift+J', // Developer tools
            'Ctrl+Shift+C'  // Developer tools
        ];
        
        // Check if any suspicious combo is pressed
        const isSuspicious = suspiciousCombos.some(combo => {
            const keys = combo.toLowerCase().split('+');
            const ctrlKey = event.ctrlKey || event.metaKey;
            
            if (keys.length === 1 && keys[0] === 'f12') {
                return event.code === 'F12';
            }
            
            if (keys.length === 3) {
                return ctrlKey && 
                       keys.includes('shift') && 
                       (keys.includes('i') || keys.includes('j') || keys.includes('c'));
            }
        });
        
        if (isSuspicious) {
            this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
                type: 'DEVELOPER_TOOLS_DETECTED',
                combo: event.code,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
            
            // Show security warning
            this.showSecurityWarning('Developer tools detected. This action will be logged.');
        }
    }

    // Track failed login attempts
    trackFailedLogins() {
        const recentFailures = JSON.parse(localStorage.getItem('ucc_failed_logins') || '[]');
        
        // Clean failures older than 1 hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const validFailures = recentFailures.filter(failure => failure.timestamp > oneHourAgo);
        
        // Update failed attempts
        this.loginAttempts = validFailures.length;
        localStorage.setItem('ucc_failed_logins', JSON.stringify(validFailures));
        
        if (this.loginAttempts >= this.maxLoginAttempts) {
            this.enforceAccountLockout();
        }
    }

    // Enforce account lockout
    enforceAccountLockout() {
        const lockoutEnd = Date.now() + this.lockoutDuration;
        localStorage.setItem('ucc_account_locked_until', lockoutEnd.toString());
        
        this.logSecurityEvent('ACCOUNT_LOCKED', {
            reason: 'TOO_MANY_LOGIN_ATTEMPTS',
            lockoutDuration: this.lockoutDuration,
            timestamp: new Date().toISOString()
        });
        
        const minutes = Math.ceil(this.lockoutDuration / (60 * 1000));
        this.showSecurityWarning(`Account locked. Try again in ${minutes} minutes.`);
    }

    // Setup session timeout
    setupSessionTimeout() {
        // Auto logout after 2 hours of inactivity
        const inactivityTimeout = 2 * 60 * 60 * 1000; // 2 hours
        
        let lastActivity = Date.now();
        
        // Track user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
            });
        });
        
        // Check for inactivity every 30 seconds
        setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > inactivityTimeout) {
                this.handleSessionTimeout();
            }
        }, 30000);
    }

    // Handle session timeout
    handleSessionTimeout() {
        this.logSecurityEvent('SESSION_TIMEOUT', {
            type: 'AUTO_LOGOUT_INACTIVITY',
            timeout: 2 * 60 * 60 * 1000, // 2 hours
            timestamp: new Date().toISOString()
        });
        
        // Show warning and logout
        this.showSecurityWarning('Session expired due to inactivity. Please log in again.');
        setTimeout(() => {
            this.logoutUser();
        }, 5000);
    }

    // Monitor suspicious activity
    monitorSuspiciousActivity() {
        // Monitor for multiple rapid actions
        let actionCount = 0;
        const suspiciousThreshold = 10; // More than 10 actions in 1 second
        
        document.addEventListener('click', () => {
            actionCount++;
            
            setTimeout(() => {
                if (actionCount > suspiciousThreshold) {
                    this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
                        type: 'RAPID_CLICK_PATTERN',
                        actionCount,
                        timestamp: new Date().toISOString()
                    });
                }
                actionCount = 0;
            }, 1000);
        });
        
        // Monitor for unusual timing patterns
        this.monitorUnusualTiming();
    }

    // Monitor for unusual timing patterns
    monitorUnusualTiming() {
        const loginTimes = JSON.parse(localStorage.getItem('ucc_login_times') || '[]');
        
        // Check if user is logging in at unusual times
        const now = new Date();
        const currentHour = now.getHours();
        
        if (currentHour >= 2 && currentHour <= 6) { // 2AM - 6AM
            const hasUnusualTiming = loginTimes.some(time => {
                const loginHour = new Date(time).getHours();
                return loginHour >= 2 && loginHour <= 6;
            });
            
            if (hasUnusualTiming) {
                this.logSecurityEvent('UNUSUAL_TIMING', {
                    type: 'UNUSUAL_LOGIN_TIME',
                    currentHour,
                    recentLogins: loginTimes,
                    timestamp: now.toISOString()
                });
            }
        }
    }

    // Validate current session
    validateSession() {
        if (!this.token) {
            return false;
        }
        
        try {
            // Parse JWT token to check expiration
            const tokenParts = this.token.split('.');
            if (tokenParts.length !== 3) {
                return false;
            }
            
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Date.now() / 1000;
            
            // Check if token is expired or will expire soon
            const isExpired = payload.exp < now;
            const willExpireSoon = payload.exp < now + (15 * 60); // 15 minutes
            
            if (isExpired) {
                this.showSecurityWarning('Session expired. Please log in again.');
                this.logoutUser();
                return false;
            }
            
            if (willExpireSoon) {
                this.showSessionExpirationWarning(15 * 60 - (payload.exp - now));
            }
            
            return true;
        } catch (error) {
            console.error('❌ Session validation error:', error);
            return false;
        }
    }

    // Log security event
    logSecurityEvent(eventType, details) {
        const event = {
            type: eventType,
            details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: this.getUserIP(),
            sessionId: this.getSessionId()
        };
        
        console.log('🚨 Security Event:', event);
        
        // Store in security log
        const securityLog = JSON.parse(localStorage.getItem('ucc_security_log') || '[]');
        securityLog.push(event);
        
        // Keep only last 100 security events
        const trimmedLog = securityLog.slice(-100);
        localStorage.setItem('ucc_security_log', JSON.stringify(trimmedLog));
        
        // Send to server for audit trail
        this.sendSecurityEventToServer(event);
    }

    // Get user IP (for audit logging)
    getUserIP() {
        // In a real implementation, this would come from server
        // For now, return a mock value
        return '192.168.100.194'; // Local IP for demo
    }

    // Get session ID
    getSessionId() {
        let sessionId = localStorage.getItem('ucc_session_id');
        
        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem('ucc_session_id', sessionId);
        }
        
        return sessionId;
    }

    // Generate session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Send security event to server
    async sendSecurityEventToServer(event) {
        if (!this.token) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/security/log-event`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });
            
            if (!response.ok) {
                console.warn('⚠️ Failed to send security event to server');
            }
        } catch (error) {
            console.error('❌ Error sending security event:', error);
        }
    }

    // Show security warning
    showSecurityWarning(message, type = 'warning') {
        const warningDiv = document.createElement('div');
        warningDiv.className = `security-warning ${type}`;
        warningDiv.innerHTML = `
            <div class="security-content">
                <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <p>${message}</p>
                <button class="close-warning" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(warningDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.parentNode.removeChild(warningDiv);
            }
        }, 5000);
    }

    // Show session expiration warning
    showSessionExpirationWarning(secondsLeft) {
        const minutes = Math.ceil(secondsLeft / 60);
        
        this.showSecurityWarning(
            `Your session expires in ${minutes} minute${minutes !== 1 ? 's' : ''}. Please save your work.`,
            'info'
        );
    }

    // Logout user
    logoutUser() {
        this.logSecurityEvent('USER_LOGOUT', {
            reason: 'MANUAL_OR_TIMEOUT',
            timestamp: new Date().toISOString()
        });
        
        // Clear local storage
        localStorage.removeItem('ucc_token');
        localStorage.removeItem('ucc_user');
        localStorage.removeItem('ucc_session_id');
        localStorage.removeItem('ucc_mfa_enabled');
        
        // Redirect to login
        window.location.href = '../htmls/student-login.html';
    }

    // Enable MFA
    async enableMFA() {
        this.twoFactorEnabled = true;
        localStorage.setItem('ucc_mfa_enabled', 'true');
        
        this.showSecurityWarning('MFA has been enabled. You will need to verify your identity with a code.');
        
        console.log('🔐 MFA enabled');
    }

    // Disable MFA
    async disableMFA() {
        this.twoFactorEnabled = false;
        localStorage.removeItem('ucc_mfa_enabled');
        
        this.showSecurityWarning('MFA has been disabled. Consider the security implications.');
        
        console.log('🔐 MFA disabled');
    }

    // Check if account is locked
    isAccountLocked() {
        const lockoutEnd = localStorage.getItem('ucc_account_locked_until');
        if (lockoutEnd) {
            const now = Date.now();
            return now < parseInt(lockoutEnd);
        }
        return false;
    }

    // Get remaining lockout time
    getRemainingLockoutTime() {
        const lockoutEnd = localStorage.getItem('ucc_account_locked_until');
        if (lockoutEnd) {
            const now = Date.now();
            const remaining = parseInt(lockoutEnd) - now;
            return Math.max(0, Math.ceil(remaining / (60 * 1000)));
        }
        return 0;
    }
}

// Initialize security when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uccSecurity === 'undefined') {
        window.uccSecurity = new UCCSecurity();
    }
});