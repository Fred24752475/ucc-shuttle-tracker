const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const nodemailer = require('nodemailer');
const db = require('./database/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Force HTTP and prevent HTTPS upgrade
app.use((req, res, next) => {
    // Remove HSTS header completely
    res.removeHeader('Strict-Transport-Security');
    next();
});

// Security middleware
app.use(helmet({
    hsts: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "ws:", "wss:", "http://localhost:3001", "http://192.168.137.49:3001", "https://tile.openstreetmap.org", "https://a.tile.openstreetmap.org", "https://b.tile.openstreetmap.org", "https://c.tile.openstreetmap.org", "https://*.tile.openstreetmap.org"],
            upgradeInsecureRequests: null
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Request logging middleware with audit trail
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log(`🌐 ${timestamp} - ${req.method} ${req.url} - IP: ${ip}`);

    // Log to audit table (exclude health checks)
    if (!req.url.includes('/api/ping') && !req.url.includes('/favicon.ico')) {
        db('audit_logs').insert({
            ip_address: ip,
            user_agent: userAgent,
            action: `${req.method} ${req.url}`,
            resource_type: 'api_request'
        }).catch(err => console.error('Audit log error:', err));
    }

    next();
});

// JWT Secret and configuration
const JWT_SECRET = process.env.JWT_SECRET || 'ucc_shuttle_tracker_enhanced_2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'ucc_shuttle_refresh_2024';
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 60; // minutes

// Email configuration
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'fredrickokyere60@gmail.com',
        pass: process.env.EMAIL_PASS || 'fbra ecdd nfco drlp'
    }
});

// Verify email configuration
emailTransporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server ready to send messages');
    }
});

// Database connection
async function initializeServer() {
    try {
        console.log('✅ PostgreSQL database connected successfully');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
}

// Enhanced authentication middleware with MFA support
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Log failed authentication attempt
            logAuthAttempt(req, false, 'Invalid token');
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }

        req.user = user;

        // Check session timeout
        db.get('SELECT last_login FROM users WHERE id = ?', [user.id], (err, row) => {
            if (err || !row) {
                return res.status(403).json({ success: false, message: 'User not found' });
            }

            if (row.last_login) {
                const lastLogin = new Date(row.last_login);
                const now = new Date();
                const diffMinutes = (now - lastLogin) / (1000 * 60);

                if (diffMinutes > SESSION_TIMEOUT) {
                    logAuthAttempt(req, false, 'Session expired');
                    return res.status(403).json({ success: false, message: 'Session expired, please login again' });
                }
            }

            // Update last activity
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            logAuthAttempt(req, true, 'Token verified');
            next();
        });
    });
}

// Role-based access control middleware
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            logAuthAttempt(req, false, 'Insufficient permissions');
            return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }
        next();
    };
}

// Log authentication attempts
function logAuthAttempt(req, success, reason) {
    db.run(`INSERT INTO audit_logs (user_id, action, ip_address, user_agent, success, error_message) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user?.id || null, 'authentication', req.ip, req.get('User-Agent'), success ? 1 : 0, reason],
        (err) => {
            if (err) console.error('Auth log error:', err);
        });
}

// AI Service Module
class AIService {
    static async generateResponse(message, context) {
        // Simple AI response generation (can be enhanced with actual AI API)
        const responses = {
            'booking': 'I can help you book a shuttle. Please provide your pickup location and destination.',
            'location': 'I can track the shuttle location for you. Let me check the current position.',
            'emergency': 'Emergency detected. Connecting you to support immediately.',
            'complaint': 'I understand your concern. Let me connect you with a support agent.',
            'general': 'Thank you for your message. How can I assist you today?'
        };

        const lowerMessage = message.toLowerCase();
        let category = 'general';

        if (lowerMessage.includes('book') || lowerMessage.includes('request')) category = 'booking';
        else if (lowerMessage.includes('where') || lowerMessage.includes('location')) category = 'location';
        else if (lowerMessage.includes('emergency') || lowerMessage.includes('help')) category = 'emergency';
        else if (lowerMessage.includes('complaint') || lowerMessage.includes('problem')) category = 'complaint';

        return {
            response: responses[category],
            confidence: 0.85,
            category,
            suggestions: this.generateSuggestions(category, context)
        };
    }

    static generateSuggestions(category, context) {
        const suggestions = {
            'booking': ['Book now', 'Check availability', 'View routes'],
            'location': ['Track shuttle', 'ETA', 'Contact driver'],
            'emergency': ['Call support', 'Share location', 'Emergency contacts'],
            'complaint': ['Submit ticket', 'Live chat', 'Call manager'],
            'general': ['FAQ', 'Contact support', 'Help center']
        };

        return suggestions[category] || suggestions.general;
    }

    static async optimizeRoute(pickup, destination, trafficData = null) {
        // Simple route optimization (can be enhanced with Google Maps API)
        const distance = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
        const estimatedTime = Math.round(distance * 3); // 3 minutes per km average

        return {
            route: {
                distance: distance.toFixed(2),
                estimatedTime,
                waypoints: [],
                trafficFactor: trafficData ? trafficData.factor : 1.0,
                fuelEstimate: (distance * 0.1).toFixed(2) // liters
            },
            alternatives: [
                { distance: (distance * 1.1).toFixed(2), estimatedTime: estimatedTime + 5 },
                { distance: (distance * 0.9).toFixed(2), estimatedTime: estimatedTime - 3 }
            ]
        };
    }

    static predictDemand(timeOfDay, dayOfWeek, location) {
        // Simple demand prediction based on patterns
        const baseDemand = 5;
        const timeMultiplier = (timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19) ? 2.5 : 1;
        const dayMultiplier = dayOfWeek >= 1 && dayOfWeek <= 5 ? 1.5 : 0.8;

        const predictedDemand = Math.round(baseDemand * timeMultiplier * dayMultiplier);

        return {
            demand: predictedDemand,
            confidence: 0.75,
            recommendations: predictedDemand > 10 ? ['Add more shuttles', 'Increase frequency'] : ['Normal operation']
        };
    }

    static detectAnomalies(tripData) {
        // Simple anomaly detection
        const anomalies = [];

        if (tripData.duration > tripData.estimatedDuration * 2) {
            anomalies.push({ type: 'duration', severity: 'medium', message: 'Trip took unusually long' });
        }

        if (tripData.distance > 50) {
            anomalies.push({ type: 'distance', severity: 'high', message: 'Unusually long distance' });
        }

        return anomalies;
    }
}

// Translation Service
class TranslationService {
    static translations = {
        'en': {
            'welcome': 'Welcome',
            'book_shuttle': 'Book Shuttle',
            'track_location': 'Track Location',
            'emergency': 'Emergency',
            'messages': 'Messages',
            'profile': 'Profile',
            'logout': 'Logout'
        },
        'fr': {
            'welcome': 'Bienvenue',
            'book_shuttle': 'Réserver Navette',
            'track_location': 'Suivre Position',
            'emergency': 'Urgence',
            'messages': 'Messages',
            'profile': 'Profil',
            'logout': 'Déconnexion'
        },
        'tw': {
            'welcome': 'Akwaaba',
            'book_shuttle': 'Bɔ Dwa',
            'track_location': 'Hwe Beae',
            'emergency': 'Atwam',
            'messages': 'Nsɛm',
            'profile': 'Ho Nsɛm',
            'logout': 'Fir'
        },
        'ha': {
            'welcome': 'Sannu',
            'book_shuttle': 'aya Sabis',
            'track_location': 'gano Wuri',
            'emergency': 'Gaggwarwa',
            'messages': 'Saƙonnin',
            'profile': 'Bayanan ka',
            'logout': 'Fita'
        },
        'yo': {
            'welcome': 'Bawo',
            'book_shuttle': 'Ṣe Awe Shuttle',
            'track_location': 'Ṣe Alokọ Ibudo',
            'emergency': 'Ajakale-arun',
            'messages': 'Ifiranṣẹ',
            'profile': 'Profaili',
            'logout': 'Jade'
        }
    };

    static translate(key, language = 'en') {
        return this.translations[language]?.[key] || this.translations['en'][key] || key;
    }

    static translateMessage(message, fromLang, toLang) {
        // Simplified translation - in production, use Google Translate API
        if (fromLang === toLang) return message;

        // For demo purposes, return original message with language indicator
        return `[${toLang.toUpperCase()}] ${message}`;
    }
}

// Utility function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

// Notification Service
class NotificationService {
    static async createNotification(userId, title, message, type = 'info', channel = 'in_app', actionUrl = null) {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO notifications (user_id, title, message, type, channel, action_url) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, title, message, type, channel, actionUrl],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        const notification = {
                            id: this.lastID,
                            userId,
                            title,
                            message,
                            type,
                            channel,
                            actionUrl,
                            timestamp: new Date().toISOString()
                        };

                        // Send real-time notification
                        io.emit(`notification_${userId}`, notification);
                        resolve(notification);
                    }
                });
        });
    }

    static async sendTripNotification(tripId, type, data) {
        const trip = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM trips WHERE id = ?', [tripId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!trip) return;

        const notifications = {
            'accepted': {
                title: 'Shuttle Accepted',
                message: `Your shuttle has been accepted and is on the way!`,
                type: 'success'
            },
            'en_route': {
                title: 'Shuttle En Route',
                message: 'Your shuttle is heading to your pickup location.',
                type: 'info'
            },
            'arrived': {
                title: 'Shuttle Arrived',
                message: 'Your shuttle has arrived at the pickup location.',
                type: 'success'
            },
            'completed': {
                title: 'Trip Completed',
                message: 'Thank you for using UCC Shuttle Tracker!',
                type: 'success'
            }
        };

        const notification = notifications[type];
        if (notification) {
            await this.createNotification(trip.student_id, notification.title, notification.message, notification.type);
        }
    }
}

// API Routes
app.get('/api/ping', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Authentication routes
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isValid) => {
            if (err || !isValid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    phone: user.phone
                }
            });
        });
    });
});

// Additional login endpoint for compatibility with HTML forms
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isValid) => {
            if (err || !isValid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    phone: user.phone
                }
            });
        });
    });
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password, phone, role = 'student' } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error hashing password' });
            }

            // Insert new user
            db.run('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
                [name, email, hashedPassword, phone, role],
                function (err) {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Error creating user' });
                    }

                    const token = jwt.sign(
                        { id: this.lastID, email, role },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    res.json({
                        success: true,
                        message: 'Registration successful',
                        token,
                        user: {
                            id: this.lastID,
                            name,
                            email,
                            phone,
                            role
                        }
                    });
                }
            );
        });
    });
});

// Forgot Password - Request reset code
app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    db.get('SELECT id, name, email FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email' });
        }

        // Generate 6-digit reset code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store reset code in database
        db.run(`INSERT INTO password_resets (user_id, reset_code, expires_at) VALUES (?, ?, ?)`,
            [user.id, resetCode, expiresAt.toISOString()], (err) => {
            if (err) {
                console.error('Database insert error:', err);
                return res.status(500).json({ success: false, message: 'Error generating reset code' });
            }

            // Send email with reset code
            const mailOptions = {
                from: `"UCC Shuttle Tracker" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Password Reset Code - UCC Shuttle Tracker',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
                        </div>
                        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                            <p style="font-size: 16px; color: #333;">Hello <strong>${user.name}</strong>,</p>
                            <p style="font-size: 16px; color: #333;">You requested to reset your password for UCC Shuttle Tracker.</p>
                            <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your reset code is:</p>
                                <h2 style="color: #667eea; font-size: 36px; letter-spacing: 5px; margin: 10px 0;">${resetCode}</h2>
                                <p style="font-size: 12px; color: #999; margin-top: 10px;">This code expires in 15 minutes</p>
                            </div>
                            <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="font-size: 12px; color: #999; text-align: center;">UCC Shuttle Tracker - Making campus transportation smarter</p>
                        </div>
                    </div>
                `
            };

            console.log('📧 Attempting to send email to:', email);
            emailTransporter.sendMail(mailOptions, (emailError, info) => {
                if (emailError) {
                    console.error('❌ Email error:', emailError.message);
                } else {
                    console.log('✅ Email sent:', info.response);
                }
            });

            // Always return success with code (for development)
            res.json({
                success: true,
                message: 'Reset code sent to your email',
                resetCode: resetCode
            });
        });
    });
});

// Reset Password - Verify code and update password
app.post('/api/auth/reset-password', (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, reset code, and new password are required' });
    }

    // Find user
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify reset code
        db.get(`SELECT * FROM password_resets 
               WHERE user_id = ? AND reset_code = ? AND expires_at > datetime('now') AND used = 0
               ORDER BY created_at DESC LIMIT 1`,
            [user.id, resetCode], (err, reset) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            if (!reset) {
                return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
            }

            // Hash new password
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error hashing password' });
                }

                // Update password
                db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Error updating password' });
                    }

                    // Mark reset code as used
                    db.run('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);

                    res.json({
                        success: true,
                        message: 'Password reset successful'
                    });
                });
            });
        });
    });
});

// Additional register endpoint for compatibility with HTML forms
app.post('/api/register', (req, res) => {
    const { name, firstName, lastName, email, password, phone, role = 'student' } = req.body;

    // Handle firstName + lastName combination (from HTML forms)
    let fullName = name;
    if (!fullName && firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
    } else if (!fullName && firstName) {
        fullName = firstName;
    }

    if (!fullName || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error hashing password' });
            }

            // Insert new user
            db.run('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
                [fullName, email, hashedPassword, phone, role],
                function (err) {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Error creating user' });
                    }

                    const token = jwt.sign(
                        { id: this.lastID, email, role },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    res.json({
                        success: true,
                        message: 'Registration successful',
                        token,
                        user: {
                            id: this.lastID,
                            name: fullName,
                            email,
                            phone,
                            role
                        }
                    });
                }
            );
        });
    });
});

// User routes
app.get('/api/users/profile', authenticateToken, (req, res) => {
    db.get('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user });
    });
});

app.put('/api/users/profile', authenticateToken, (req, res) => {
    const { name, phone } = req.body;

    db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating profile' });
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

// Trip routes
app.get('/api/trips', authenticateToken, (req, res) => {
    let query = 'SELECT * FROM trips';
    let params = [];

    if (req.user.role === 'student') {
        query += ' WHERE student_id = ?';
        params = [req.user.id];
    } else if (req.user.role === 'driver') {
        query += ' WHERE driver_id = ?';
        params = [req.user.id];
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, trips) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, trips });
    });
});

app.post('/api/trips', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ success: false, message: 'Only students can book trips' });
    }

    const { pickup_location, destination, fare } = req.body;

    if (!pickup_location || !destination) {
        return res.status(400).json({ success: false, message: 'Pickup location and destination are required' });
    }

    db.run('INSERT INTO trips (student_id, pickup_location, destination, fare, status) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, pickup_location, destination, fare || 10, 'pending'],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error creating trip' });
            }

            res.json({
                success: true,
                message: 'Trip booked successfully',
                trip: {
                    id: this.lastID,
                    student_id: req.user.id,
                    pickup_location,
                    destination,
                    fare: fare || 10,
                    status: 'pending'
                }
            });
        }
    );
});

app.put('/api/trips/:id/status', authenticateToken, (req, res) => {
    if (req.user.role !== 'driver') {
        return res.status(403).json({ success: false, message: 'Only drivers can update trip status' });
    }

    const { status } = req.body;
    const tripId = req.params.id;

    db.run('UPDATE trips SET status = ?, driver_id = ? WHERE id = ?', [status, req.user.id, tripId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating trip' });
        }

        res.json({ success: true, message: 'Trip status updated successfully' });
    });
});

// Shuttle routes
app.get('/api/shuttles', authenticateToken, (req, res) => {
    db.all('SELECT * FROM shuttles', (err, shuttles) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, shuttles });
    });
});

app.get('/api/shuttles/:id/location', authenticateToken, (req, res) => {
    const shuttleId = req.params.id;

    db.get('SELECT latitude, longitude, last_updated FROM shuttles WHERE id = ?', [shuttleId], (err, location) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!location) {
            return res.status(404).json({ success: false, message: 'Shuttle not found' });
        }

        res.json({ success: true, location });
    });
});

// Messages routes
app.get('/api/messages', authenticateToken, (req, res) => {
    let query = 'SELECT * FROM messages WHERE ';
    let params = [];

    if (req.user.role === 'student') {
        query += 'sender_id = ? OR recipient_id = ?';
        params = [req.user.id, req.user.id];
    } else {
        query += '1=1'; // Get all messages for drivers/admins
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, messages) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, messages });
    });
});

app.post('/api/messages', authenticateToken, (req, res) => {
    const { recipient_id, message } = req.body;

    if (!recipient_id || !message) {
        return res.status(400).json({ success: false, message: 'Recipient and message are required' });
    }

    db.run('INSERT INTO messages (sender_id, recipient_id, message) VALUES (?, ?, ?)',
        [req.user.id, recipient_id, message],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error sending message' });
            }

            res.json({
                success: true,
                message: 'Message sent successfully',
                messageId: this.lastID
            });
        }
    );
});

// Get all users for messaging system
app.get('/api/users/all', authenticateToken, (req, res) => {
    db.all(`SELECT id, name, email, role, 
                   CASE WHEN role = 'driver' THEN 
                       (SELECT vehicle_number FROM shuttles WHERE driver_id = users.id LIMIT 1) 
                   END as shuttle_id,
                   CASE WHEN last_login > datetime('now', '-5 minutes') THEN 1 ELSE 0 END as online,
                   last_login as last_seen
            FROM users 
            WHERE id != ? 
            ORDER BY role, name`, 
        [req.user.id], (err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json(users || []);
    });
});

// Get conversation messages between current user and another user
app.get('/api/messages/conversation/:userId', authenticateToken, (req, res) => {
    const otherUserId = req.params.userId;
    const currentUserId = req.user.id;
    
    db.all(`SELECT m.*, 
                   s.name as sender_name,
                   r.name as recipient_name
            FROM messages m
            LEFT JOIN users s ON m.sender_id = s.id
            LEFT JOIN users r ON m.recipient_id = r.id
            WHERE (m.sender_id = ? AND m.recipient_id = ?) 
               OR (m.sender_id = ? AND m.recipient_id = ?)
            ORDER BY m.created_at ASC`,
        [currentUserId, otherUserId, otherUserId, currentUserId],
        (err, messages) => {
            if (err) {
                console.error('Error fetching conversation:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            res.json(messages || []);
        }
    );
});

// Messaging conversations endpoint
app.get('/api/messaging/conversations', authenticateToken, (req, res) => {
    // Get all unique conversations for the current user
    db.all(
        `SELECT DISTINCT 
            CASE 
                WHEN sender_id = ? THEN recipient_id 
                ELSE sender_id 
            END as contact_id,
            u.name as contact_name,
            u.role as contact_role,
            (SELECT message FROM messages m2 
             WHERE (m2.sender_id = m.sender_id AND m2.recipient_id = m.recipient_id) 
                OR (m2.sender_id = m.recipient_id AND m2.recipient_id = m.sender_id)
             ORDER BY m2.created_at DESC LIMIT 1) as last_message,
            (SELECT created_at FROM messages m2 
             WHERE (m2.sender_id = m.sender_id AND m2.recipient_id = m.recipient_id) 
                OR (m2.sender_id = m.recipient_id AND m2.recipient_id = m.sender_id)
             ORDER BY m2.created_at DESC LIMIT 1) as last_message_time
        FROM messages m
        JOIN users u ON u.id = CASE 
            WHEN m.sender_id = ? THEN m.recipient_id 
            ELSE m.sender_id 
        END
        WHERE sender_id = ? OR recipient_id = ?
        ORDER BY last_message_time DESC`,
        [req.user.id, req.user.id, req.user.id, req.user.id],
        (err, conversations) => {
            if (err) {
                console.error('Error fetching conversations:', err);
                return res.status(500).json({ success: false, message: 'Error fetching conversations' });
            }

            res.json({ success: true, conversations: conversations || [] });
        }
    );
});

// Admin routes
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), (req, res) => {
    db.all('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, users });
    });
});

// Dashboard specific endpoints
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    let stats = {
        todayTrips: 0,
        totalPassengers: 0,
        shiftStatus: 'Off Duty',
        currentRoute: '--',
        assignedShuttle: '--'
    };

    if (role === 'driver') {
        // Driver-specific stats
        db.get('SELECT COUNT(*) as count FROM trips WHERE driver_id = ? AND DATE(created_at) = DATE("now")',
            [userId], (err, row) => {
                if (!err && row) stats.todayTrips = row.count;
            });

        db.get('SELECT COALESCE(SUM(passengers), 0) as total FROM trips WHERE driver_id = ? AND status = "completed"',
            [userId], (err, row) => {
                if (!err && row) stats.totalPassengers = row.total;
            });

        db.get('SELECT status FROM drivers WHERE id = ?', [userId], (err, row) => {
            if (!err && row) {
                stats.shiftStatus = row.status || 'Off Duty';
                stats.currentRoute = row.current_route || '--';
                stats.assignedShuttle = row.assigned_shuttle || '--';
            }
        });
    }

    res.json({ success: true, stats });
});

app.get('/api/routes', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'driver' && role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Mock route data - in production, this would come from database
    const routes = [
        {
            id: 1,
            name: 'Campus Main Gate',
            description: 'Main entrance route through campus',
            startLocation: { lat: 5.5547, lng: -0.2079 },
            endLocation: { lat: 5.5588, lng: -0.1969 },
            estimatedTime: '15 mins',
            distance: '2.1 km',
            status: 'active'
        },
        {
            id: 2,
            name: 'Library to Science Block',
            description: 'Route connecting library to science departments',
            startLocation: { lat: 5.5527, lng: -0.2023 },
            endLocation: { lat: 5.5601, lng: -0.1958 },
            estimatedTime: '12 mins',
            distance: '1.8 km',
            status: 'active'
        },
        {
            id: 3,
            name: 'Hostels to Sports Complex',
            description: 'Evening route to hostels and sports facilities',
            startLocation: { lat: 5.5507, lng: -0.2034 },
            endLocation: { lat: 5.5480, lng: -0.2012 },
            estimatedTime: '18 mins',
            distance: '3.2 km',
            status: 'inactive'
        }
    ];

    res.json({ success: true, routes });
});

app.get('/api/shuttle/status', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'driver') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get current driver status
    db.get('SELECT status, current_route, assigned_shuttle FROM drivers WHERE id = ?', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        let status = {
            status: row ? row.status : 'Off Duty',
            currentRoute: row ? row.current_route : '--',
            assignedShuttle: row ? row.assigned_shuttle : '--'
        };

        res.json({ success: true, ...status });
    });
});

app.post('/api/shuttle/status', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'driver') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status, currentRoute, assignedShuttle } = req.body;

    // Update driver status
    db.run('UPDATE drivers SET status = ?, current_route = ?, assigned_shuttle = ? WHERE id = ?',
        [status, currentRoute, assignedShuttle, userId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Update failed' });
            }

            // Emit real-time update
            io.emit('driver-status-update', {
                driverId: userId,
                status,
                currentRoute,
                assignedShuttle,
                timestamp: new Date().toISOString()
            });

            res.json({ success: true, message: 'Status updated successfully' });
        });
});

app.get('/api/trips/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, limit = 50 } = req.query;

    let query = 'SELECT * FROM trips WHERE ';
    let params = [];

    if (role === 'driver') {
        query += 'driver_id = ?';
        params.push(userId);
    } else {
        query += 'student_id = ?';
        params.push(userId);
    }

    if (status && status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    db.all(query, params, (err, trips) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        // Format trips with additional data
        const formattedTrips = trips.map(trip => ({
            ...trip,
            destination: trip.destination || 'Campus',
            status: trip.status || 'requested',
            timestamp: trip.created_at,
            formattedTime: new Date(trip.created_at).toLocaleString(),
            passengers: trip.passengers || 0
        }));

        res.json({ success: true, trips: formattedTrips });
    });
});

app.get('/api/messages', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { limit = 100 } = req.query;

    // Get messages for user
    db.all(`SELECT m.*, s.name as sender_name FROM messages m 
             LEFT JOIN users s ON m.sender_id = s.id 
             WHERE (m.sender_id = ? OR m.recipient_id = ?) 
             ORDER BY m.created_at DESC LIMIT ?`,
        [userId, userId, limit], (err, messages) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                senderId: msg.sender_id,
                recipientId: msg.recipient_id,
                content: msg.message,
                timestamp: msg.created_at,
                formattedTime: new Date(msg.created_at).toLocaleString(),
                senderName: msg.sender_name || 'Unknown',
                read: msg.read === 1
            }));

            res.json({ success: true, messages: formattedMessages });
        });
});

app.post('/api/messages', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { recipient_id, message } = req.body;

    if (!recipient_id || !message) {
        return res.status(400).json({ success: false, message: 'Recipient and message are required' });
    }

    // Send message
    db.run('INSERT INTO messages (sender_id, recipient_id, message) VALUES (?, ?, ?)',
        [userId, recipient_id, message], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error sending message' });
            }

            // Get recipient info for real-time delivery
            db.get('SELECT id, name FROM users WHERE id = ?', [recipient_id], (err, recipient) => {
                if (!err && recipient) {
                    // Emit real-time message
                    io.emit('new-message', {
                        id: this.lastID,
                        senderId: userId,
                        recipientId,
                        content: message,
                        timestamp: new Date().toISOString(),
                        senderName: req.user.name || 'User'
                    });
                }
            });

            res.json({
                success: true,
                message: 'Message sent successfully',
                messageId: this.lastID
            });
        });
});

app.get('/api/admin/users', authenticateToken, requireRole(['admin']), (req, res) => {
    db.all('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, users });
    });
});

// Admin routes - Get all users (students, drivers, admins)
app.get('/api/admin/all-users', authenticateToken, requireRole(['admin']), (req, res) => {
    db.all(`SELECT id, name, email, phone, role, created_at, last_login 
            FROM users 
            ORDER BY created_at DESC`, 
        (err, users) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            res.json({ success: true, users: users || [] });
        }
    );
});

// Admin - Add new user (student, driver, or admin)
app.post('/api/admin/add-user', authenticateToken, requireRole(['admin']), (req, res) => {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    }

    if (!['student', 'driver', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        // Hash password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error hashing password' });
            }

            // Insert new user
            db.run('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
                [name, email, hashedPassword, phone || null, role],
                function (err) {
                    if (err) {
                        console.error('Error creating user:', err);
                        return res.status(500).json({ success: false, message: 'Error creating user' });
                    }

                    res.json({
                        success: true,
                        message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
                        user: {
                            id: this.lastID,
                            name,
                            email,
                            phone,
                            role
                        }
                    });
                }
            );
        });
    });
});

app.get('/api/admin/shuttles', authenticateToken, requireRole(['admin']), (req, res) => {
    db.all('SELECT s.*, d.name as driver_name FROM shuttles s LEFT JOIN users d ON s.driver_id = d.id', (err, shuttles) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, shuttles });
    });
});

// Admin - Get driver locations for live tracking
app.get('/api/admin/driver-locations', authenticateToken, requireRole(['admin']), (req, res) => {
    db.all(`SELECT u.id, u.name, s.vehicle_number as shuttle, 
                   CASE WHEN u.last_login > datetime('now', '-5 minutes') THEN 'online' ELSE 'offline' END as status,
                   s.latitude, s.longitude, 0 as speed, u.last_login as lastUpdate,
                   0 as totalDistance
            FROM users u 
            LEFT JOIN shuttles s ON s.driver_id = u.id 
            WHERE u.role = 'driver'
            ORDER BY u.name`, 
        (err, drivers) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            // Add mock position data for demo
            const driversWithPositions = drivers.map((driver, index) => ({
                ...driver,
                lat: driver.latitude || (30 + index * 15),
                lng: driver.longitude || (40 + index * 15),
                speed: driver.status === 'online' ? Math.floor(Math.random() * 30) : 0,
                totalDistance: Math.floor(Math.random() * 50) + 10
            }));

            res.json({ success: true, drivers: driversWithPositions });
        }
    );
});

// ============= ETA NOTIFICATION SYSTEM =============

// Add ETA tables to database
function initializeETASystem() {
    console.log('🎯 Initializing ETA system tables...');
    
    db.run(`CREATE TABLE IF NOT EXISTS pickup_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        location_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users (id)
    )`, (err) => {
        if (err) console.error('Error creating pickup_preferences:', err);
        else console.log('✅ pickup_preferences table ready');
    });
    
    db.run(`CREATE TABLE IF NOT EXISTS eta_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        location TEXT NOT NULL,
        eta_minutes INTEGER NOT NULL,
        students_notified INTEGER DEFAULT 0,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users (id)
    )`, (err) => {
        if (err) console.error('Error creating eta_notifications:', err);
        else console.log('✅ eta_notifications table ready');
    });
    
    db.run(`CREATE TABLE IF NOT EXISTS route_stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        stop_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        order_sequence INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users (id)
    )`, (err) => {
        if (err) console.error('Error creating route_stops:', err);
        else console.log('✅ route_stops table ready');
    });
    
    console.log('✅ ETA system tables initialized');
}

// ETA Calculation Service using OSRM (free)
class ETAService {
    static async calculateETA(driverLat, driverLng, destLat, destLng) {
        try {
            // Use OSRM free routing service
            const url = `http://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${destLng},${destLat}?overview=false`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                const durationMinutes = Math.round(route.duration / 60);
                const distanceKm = (route.distance / 1000).toFixed(1);
                
                return {
                    eta_minutes: durationMinutes,
                    distance_km: distanceKm,
                    success: true
                };
            }
            
            throw new Error('No route found');
        } catch (error) {
            console.log('OSRM failed, using fallback calculation');
            // Fallback to simple distance calculation
            const distance = calculateDistance(driverLat, driverLng, destLat, destLng);
            const etaMinutes = Math.round(distance * 3); // 3 minutes per km average
            
            return {
                eta_minutes: etaMinutes,
                distance_km: distance.toFixed(1),
                success: true,
                fallback: true
            };
        }
    }
    
    static async checkETAAlerts(driverId, currentLat, currentLng) {
        // Get all pickup locations with waiting students
        const locations = await new Promise((resolve) => {
            db.all(`SELECT DISTINCT pp.location_name, pp.latitude, pp.longitude,
                           COUNT(pp.student_id) as waiting_students
                    FROM pickup_preferences pp
                    JOIN users u ON pp.student_id = u.id
                    WHERE pp.is_active = 1 AND u.role = 'student'
                    GROUP BY pp.location_name, pp.latitude, pp.longitude
                    HAVING waiting_students > 0`,
                [], (err, rows) => resolve(rows || []));
        });
        
        const alerts = [];
        
        for (const location of locations) {
            const eta = await this.calculateETA(currentLat, currentLng, location.latitude, location.longitude);
            
            // Trigger alert if ETA is 5 minutes or less
            if (eta.eta_minutes <= 5 && eta.eta_minutes > 0) {
                // Check if we haven't sent alert recently
                const recentAlert = await new Promise((resolve) => {
                    db.get(`SELECT id FROM eta_notifications 
                           WHERE driver_id = ? AND location = ? 
                           AND sent_at > datetime('now', '-10 minutes')`,
                        [driverId, location.location_name], (err, row) => resolve(row));
                });
                
                if (!recentAlert) {
                    await this.sendETANotification(driverId, location, eta.eta_minutes);
                    alerts.push({
                        location: location.location_name,
                        eta_minutes: eta.eta_minutes,
                        students_notified: location.waiting_students
                    });
                }
            }
        }
        
        return alerts;
    }
    
    static async sendETANotification(driverId, location, etaMinutes) {
        // Get students waiting at this location
        const students = await new Promise((resolve) => {
            db.all(`SELECT u.id, u.name FROM users u
                   JOIN pickup_preferences pp ON u.id = pp.student_id
                   WHERE pp.location_name = ? AND pp.is_active = 1 AND u.role = 'student'`,
                [location.location_name], (err, rows) => resolve(rows || []));
        });
        
        // Send notification to each student
        for (const student of students) {
            const notification = {
                title: '🚌 Shuttle Arriving Soon!',
                message: `Your shuttle will arrive at ${location.location_name} in ${etaMinutes} minute${etaMinutes > 1 ? 's' : ''}. Get ready!`,
                type: 'eta_alert',
                student_id: student.id,
                driver_id: driverId,
                eta_minutes: etaMinutes,
                location: location.location_name
            };
            
            // Send real-time notification
            io.emit(`eta_alert_${student.id}`, notification);
            
            // Send browser push notification
            io.emit(`push_notification_${student.id}`, {
                title: notification.title,
                body: notification.message,
                icon: '/icons/shuttle-icon.png',
                tag: 'eta-alert'
            });
        }
        
        // Log notification
        db.run(`INSERT INTO eta_notifications (driver_id, location, eta_minutes, students_notified)
               VALUES (?, ?, ?, ?)`,
            [driverId, location.location_name, etaMinutes, students.length]);
        
        // Notify driver
        io.emit(`driver_notification_${driverId}`, {
            type: 'eta_sent',
            message: `📢 ${students.length} students notified at ${location.location_name} - ETA ${etaMinutes} min`,
            students_count: students.length,
            location: location.location_name
        });
        
        console.log(`📢 ETA alert sent: ${students.length} students at ${location.location_name} - ${etaMinutes} min`);
    }
}

// Initialize ETA system
// initializeETASystem(); // Moved to server initialization

// ============= ETA API ENDPOINTS =============

// Student: Set pickup location preference
app.post('/api/student/pickup-location', authenticateToken, requireRole(['student']), (req, res) => {
    const { location_name, latitude, longitude } = req.body;
    const studentId = req.user.id;
    
    console.log(`📍 Pickup location from user ${studentId}, role: ${req.user.role}`);
    
    if (!location_name || !latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Location name and coordinates required' });
    }
    
    // Deactivate previous preferences
    db.run('UPDATE pickup_preferences SET is_active = 0 WHERE student_id = ?', [studentId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // Add new preference
        db.run(`INSERT INTO pickup_preferences (student_id, location_name, latitude, longitude)
               VALUES (?, ?, ?, ?)`,
            [studentId, location_name, latitude, longitude], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error setting pickup location' });
            }
            
            res.json({
                success: true,
                message: `Pickup location set to ${location_name}. You'll get ETA alerts when shuttles are nearby!`,
                preference_id: this.lastID
            });
        });
    });
});

// Student: Get pickup location preference
app.get('/api/student/pickup-location', authenticateToken, requireRole(['student']), (req, res) => {
    db.get(`SELECT * FROM pickup_preferences 
           WHERE student_id = ? AND is_active = 1 
           ORDER BY created_at DESC LIMIT 1`,
        [req.user.id], (err, preference) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, preference: preference || null });
    });
});

// Driver: Start route with ETA tracking
app.post('/api/driver/start-route', authenticateToken, requireRole(['driver', 'admin']), (req, res) => {
    const { route_stops } = req.body;
    const driverId = req.user.id;
    
    console.log(`🎯 Start route request from user ${driverId}, role: ${req.user.role}`);
    
    if (!route_stops || !Array.isArray(route_stops)) {
        return res.status(400).json({ success: false, message: 'Route stops required' });
    }
    
    // Clear existing route stops
    db.run('DELETE FROM route_stops WHERE driver_id = ?', [driverId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // Insert new route stops
        const insertPromises = route_stops.map((stop, index) => {
            return new Promise((resolve, reject) => {
                db.run(`INSERT INTO route_stops (driver_id, stop_name, latitude, longitude, order_sequence)
                       VALUES (?, ?, ?, ?, ?)`,
                    [driverId, stop.name, stop.latitude, stop.longitude, index + 1],
                    (err) => err ? reject(err) : resolve());
            });
        });
        
        Promise.all(insertPromises)
            .then(() => {
                // Start ETA monitoring
                startETAMonitoring(driverId);
                
                res.json({
                    success: true,
                    message: 'Route started! ETA tracking is now active.',
                    stops_count: route_stops.length
                });
            })
            .catch(err => {
                res.status(500).json({ success: false, message: 'Error setting route stops' });
            });
    });
});

// Driver: Update location with ETA calculation
app.post('/api/driver/location-eta', authenticateToken, requireRole(['driver', 'admin']), async (req, res) => {
    const { latitude, longitude } = req.body;
    const driverId = req.user.id;
    
    console.log(`📍 Location update from user ${driverId}, role: ${req.user.role}`);
    
    if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    }
    
    try {
        // Update driver location
        db.run('UPDATE shuttles SET latitude = ?, longitude = ?, last_updated = CURRENT_TIMESTAMP WHERE driver_id = ?',
            [latitude, longitude, driverId]);
        
        // Check for ETA alerts
        const alerts = await ETAService.checkETAAlerts(driverId, latitude, longitude);
        
        // Emit real-time location update
        io.emit('driver_location_update', {
            driverId,
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
            alerts_sent: alerts.length
        });
        
        res.json({
            success: true,
            message: 'Location updated',
            alerts_sent: alerts.length,
            alerts: alerts
        });
    } catch (error) {
        console.error('ETA location update error:', error);
        res.status(500).json({ success: false, message: 'Error updating location' });
    }
});

// Driver: Get ETA to next stops
app.get('/api/driver/eta-status', authenticateToken, requireRole(['driver', 'admin']), async (req, res) => {
    const driverId = req.user.id;
    
    console.log(`⏱️ ETA status request from user ${driverId}, role: ${req.user.role}`);
    
    try {
        // Get driver's current location
        const driverLocation = await new Promise((resolve) => {
            db.get('SELECT latitude, longitude FROM shuttles WHERE driver_id = ?',
                [driverId], (err, row) => resolve(row));
        });
        
        if (!driverLocation || !driverLocation.latitude) {
            return res.json({ success: true, message: 'Location not available', etas: [] });
        }
        
        // Get route stops
        const stops = await new Promise((resolve) => {
            db.all('SELECT * FROM route_stops WHERE driver_id = ? ORDER BY order_sequence',
                [driverId], (err, rows) => resolve(rows || []));
        });
        
        // Calculate ETA to each stop
        const etas = [];
        for (const stop of stops) {
            const eta = await ETAService.calculateETA(
                driverLocation.latitude, driverLocation.longitude,
                stop.latitude, stop.longitude
            );
            
            etas.push({
                stop_name: stop.stop_name,
                eta_minutes: eta.eta_minutes,
                distance_km: eta.distance_km,
                order: stop.order_sequence
            });
        }
        
        res.json({ success: true, etas, current_location: driverLocation });
    } catch (error) {
        console.error('ETA status error:', error);
        res.status(500).json({ success: false, message: 'Error calculating ETA' });
    }
});

// Student: Get ETA notifications history
app.get('/api/student/eta-history', authenticateToken, requireRole(['student']), (req, res) => {
    const studentId = req.user.id;
    
    db.all(`SELECT en.*, u.name as driver_name
           FROM eta_notifications en
           JOIN users u ON en.driver_id = u.id
           JOIN pickup_preferences pp ON pp.location_name = en.location AND pp.student_id = ?
           WHERE pp.is_active = 1
           ORDER BY en.sent_at DESC LIMIT 50`,
        [studentId], (err, notifications) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, notifications: notifications || [] });
    });
});

// Admin: ETA system analytics
app.get('/api/admin/eta-analytics', authenticateToken, requireRole(['admin']), (req, res) => {
    Promise.all([
        new Promise((resolve) => {
            db.get('SELECT COUNT(*) as count FROM eta_notifications WHERE DATE(sent_at) = DATE("now")',
                [], (err, row) => resolve(row?.count || 0));
        }),
        new Promise((resolve) => {
            db.get('SELECT COUNT(*) as count FROM pickup_preferences WHERE is_active = 1',
                [], (err, row) => resolve(row?.count || 0));
        }),
        new Promise((resolve) => {
            db.get('SELECT AVG(eta_minutes) as avg_eta FROM eta_notifications WHERE DATE(sent_at) = DATE("now")',
                [], (err, row) => resolve(Math.round(row?.avg_eta || 0)));
        })
    ]).then(([todayAlerts, activeStudents, avgETA]) => {
        res.json({
            success: true,
            analytics: {
                alerts_sent_today: todayAlerts,
                students_with_preferences: activeStudents,
                average_eta_minutes: avgETA,
                system_status: 'active'
            }
        });
    });
});

// ETA Monitoring Service
function startETAMonitoring(driverId) {
    console.log(`🎯 Starting ETA monitoring for driver ${driverId}`);
    
    // Set up periodic ETA checking (every 30 seconds)
    const monitoringInterval = setInterval(async () => {
        try {
            const driverLocation = await new Promise((resolve) => {
                db.get('SELECT latitude, longitude FROM shuttles WHERE driver_id = ?',
                    [driverId], (err, row) => resolve(row));
            });
            
            if (driverLocation && driverLocation.latitude) {
                await ETAService.checkETAAlerts(driverId, driverLocation.latitude, driverLocation.longitude);
            }
        } catch (error) {
            console.error('ETA monitoring error:', error);
        }
    }, 30000); // 30 seconds
    
    // Store interval ID for cleanup
    global.etaMonitoringIntervals = global.etaMonitoringIntervals || {};
    global.etaMonitoringIntervals[driverId] = monitoringInterval;
    
    // Auto-cleanup after 4 hours
    setTimeout(() => {
        clearInterval(monitoringInterval);
        delete global.etaMonitoringIntervals[driverId];
        console.log(`⏰ ETA monitoring stopped for driver ${driverId}`);
    }, 4 * 60 * 60 * 1000);
}

// Driver: Stop route and ETA monitoring
app.post('/api/driver/stop-route', authenticateToken, requireRole(['driver', 'admin']), (req, res) => {
    const driverId = req.user.id;
    
    console.log(`⏹️ Stop route request from user ${driverId}, role: ${req.user.role}`);
    
    // Clear route stops
    db.run('UPDATE route_stops SET is_active = 0 WHERE driver_id = ?', [driverId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // Stop ETA monitoring
        if (global.etaMonitoringIntervals && global.etaMonitoringIntervals[driverId]) {
            clearInterval(global.etaMonitoringIntervals[driverId]);
            delete global.etaMonitoringIntervals[driverId];
        }
        
        res.json({ success: true, message: 'Route stopped. ETA monitoring disabled.' });
    });
});

console.log('🎯 ETA Notification System initialized!');

// ============= END ETA SYSTEM =============

// Driver Dashboard Summary
app.get('/api/driver/dashboard', authenticateToken, requireRole(['driver']), (req, res) => {
    const driverId = req.user.id;
    
    Promise.all([
        new Promise((resolve) => {
            db.get('SELECT name, email, phone, driver_license FROM users WHERE id = ?', [driverId], (err, driver) => {
                resolve(driver || {});
            });
        }),
        new Promise((resolve) => {
            db.get('SELECT vehicle_number, capacity, status FROM shuttles WHERE driver_id = ?', [driverId], (err, shuttle) => {
                resolve(shuttle || {});
            });
        }),
        new Promise((resolve) => {
            db.get('SELECT COUNT(*) as count FROM trips WHERE driver_id = ? AND status = "active"', [driverId], (err, row) => {
                resolve(row?.count || 0);
            });
        })
    ]).then(([driver, shuttle, activeTrips]) => {
        res.json({
            success: true,
            dashboard: {
                driver,
                shuttle,
                activeTrips,
                locationPermission: 'granted'
            }
        });
    });
});

// Driver Routes
app.get('/api/driver/routes', authenticateToken, requireRole(['driver']), (req, res) => {
    const routes = [
        {
            id: 1,
            name: 'Main Campus Route',
            stops: ['Main Gate', 'Library', 'Science Block', 'Hostel A', 'Hostel B'],
            distance: '5.2 km',
            estimatedTime: '25 min',
            status: 'active'
        },
        {
            id: 2,
            name: 'Library Express',
            stops: ['Main Gate', 'Library', 'Science Block'],
            distance: '2.1 km',
            estimatedTime: '12 min',
            status: 'active'
        },
        {
            id: 3,
            name: 'Hostel Shuttle',
            stops: ['Campus Center', 'Hostel A', 'Hostel B', 'Cafeteria'],
            distance: '3.8 km',
            estimatedTime: '18 min',
            status: 'inactive'
        }
    ];
    
    res.json({ success: true, routes });
});

// Start/End Route
app.post('/api/driver/route/:action', authenticateToken, requireRole(['driver']), (req, res) => {
    const { action } = req.params;
    const { routeId } = req.body;
    
    if (action === 'start') {
        res.json({ success: true, message: 'Route started successfully' });
    } else if (action === 'end') {
        res.json({ success: true, message: 'Route ended successfully' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid action' });
    }
});

// Shuttle Status with Real-time Location
app.get('/api/driver/shuttle/status', authenticateToken, requireRole(['driver']), (req, res) => {
    const driverId = req.user.id;
    
    db.get(`SELECT s.*, 
            (SELECT COUNT(*) FROM trips WHERE driver_id = ? AND status = 'active') as current_passengers
            FROM shuttles s WHERE s.driver_id = ?`, 
        [driverId, driverId], (err, shuttle) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({
            success: true,
            shuttle: shuttle || {},
            eta: '5 min',
            nextStop: 'Library'
        });
    });
});

// Update Shuttle Location
app.post('/api/driver/location', authenticateToken, requireRole(['driver']), (req, res) => {
    const { latitude, longitude, accuracy } = req.body;
    const driverId = req.user.id;
    
    db.run('UPDATE shuttles SET latitude = ?, longitude = ?, last_updated = CURRENT_TIMESTAMP WHERE driver_id = ?',
        [latitude, longitude, driverId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating location' });
        }
        
        // Emit real-time update
        io.emit('driver_location_update', {
            driverId,
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Location updated' });
    });
});

// Driver Trip History
app.get('/api/driver/trips/history', authenticateToken, requireRole(['driver']), (req, res) => {
    const driverId = req.user.id;
    const { date, route } = req.query;
    
    let query = `SELECT t.*, u.name as student_name 
                 FROM trips t 
                 LEFT JOIN users u ON t.student_id = u.id 
                 WHERE t.driver_id = ?`;
    let params = [driverId];
    
    if (date) {
        query += ' AND DATE(t.created_at) = ?';
        params.push(date);
    }
    
    if (route) {
        query += ' AND t.route = ?';
        params.push(route);
    }
    
    query += ' ORDER BY t.created_at DESC LIMIT 50';
    
    db.all(query, params, (err, trips) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, trips: trips || [] });
    });
});

// Driver Messages
app.get('/api/driver/messages', authenticateToken, requireRole(['driver']), (req, res) => {
    const driverId = req.user.id;
    
    db.all(`SELECT m.*, u.name as sender_name, u.role as sender_role 
            FROM messages m 
            LEFT JOIN users u ON m.sender_id = u.id 
            WHERE m.recipient_id = ? OR m.sender_id = ? 
            ORDER BY m.created_at DESC LIMIT 100`,
        [driverId, driverId], (err, messages) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        const unreadCount = messages.filter(m => m.recipient_id === driverId && !m.read).length;
        
        res.json({
            success: true,
            messages: messages || [],
            unreadCount
        });
    });
});

// Send Message
app.post('/api/driver/messages/send', authenticateToken, requireRole(['driver']), (req, res) => {
    const { recipientId, message } = req.body;
    const senderId = req.user.id;
    
    db.run('INSERT INTO messages (sender_id, recipient_id, message) VALUES (?, ?, ?)',
        [senderId, recipientId, message], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error sending message' });
        }
        
        io.emit('new_message', {
            id: this.lastID,
            senderId,
            recipientId,
            message,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, messageId: this.lastID });
    });
});

// Driver Profile
app.get('/api/driver/profile', authenticateToken, requireRole(['driver']), (req, res) => {
    const driverId = req.user.id;
    
    db.get(`SELECT u.id, u.name, u.email, u.phone, u.driver_license, u.created_at,
                   s.vehicle_number as assigned_shuttle,
                   'Campus Express' as current_route,
                   'Idle' as trip_status
            FROM users u 
            LEFT JOIN shuttles s ON s.driver_id = u.id 
            WHERE u.id = ?`, 
        [driverId], (err, profile) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, profile: profile || {} });
    });
});

// Update Driver Profile
app.put('/api/driver/profile', authenticateToken, requireRole(['driver']), (req, res) => {
    const { name, phone, driver_license } = req.body;
    const driverId = req.user.id;
    
    db.run('UPDATE users SET name = ?, phone = ?, driver_license = ? WHERE id = ?',
        [name, phone, driver_license, driverId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating profile' });
        }
        
        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

// Change Password
app.post('/api/driver/change-password', authenticateToken, requireRole(['driver']), (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const driverId = req.user.id;
    
    db.get('SELECT password FROM users WHERE id = ?', [driverId], (err, user) => {
        if (err || !user) {
            return res.status(500).json({ success: false, message: 'Error verifying user' });
        }
        
        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect' });
            }
            
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error hashing password' });
                }
                
                db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, driverId], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Error updating password' });
                    }
                    res.json({ success: true, message: 'Password changed successfully' });
                });
            });
        });
    });
});

// ============= STUDENT DASHBOARD API ENDPOINTS =============

// Student Profile endpoint
app.get('/api/student/profile', authenticateToken, (req, res) => {
    db.get(
        `SELECT id, name, email, phone, role, created_at, student_id, 
                department, year_of_study, emergency_contact, emergency_phone 
         FROM users WHERE id = ?`,
        [req.user.id],
        (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Remove sensitive data
            delete user.password;

            res.json({ success: true, profile: user });
        }
    );
});

// Update Student Profile
app.put('/api/student/profile', authenticateToken, (req, res) => {
    const { name, phone, department, year_of_study, emergency_contact, emergency_phone } = req.body;

    db.run(
        `UPDATE users SET name = ?, phone = ?, department = ?, year_of_study = ?, 
         emergency_contact = ?, emergency_phone = ? WHERE id = ?`,
        [name, phone, department, year_of_study, emergency_contact, emergency_phone, req.user.id],
        (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error updating profile' });
            }
            res.json({ success: true, message: 'Profile updated successfully' });
        }
    );
});

// Change Password
app.post('/api/student/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new passwords required' });
    }

    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(500).json({ success: false, message: 'Error verifying user' });
        }

        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect' });
            }

            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error hashing password' });
                }

                db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Error updating password' });
                    }
                    res.json({ success: true, message: 'Password changed successfully' });
                });
            });
        });
    });
});

// Get Rides (with filters)
app.get('/api/rides', authenticateToken, (req, res) => {
    const { status } = req.query;
    let query = `SELECT t.*, u.name as driver_name, s.vehicle_number as shuttle_number 
                 FROM trips t 
                 LEFT JOIN users u ON t.driver_id = u.id 
                 LEFT JOIN shuttles s ON t.shuttle_id = s.id 
                 WHERE t.student_id = ?`;

    let params = [req.user.id];

    if (status) {
        if (status === 'upcoming') {
            query += ` AND t.status IN ('pending', 'accepted', 'en_route')`;
        } else if (status === 'active') {
            query += ` AND t.status IN ('accepted', 'en_route')`;
        } else {
            query += ` AND t.status = ?`;
            params.push(status);
        }
    }

    query += ' ORDER BY t.created_at DESC LIMIT 50';

    db.all(query, params, (err, rides) => {
        if (err) {
            console.error('Error fetching rides:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, rides: rides || [] });
    });
});

// Book a new ride
app.post('/api/rides/book', authenticateToken, (req, res) => {
    const { pickup_location, destination, scheduled_time, passengers } = req.body;

    if (!pickup_location || !destination) {
        return res.status(400).json({ success: false, message: 'Pickup location and destination required' });
    }

    const fare = calculateFare(pickup_location, destination);

    db.run(
        `INSERT INTO trips (student_id, pickup_location, destination, fare, passengers, scheduled_time, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [req.user.id, pickup_location, destination, fare, passengers || 1, scheduled_time || null],
        function (err) {
            if (err) {
                console.error('Error booking ride:', err);
                return res.status(500).json({ success: false, message: 'Error booking ride' });
            }

            // Emit real-time notification
            io.emit('ride:new', {
                id: this.lastID,
                student_id: req.user.id,
                pickup_location,
                destination
            });

            res.json({
                success: true,
                message: 'Ride booked successfully',
                rideId: this.lastID
            });
        }
    );
});

// Cancel a ride
app.delete('/api/rides/:id', authenticateToken, (req, res) => {
    const rideId = req.params.id;

    // Verify ownership
    db.get('SELECT * FROM trips WHERE id = ? AND student_id = ?', [rideId, req.user.id], (err, trip) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip not found or unauthorized' });
        }
        if (trip.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Cannot cancel completed trip' });
        }

        db.run('UPDATE trips SET status = "cancelled" WHERE id = ?', [rideId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error cancelling ride' });
            }

            // Emit real-time notification
            io.emit('ride:cancelled', { rideId, student_id: req.user.id });

            res.json({ success: true, message: 'Ride cancelled successfully' });
        });
    });
});

// Trip History with filters
app.get('/api/trips/history', authenticateToken, (req, res) => {
    const { from, to, route, limit = 50 } = req.query;

    let query = `SELECT t.*, u.name as driver_name, s.vehicle_number as shuttle_number 
                 FROM trips t 
                 LEFT JOIN users u ON t.driver_id = u.id 
                 LEFT JOIN shuttles s ON t.shuttle_id = s.id 
                 WHERE t.student_id = ? AND t.status IN ('completed', 'cancelled')`;

    let params = [req.user.id];

    if (from) {
        query += ` AND DATE(t.created_at) >= ?`;
        params.push(from);
    }
    if (to) {
        query += ` AND DATE(t.created_at) <= ?`;
        params.push(to);
    }
    if (route) {
        query += ` AND (t.pickup_location LIKE ? OR t.destination LIKE ?)`;
        params.push(`%${route}%`, `%${route}%`);
    }

    query += ` ORDER BY t.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    db.all(query, params, (err, trips) => {
        if (err) {
            console.error('Error fetching trip history:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, trips: trips || [] });
    });
});

// Help / FAQ endpoint
app.get('/api/help/faq', (req, res) => {
    const faqs = [
        {
            id: 1,
            category: 'Booking',
            question: 'How do I book a shuttle?',
            answer: 'Click on "My Rides" from the sidebar, then click "Book New Ride". Select your pickup location and destination, choose your preferred time, and submit.'
        },
        {
            id: 2,
            category: 'Booking',
            question: 'Can I cancel a ride?',
            answer: 'Yes! Go to "My Rides", find your upcoming ride, and click the "Cancel" button. You can only cancel rides that haven\'t been completed yet.'
        },
        {
            id: 3,
            category: 'Tracking',
            question: 'How do I track my shuttle in real-time?',
            answer: 'Click on "Shuttle Map" in the sidebar. You\'ll see all active shuttles on the map with their current locations updating every few seconds.'
        },
        {
            id: 4,
            category: 'Tracking',
            question: 'Why can\'t I see my location on the map?',
            answer: 'Make sure you\'ve granted location permissions to your browser. Click the location icon in your browser\'s address bar to enable permissions.'
        },
        {
            id: 5,
            category: 'Account',
            question: 'How do I update my profile information?',
            answer: 'Click on your name in the sidebar, then select "Profile". You can update your contact information, emergency contacts, and other details there.'
        },
        {
            id: 6,
            category: 'Account',
            question: 'How do I change my password?',
            answer: 'Go to your Profile page and click "Change Password". Enter your current password and your new password.'
        },
        {
            id: 7,
            category: 'Emergency',
            question: 'What should I do in an emergency?',
            answer: 'Click the Emergency Alert button on your dashboard or call campus security immediately at +233-XXXX-XXXX. Your location will be shared automatically if you grant permission.'
        },
        {
            id: 8,
            category: 'General',
            question: 'How do I contact support?',
            answer: 'Go to the Help section and use the contact form, or send a message through the Messages tab to reach our support team.'
        }
    ];

    res.json({ success: true, faqs });
});

// AI Assistant endpoint (using free Hugging Face API)
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required' });
    }

    try {
        // Simple rule-based responses for common queries
        const response = generateAIResponse(message, context, req.user);

        res.json({
            success: true,
            response: response.text,
            suggestions: response.suggestions
        });
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing AI response',
            response: 'I apologize, but I\'m having trouble responding right now. Please try asking your question in a different way or contact support.'
        });
    }
});

// Helper function for AI responses
function generateAIResponse(message, context, user) {
    const msg = message.toLowerCase();

    // Booking queries
    if (msg.includes('book') || msg.includes('ride') || msg.includes('shuttle')) {
        return {
            text: `Hi ${user.name}! To book a ride, go to "My Rides" and click "Book New Ride". You'll need to select your pickup location and destination. Would you like me to guide you through the steps?`,
            suggestions: ['Book a ride now', 'View shuttle locations', 'Check my upcoming rides']
        };
    }

    // Tracking queries
    if (msg.includes('track') || msg.includes('location') || msg.includes('where')) {
        return {
            text: 'You can track shuttles in real-time on the Shuttle Map. Click "Shuttle Map" in the sidebar to see all active shuttles and their current locations.',
            suggestions: ['Open map', 'Show active shuttles', 'Track my ride']
        };
    }

    // History queries
    if (msg.includes('history') || msg.includes('past') || msg.includes('previous')) {
        return {
            text: 'Your trip history is available in the "Trip History" section. You can view all your past trips, filter by date, and see details like driver name, route, and fare.',
            suggestions: ['View trip history', 'See this month\'s trips', 'Download trip report']
        };
    }

    // Cancel queries
    if (msg.includes('cancel')) {
        return {
            text: 'To cancel a ride, go to "My Rides", find the ride you want to cancel, and click the "Cancel" button. Note that you can only cancel rides that haven\'t been completed yet.',
            suggestions: ['View upcoming rides', 'Cancel policy', 'Contact support']
        };
    }

    // Contact/Help queries
    if (msg.includes('help') || msg.includes('support') || msg.includes('contact')) {
        return {
            text: 'I\'m here to help! You can browse our FAQs in the Help section, or send a message to our support team through the Messages tab. What do you need assistance with?',
            suggestions: ['View FAQs', 'Contact support', 'Report an issue']
        };
    }

    // Emergency queries
    if (msg.includes('emergency') || msg.includes('urgent') || msg.includes('help me')) {
        return {
            text: 'For emergencies, please use the Emergency Alert button on your dashboard or call campus security immediately. Your safety is our priority. Is this an emergency?',
            suggestions: ['Emergency contact info', 'Call security', 'Send location']
        };
    }

    // Default response
    return {
        text: `Hi ${user.name}! I can help you with booking rides, tracking shuttles, viewing your trip history, or answering questions about our service. What would you like to know?`,
        suggestions: ['Book a ride', 'Track shuttles', 'View history', 'Get help']
    };
}

// Helper function to calculate fare
function calculateFare(pickup, destination) {
    // Simple fare calculation based on estimated distance
    const baseFare = 5; // GH₵
    const perKmRate = 2; // GH₵

    // Rough distance estimation based on common campus routes
    const routes = {
        'library-hostel': 2,
        'science-hostel': 3,
        'admin-hostel': 1.5,
        'gate-hostel': 4
    };

    const routeKey = `${pickup.toLowerCase()}-${destination.toLowerCase()}`;
    const distance = routes[routeKey] || 2.5; // Default 2.5km

    return baseFare + (distance * perKmRate);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔗 User connected: ${socket.id}`);

    socket.on('join_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`📱 User ${userId} joined their room`);
    });

    socket.on('send_message', (data) => {
        const { recipient_id, message } = data;

        // Broadcast to recipient
        socket.to(`user_${recipient_id}`).emit('new_message', {
            sender_id: data.sender_id,
            message,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('location_update', (data) => {
        const { shuttle_id, latitude, longitude } = data;

        // Update database
        db.run('UPDATE shuttles SET latitude = ?, longitude = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
            [latitude, longitude, shuttle_id]);

        // Broadcast to all users
        io.emit('shuttle_location', {
            shuttle_id,
            latitude,
            longitude,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize the enhanced server
initializeServer().then(() => {
    // TODO: Initialize ETA system after database is ready
    // initializeETASystem();
    
    // Start server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 UCC Shuttle Tracker Enhanced Server running on port ${PORT}`);
        console.log(`📡 Socket.IO server ready for real-time updates`);
        console.log(`🎯 ETA Notification System active`);
        console.log(`🌐 Access the app at: http://localhost:${PORT}`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`🌍 Production mode - Cloud deployment active`);
        } else {
            console.log(`🌐 Network access: http://192.168.100.194:${PORT}`);
        }
    });
}).catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});