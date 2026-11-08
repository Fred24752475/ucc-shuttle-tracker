require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const pool = require('./database/postgres');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Connect to the existing Supabase database. Tables are created once
// from supabase-setup.sql — never drop them on boot.
(async () => {
    try {
        console.log('Attempting database connection...');
        await pool.query('SELECT 1');
        const tables = await pool.query(`SELECT to_regclass('public.users') AS users`);
        if (!tables.rows[0].users) {
            console.error('users table is missing. Run supabase-setup.sql in the Supabase SQL editor.');
            process.exit(1);
        }
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study TEXT');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact TEXT');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_phone TEXT');
        await pool.query(`CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`);
        console.log('Database connected');
        startDemoFleet();
        console.log('Campus buses running:', demoFleet.size);
    } catch (error) {
        console.error('Database initialization failed:', error.message);
        process.exit(1);
    }
})();

// Middleware
app.use(helmet({
    hsts: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://unpkg.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"]
        }
    }
}));
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const JWT_SECRET = process.env.JWT_SECRET || 'ucc_shuttle_tracker_enhanced_2024';

// Email transporter
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Auth middleware
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
        req.user = user;
        next();
    });
}

function requireRole(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }
        next();
    };
}

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ success: true, status: 'healthy', database: 'connected' });
    } catch (error) {
        res.status(500).json({ success: false, status: 'unhealthy', database: 'disconnected' });
    }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password } = req.body;
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        
        await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            success: true,
            token,
            user: { id: user.id, email: user.email, role: user.role, name: user.name, phone: user.phone }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.post('/api/login', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password } = req.body;
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        
        await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            success: true,
            token,
            user: { id: user.id, email: user.email, role: user.role, name: user.name, phone: user.phone }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.post('/api/auth/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, email, password, phone, role = 'student' } = req.body;
        
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await client.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, email, hashedPassword, phone, role]
        );
        
        const userId = result.rows[0].id;
        const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ success: true, token, user: { id: userId, name, email, phone, role } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating user' });
    } finally {
        client.release();
    }
});

app.post('/api/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, email, password, phone, role = 'student' } = req.body;
        
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await client.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, email, hashedPassword, phone, role]
        );
        
        const userId = result.rows[0].id;
        const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ success: true, token, user: { id: userId, name, email, phone, role } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating user' });
    } finally {
        client.release();
    }
});

// Forgot Password - Request reset code
app.post('/api/auth/forgot-password', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email } = req.body;
        
        const result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Email not found' });
        }
        
        const userId = result.rows[0].id;
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        await client.query(
            'INSERT INTO password_resets (user_id, reset_code, expires_at) VALUES ($1, $2, $3)',
            [userId, resetCode, expiresAt]
        );
        
        // Send email (if configured)
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                await emailTransporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Password Reset Code - UCC Shuttle Tracker',
                    text: `Your password reset code is: ${resetCode}\n\nThis code will expire in 15 minutes.`
                });
            } catch (emailError) {
                console.error('Email error:', emailError);
            }
        }
        
        res.json({ success: true, message: 'Reset code sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Error processing request' });
    } finally {
        client.release();
    }
});

// Reset Password - Verify code and update password
app.post('/api/auth/reset-password', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, resetCode, newPassword } = req.body;
        
        const userResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Email not found' });
        }
        
        const userId = userResult.rows[0].id;
        
        const resetResult = await client.query(
            'SELECT * FROM password_resets WHERE user_id = $1 AND reset_code = $2 AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [userId, resetCode]
        );
        
        if (resetResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
        await client.query('UPDATE password_resets SET used = true WHERE id = $1', [resetResult.rows[0].id]);
        
        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    } finally {
        client.release();
    }
});

// User endpoints
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name, email, phone, role, student_id, license_number FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/driver/profile', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT u.id, u.name, u.email, u.phone, u.role, u.license_number,
                   s.vehicle_number, s.status AS shuttle_status
            FROM users u
            LEFT JOIN shuttles s ON s.driver_id = u.id
            WHERE u.id = $1
            ORDER BY s.id DESC
            LIMIT 1
        `, [req.user.id]);
        const row = result.rows[0];
        if (!row) return res.status(404).json({ success: false, message: 'Driver not found' });
        const active = activeDrivers.get(req.user.id);
        const profile = {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            role: row.role,
            driver_license: row.license_number,
            license_number: row.license_number,
            assigned_shuttle: row.vehicle_number || 'Not Assigned',
            current_route: active?.routeName || 'No Active Route',
            trip_status: active ? 'On route' : 'Idle'
        };
        res.json({ success: true, profile, user: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.put('/api/driver/profile', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, phone, driver_license } = req.body;
        const result = await client.query(
            `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), license_number = COALESCE($3, license_number)
             WHERE id = $4 RETURNING id, name, email, phone, license_number`,
            [name || null, phone || null, driver_license || null, req.user.id]
        );
        res.json({ success: true, message: 'Profile updated', profile: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/student/profile', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT id, name, email, phone, role, student_id, department, year_of_study, emergency_contact, emergency_phone
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        const profile = result.rows[0];
        res.json({ success: true, profile, user: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.put('/api/student/profile', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, phone, department, year_of_study, emergency_contact, emergency_phone } = req.body;
        const result = await client.query(
            `UPDATE users SET
                name = COALESCE($1, name),
                phone = COALESCE($2, phone),
                department = COALESCE($3, department),
                year_of_study = COALESCE($4, year_of_study),
                emergency_contact = COALESCE($5, emergency_contact),
                emergency_phone = COALESCE($6, emergency_phone)
             WHERE id = $7
             RETURNING id, name, email, phone, role, student_id, department, year_of_study, emergency_contact, emergency_phone`,
            [name || null, phone || null, department || null, year_of_study || null, emergency_contact || null, emergency_phone || null, req.user.id]
        );
        res.json({ success: true, message: 'Profile updated', profile: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/messaging/conversations', authenticateToken, async (req, res) => {
    res.json({ success: true, conversations: [] });
});

app.get('/api/student/pickup-location', authenticateToken, async (req, res) => {
    res.json({ success: true, location: null });
});

// Trip endpoints
app.get('/api/trips', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM trips';
        let params = [];
        
        if (req.user.role === 'student') {
            query += ' WHERE student_id = $1';
            params = [req.user.id];
        } else if (req.user.role === 'driver') {
            query += ' WHERE driver_id = $1';
            params = [req.user.id];
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await client.query(query, params);
        res.json({ success: true, trips: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.post('/api/trips', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { pickup_location, destination, fare = 10 } = req.body;
        
        const result = await client.query(
            'INSERT INTO trips (student_id, pickup_location, destination, fare, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, pickup_location, destination, fare, 'pending']
        );
        
        res.json({ success: true, trip: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

// ============= FRIEND REQUEST SYSTEM =============

// Get all students (for finding friends)
app.get('/api/students/all', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT id, name, email, student_id, created_at 
            FROM users 
            WHERE role = 'student' AND id != $1
            ORDER BY name ASC
        `, [req.user.id]);
        
        res.json({ success: true, students: result.rows });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, message: 'Error fetching students' });
    } finally {
        client.release();
    }
});

// Send friend request
app.post('/api/friends/request', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { receiver_id } = req.body;
        
        console.log('📨 Friend request from:', req.user.id, 'to:', receiver_id);
        
        // Check if already friends or request exists
        const existing = await client.query(`
            SELECT * FROM friendships 
            WHERE (requester_id = $1 AND receiver_id = $2) 
            OR (requester_id = $2 AND receiver_id = $1)
        `, [req.user.id, receiver_id]);
        
        if (existing.rows.length > 0) {
            console.log('⚠️ Friend request already exists');
            return res.status(400).json({ success: false, message: 'Friend request already exists' });
        }
        
        console.log('✅ Inserting friend request into database...');
        await client.query(`
            INSERT INTO friendships (requester_id, receiver_id, status) 
            VALUES ($1, $2, 'pending')
        `, [req.user.id, receiver_id]);
        
        console.log('✅ Friend request inserted successfully');
        
        // Emit socket event
        io.emit(`friend_request_${receiver_id}`, {
            from: req.user.id,
            message: 'New friend request'
        });
        
        res.json({ success: true, message: 'Friend request sent' });
    } catch (error) {
        console.error('❌ Error sending friend request:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, message: 'Error sending request', error: error.message });
    } finally {
        client.release();
    }
});

// Get friend requests (received)
app.get('/api/friends/requests', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT f.id, f.requester_id, f.status, f.created_at,
                   u.name, u.email, u.student_id
            FROM friendships f
            JOIN users u ON f.requester_id = u.id
            WHERE f.receiver_id = $1 AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `, [req.user.id]);
        
        res.json({ success: true, requests: result.rows });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ success: false, message: 'Error fetching requests' });
    } finally {
        client.release();
    }
});

// Accept friend request
app.post('/api/friends/accept/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE friendships 
            SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND receiver_id = $2
        `, [req.params.id, req.user.id]);
        
        res.json({ success: true, message: 'Friend request accepted' });
    } catch (error) {
        console.error('Error accepting request:', error);
        res.status(500).json({ success: false, message: 'Error accepting request' });
    } finally {
        client.release();
    }
});

// Reject friend request
app.post('/api/friends/reject/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE friendships 
            SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND receiver_id = $2
        `, [req.params.id, req.user.id]);
        
        res.json({ success: true, message: 'Friend request rejected' });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ success: false, message: 'Error rejecting request' });
    } finally {
        client.release();
    }
});

// Get all friends
app.get('/api/friends', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT DISTINCT
                CASE 
                    WHEN f.requester_id = $1 THEN f.receiver_id
                    ELSE f.requester_id
                END as friend_id,
                u.name, u.email, u.student_id, u.last_login,
                f.created_at as friends_since
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.requester_id = $1 THEN f.receiver_id
                    ELSE f.requester_id
                END = u.id
            )
            WHERE (f.requester_id = $1 OR f.receiver_id = $1) 
            AND f.status = 'accepted'
            ORDER BY u.name ASC
        `, [req.user.id]);
        
        res.json({ success: true, friends: result.rows });
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ success: false, message: 'Error fetching friends' });
    } finally {
        client.release();
    }
});

// Send message (only to friends)
app.post('/api/messages/send', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { receiver_id, content } = req.body;
        
        // Check if they are friends
        const friendship = await client.query(`
            SELECT * FROM friendships 
            WHERE ((requester_id = $1 AND receiver_id = $2) 
            OR (requester_id = $2 AND receiver_id = $1))
            AND status = 'accepted'
        `, [req.user.id, receiver_id]);
        
        if (friendship.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You can only message friends' });
        }
        
        // Get or create conversation
        let conversation = await client.query(`
            SELECT id FROM conversations 
            WHERE (participant1_id = $1 AND participant2_id = $2)
            OR (participant1_id = $2 AND participant2_id = $1)
        `, [req.user.id, receiver_id]);
        
        let conversationId;
        if (conversation.rows.length === 0) {
            const newConv = await client.query(`
                INSERT INTO conversations (participant1_id, participant2_id) 
                VALUES ($1, $2) RETURNING id
            `, [req.user.id, receiver_id]);
            conversationId = newConv.rows[0].id;
        } else {
            conversationId = conversation.rows[0].id;
        }
        
        // Insert message
        const message = await client.query(`
            INSERT INTO messages (conversation_id, sender_id, content) 
            VALUES ($1, $2, $3) RETURNING *
        `, [conversationId, req.user.id, content]);
        
        // Emit socket event
        io.emit(`new_message_${receiver_id}`, {
            from: req.user.id,
            content,
            timestamp: message.rows[0].created_at
        });
        
        res.json({ success: true, message: message.rows[0] });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Error sending message' });
    } finally {
        client.release();
    }
});

// Get messages with a friend
app.get('/api/messages/:friendId', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT m.*, u.name as sender_name
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN users u ON m.sender_id = u.id
            WHERE c.id IN (
                SELECT id FROM conversations 
                WHERE (participant1_id = $1 AND participant2_id = $2)
                OR (participant1_id = $2 AND participant2_id = $1)
            )
            ORDER BY m.created_at ASC
        `, [req.user.id, req.params.friendId]);
        
        res.json({ success: true, messages: result.rows });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    } finally {
        client.release();
    }
});

// ============= END FRIEND REQUEST SYSTEM =============

// ============= REAL-TIME SHUTTLE TRACKING SYSTEM =============

// Store active drivers and their locations in memory
const activeDrivers = new Map(); // driverId -> { latitude, longitude, timestamp, shuttleId }
const rideTimers = new Map();

// University of Cape Coast grounds. Every bus coordinate stays inside this box.
const UCC_BOX = { south: 5.104, north: 5.134, west: -1.302, east: -1.272 };
const CAMPUS_LOOP = [
    [5.1085, -1.2980],
    [5.1120, -1.2945],
    [5.1155, -1.2909],
    [5.1183, -1.2886],
    [5.1210, -1.2860],
    [5.1205, -1.2805],
    [5.1160, -1.2795],
    [5.1136, -1.2788],
    [5.1110, -1.2830],
    [5.1090, -1.2900],
    [5.1085, -1.2980]
];
const CAMPUS_LOOP_MS = 150000;
const DEMO_FLEET = [
    {
        id: 'demo-west',
        vehicle: 'UCC-BRT 01',
        driver: 'Kofi Mensah',
        routeName: 'West Gate – Administration',
        loopMs: 140000,
        route: CAMPUS_LOOP
    },
    {
        id: 'demo-east',
        vehicle: 'UCC-BRT 02',
        driver: 'Ama Boateng',
        routeName: 'East Gate – Halls',
        loopMs: 170000,
        route: [
            [5.1065, -1.2920],
            [5.1080, -1.2860],
            [5.1105, -1.2820],
            [5.1130, -1.2795],
            [5.1110, -1.2765],
            [5.1075, -1.2780],
            [5.1055, -1.2840],
            [5.1060, -1.2900],
            [5.1065, -1.2920]
        ]
    },
    {
        id: 'demo-science',
        vehicle: 'UCC-BRT 03',
        driver: 'Yaw Owusu',
        routeName: 'Science – Hospital',
        loopMs: 125000,
        route: [
            [5.1070, -1.2845],
            [5.1095, -1.2810],
            [5.1125, -1.2865],
            [5.1160, -1.2895],
            [5.1190, -1.2930],
            [5.1165, -1.2965],
            [5.1120, -1.2950],
            [5.1085, -1.2900],
            [5.1070, -1.2845]
        ]
    }
];
const demoFleet = new Map();

function campusPoint(startedAt, now, route = CAMPUS_LOOP, loopMs = CAMPUS_LOOP_MS) {
    const t = ((now - startedAt) % loopMs) / loopMs;
    const span = route.length - 1;
    const pos = t * span;
    const i = Math.floor(pos);
    const f = pos - i;
    const a = route[i];
    const b = route[Math.min(i + 1, span)];
    const lat = Math.min(UCC_BOX.north, Math.max(UCC_BOX.south, a[0] + (b[0] - a[0]) * f));
    const lng = Math.min(UCC_BOX.east, Math.max(UCC_BOX.west, a[1] + (b[1] - a[1]) * f));
    return [lat, lng];
}

function stopCampusDrive(driverId) {
    const timer = rideTimers.get(driverId);
    if (timer) clearInterval(timer);
    rideTimers.delete(driverId);
    const active = activeDrivers.get(driverId);
    if (active?.shuttleId) {
        io.emit('shuttle_offline', { shuttleId: active.shuttleId, driverId });
    }
}

function beginCampusDrive(driverId, shuttle, driverName) {
    if (rideTimers.has(driverId)) stopCampusDrive(driverId);
    const startedAt = Date.now();
    const [lat, lng] = campusPoint(startedAt, startedAt, CAMPUS_LOOP, CAMPUS_LOOP_MS);
    const state = {
        shuttleId: shuttle.id,
        vehicleNumber: shuttle.vehicle_number,
        driverName: driverName || 'Driver',
        routeName: 'Campus Express',
        startedAt,
        loopMs: CAMPUS_LOOP_MS,
        route: CAMPUS_LOOP,
        latitude: lat,
        longitude: lng,
        timestamp: startedAt,
        stops: CAMPUS_LOOP.map((point, index) => ({
            name: ['Main Gate', 'Library Road', 'Science Block', 'North Hall', 'Hostel Area', 'East Gate', 'Auditorium', 'Admin Block', 'Market', 'South Gate', 'West Road', 'Main Gate'][index],
            latitude: point[0],
            longitude: point[1]
        }))
    };
    activeDrivers.set(driverId, state);
    pool.query(
        'UPDATE shuttles SET status = $1, current_latitude = $2, current_longitude = $3 WHERE id = $4',
        ['active', lat, lng, shuttle.id]
    ).catch(() => {});

    const publish = (latitude, longitude, timestamp) => {
        io.emit('shuttle_location_update', {
            driverId,
            shuttleId: shuttle.id,
            vehicleNumber: shuttle.vehicle_number,
            driverName: state.driverName,
            latitude,
            longitude,
            routeName: state.routeName,
            startedAt,
            loopMs: CAMPUS_LOOP_MS,
            route: CAMPUS_LOOP,
            timestamp
        });
    };
    publish(lat, lng, startedAt);

    let ticks = 0;
    const timer = setInterval(() => {
        const current = activeDrivers.get(driverId);
        if (!current) return stopCampusDrive(driverId);
        const now = Date.now();
        const [latitude, longitude] = campusPoint(current.startedAt, now, current.route, current.loopMs);
        activeDrivers.set(driverId, { ...current, latitude, longitude, timestamp: now });
        publish(latitude, longitude, now);
        ticks += 1;
        if (ticks % 5 === 0) {
            pool.query(
                'UPDATE shuttles SET current_latitude = $1, current_longitude = $2, status = $3 WHERE id = $4',
                [latitude, longitude, 'active', shuttle.id]
            ).catch(() => {});
        }
    }, 1000);
    rideTimers.set(driverId, timer);
    return state;
}

function startDemoFleet() {
    DEMO_FLEET.forEach((bus, index) => {
        if (demoFleet.has(bus.id)) return;
        const startedAt = Date.now() - index * 45000;
        const [lat, lng] = campusPoint(startedAt, Date.now(), bus.route, bus.loopMs);
        const state = {
            shuttleId: bus.id,
            vehicleNumber: bus.vehicle,
            driverName: bus.driver,
            routeName: bus.routeName,
            route: bus.route,
            loopMs: bus.loopMs,
            startedAt,
            latitude: lat,
            longitude: lng,
            timestamp: Date.now()
        };
        demoFleet.set(bus.id, state);
        const timer = setInterval(() => {
            const now = Date.now();
            const current = demoFleet.get(bus.id);
            if (!current) return;
            const [latitude, longitude] = campusPoint(current.startedAt, now, current.route, current.loopMs);
            const next = { ...current, latitude, longitude, timestamp: now };
            demoFleet.set(bus.id, next);
            io.emit('shuttle_location_update', {
                shuttleId: bus.id,
                vehicleNumber: bus.vehicle,
                driverName: bus.driver,
                latitude,
                longitude,
                routeName: bus.routeName,
                startedAt: current.startedAt,
                loopMs: bus.loopMs,
                route: bus.route,
                timestamp: now
            });
        }, 1000);
        rideTimers.set(bus.id, timer);
    });
}

// Driver starts a ride (begins broadcasting location)
app.post('/api/driver/start-ride', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const { shuttle_id, route_name } = req.body;
        
        // Get or create shuttle for this driver
        let shuttle;
        if (shuttle_id) {
            const shuttleResult = await client.query(
                'SELECT * FROM shuttles WHERE id = $1 AND driver_id = $2',
                [shuttle_id, req.user.id]
            );
            shuttle = shuttleResult.rows[0];
        } else {
            // Create a default shuttle for this driver if none exists
            const existingShuttle = await client.query(
                'SELECT * FROM shuttles WHERE driver_id = $1',
                [req.user.id]
            );
            
            if (existingShuttle.rows.length > 0) {
                shuttle = existingShuttle.rows[0];
            } else {
                const newShuttle = await client.query(
                    'INSERT INTO shuttles (driver_id, vehicle_number, status) VALUES ($1, $2, $3) RETURNING *',
                    [req.user.id, `SHUTTLE-${req.user.id}`, 'active']
                );
                shuttle = newShuttle.rows[0];
            }
        }
        
        // Update shuttle status to active
        await client.query(
            'UPDATE shuttles SET status = $1 WHERE id = $2',
            ['active', shuttle.id]
        );
        
        const named = await client.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        const drive = beginCampusDrive(req.user.id, shuttle, named.rows[0]?.name);
        drive.routeName = route_name || drive.routeName;
        
        res.json({
            success: true,
            startedAt: drive.startedAt,
            loopMs: drive.loopMs,
            route: drive.route,
            message: 'Ride started! Your location will be broadcast to students.',
            shuttle: shuttle
        });
    } catch (error) {
        console.error('Start ride error:', error);
        res.status(500).json({ success: false, message: 'Error starting ride' });
    } finally {
        client.release();
    }
});

// Driver updates location (called continuously while ride is active)
app.post('/api/driver/update-location', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const { latitude, longitude } = req.body;
        
        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Location coordinates required' });
        }
        
        // Check if driver has an active ride
        const driverData = activeDrivers.get(req.user.id);
        if (!driverData) {
            return res.status(400).json({ success: false, message: 'No active ride. Start a ride first.' });
        }
        
        // Update location in database
        await client.query(
            'UPDATE shuttles SET current_latitude = $1, current_longitude = $2 WHERE id = $3',
            [latitude, longitude, driverData.shuttleId]
        );
        
        // Update in-memory location
        activeDrivers.set(req.user.id, {
            ...driverData,
            latitude,
            longitude,
            timestamp: Date.now()
        });
        
        // Broadcast location to all connected students via Socket.IO
        io.emit('shuttle_location_update', {
            driverId: req.user.id,
            shuttleId: driverData.shuttleId,
            latitude,
            longitude,
            routeName: driverData.routeName,
            timestamp: Date.now()
        });
        
        res.json({
            success: true,
            message: 'Location updated and broadcast to students'
        });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ success: false, message: 'Error updating location' });
    } finally {
        client.release();
    }
});

// Driver stops ride (stops broadcasting location)
app.post('/api/driver/stop-ride', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const driverData = activeDrivers.get(req.user.id);
        
        if (!driverData) {
            return res.status(400).json({ success: false, message: 'No active ride to stop' });
        }
        
        // Update shuttle status to inactive
        await client.query(
            'UPDATE shuttles SET status = $1 WHERE id = $2',
            ['inactive', driverData.shuttleId]
        );
        
        stopCampusDrive(req.user.id);
        activeDrivers.delete(req.user.id);
        
        // Notify students that shuttle is offline
        io.emit('shuttle_offline', {
            driverId: req.user.id,
            shuttleId: driverData.shuttleId
        });
        
        res.json({
            success: true,
            message: 'Ride stopped. Location broadcasting disabled.'
        });
    } catch (error) {
        console.error('Stop ride error:', error);
        res.status(500).json({ success: false, message: 'Error stopping ride' });
    } finally {
        client.release();
    }
});

// Get all active shuttles (for students to see on map)
app.get('/api/shuttles/active', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT s.id, s.vehicle_number, s.current_latitude, s.current_longitude, 
                   s.status, u.name as driver_name, u.id as driver_id
            FROM shuttles s
            JOIN users u ON s.driver_id = u.id
            WHERE s.status = 'active' AND s.current_latitude IS NOT NULL
        `);
        
        // Enrich with real-time data from memory
        const shuttles = result.rows.map(shuttle => {
            const driverData = activeDrivers.get(shuttle.driver_id);
            return {
                ...shuttle,
                latitude: driverData?.latitude || shuttle.current_latitude,
                longitude: driverData?.longitude || shuttle.current_longitude,
                routeName: driverData?.routeName || 'Campus Route',
                route: driverData?.route || CAMPUS_LOOP,
                startedAt: driverData?.startedAt || null,
                loopMs: driverData?.loopMs || CAMPUS_LOOP_MS,
                vehicle_number: driverData?.vehicleNumber || shuttle.vehicle_number,
                lastUpdate: driverData?.timestamp || null
            };
        }).filter((shuttle) => (
            Number(shuttle.latitude) > UCC_BOX.south &&
            Number(shuttle.latitude) < UCC_BOX.north &&
            Number(shuttle.longitude) > UCC_BOX.west &&
            Number(shuttle.longitude) < UCC_BOX.east
        ));
        
        const demos = [...demoFleet.values()].map((bus) => ({
            id: bus.shuttleId,
            vehicle_number: bus.vehicleNumber,
            driver_name: bus.driverName,
            latitude: bus.latitude,
            longitude: bus.longitude,
            status: 'active',
            routeName: bus.routeName,
            route: bus.route,
            startedAt: bus.startedAt,
            loopMs: bus.loopMs
        }));
        const visible = demos.concat(shuttles);
        res.json({
            success: true,
            shuttles: visible,
            campus: UCC_BOX,
            count: visible.length
        });
    } catch (error) {
        console.error('Get active shuttles error:', error);
        res.status(500).json({ success: false, message: 'Error fetching shuttles' });
    } finally {
        client.release();
    }
});

// Get driver's current ride status
app.get('/api/driver/ride-status', authenticateToken, requireRole(['driver']), async (req, res) => {
    try {
        const driverData = activeDrivers.get(req.user.id);
        
        if (!driverData) {
            return res.json({
                success: true,
                isActive: false,
                message: 'No active ride'
            });
        }
        
        res.json({
            success: true,
            isActive: true,
            shuttleId: driverData.shuttleId,
            routeName: driverData.routeName,
            latitude: driverData.latitude,
            longitude: driverData.longitude,
            lastUpdate: driverData.timestamp
        });
    } catch (error) {
        console.error('Get ride status error:', error);
        res.status(500).json({ success: false, message: 'Error getting ride status' });
    }
});

// ============= END SHUTTLE TRACKING SYSTEM =============

// Admin endpoints
app.get('/api/admin/overview', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const [users, trips, shuttles] = await Promise.all([
            client.query('SELECT COUNT(*) as count FROM users'),
            client.query('SELECT COUNT(*) as count FROM trips'),
            client.query('SELECT COUNT(*) as count FROM shuttles')
        ]);
        
        res.json({
            success: true,
            overview: {
                totalUsers: parseInt(users.rows[0].count),
                totalTrips: parseInt(trips.rows[0].count),
                totalShuttles: parseInt(shuttles.rows[0].count)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

function kmBetween(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CAMPUS_ROUTES = [
    { id: 'campus', name: 'Campus Express' },
    { id: 'library', name: 'Library Loop' },
    { id: 'hostel', name: 'Hostel Area' }
];

async function ensureDriverShuttle(client, driverId) {
    const existing = await client.query('SELECT * FROM shuttles WHERE driver_id = $1 ORDER BY id DESC LIMIT 1', [driverId]);
    if (existing.rows[0]) return existing.rows[0];
    const created = await client.query(
        'INSERT INTO shuttles (driver_id, vehicle_number, status) VALUES ($1, $2, $3) RETURNING *',
        [driverId, `SHUTTLE-${driverId}`, 'inactive']
    );
    return created.rows[0];
}

app.get('/api/shuttles', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT s.id, s.vehicle_number, s.model, s.capacity, s.status,
                   s.current_latitude, s.current_longitude, s.driver_id,
                   s.current_latitude AS latitude, s.current_longitude AS longitude,
                   u.name AS driver_name
            FROM shuttles s
            LEFT JOIN users u ON u.id = s.driver_id
            ORDER BY s.vehicle_number
        `);
        res.json({ success: true, shuttles: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/rides', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const status = req.query.status;
        let sql = `
            SELECT t.*, u.name AS driver_name, s.vehicle_number AS shuttle_number
            FROM trips t
            LEFT JOIN users u ON u.id = t.driver_id
            LEFT JOIN shuttles s ON s.id = t.shuttle_id
            WHERE t.student_id = $1
        `;
        if (status === 'cancelled') sql += ` AND t.status = 'cancelled'`;
        else if (status === 'history' || status === 'completed') sql += ` AND t.status = 'completed'`;
        else if (status === 'active' || status === 'upcoming') sql += ` AND t.status NOT IN ('completed', 'cancelled')`;
        sql += ' ORDER BY t.created_at DESC';
        const result = await client.query(sql, [req.user.id]);
        res.json({ success: true, rides: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.post('/api/rides/book', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const pickup = req.body.pickup_location || req.body.pickup || 'West Gate';
        const destination = req.body.destination || 'Administration';
        if (pickup === destination) {
            return res.status(400).json({ success: false, message: 'Pick a different destination' });
        }
        const driver = await client.query(`SELECT id FROM users WHERE role = 'driver' ORDER BY id LIMIT 1`);
        const shuttle = await client.query(`SELECT id FROM shuttles ORDER BY id LIMIT 1`);
        const result = await client.query(
            `INSERT INTO trips (student_id, driver_id, shuttle_id, pickup_location, destination, fare, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'confirmed') RETURNING *`,
            [req.user.id, driver.rows[0]?.id || null, shuttle.rows[0]?.id || null, pickup, destination, 2]
        );
        const full = await client.query(`
            SELECT t.*, u.name AS driver_name, s.vehicle_number AS shuttle_number
            FROM trips t
            LEFT JOIN users u ON u.id = t.driver_id
            LEFT JOIN shuttles s ON s.id = t.shuttle_id
            WHERE t.id = $1
        `, [result.rows[0].id]);
        res.json({ success: true, ride: full.rows[0], message: 'Ride booked' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not book ride' });
    } finally {
        client.release();
    }
});

app.delete('/api/rides/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `UPDATE trips SET status = 'cancelled' WHERE id = $1 AND student_id = $2 AND status NOT IN ('completed', 'cancelled') RETURNING *`,
            [req.params.id, req.user.id]
        );
        if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Ride not found' });
        res.json({ success: true, ride: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/trips/history', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const status = req.query.status;
        const params = [req.user.id];
        let sql = `
            SELECT t.*, u.name AS driver_name, s.vehicle_number AS shuttle_number
            FROM trips t
            LEFT JOIN users u ON u.id = t.driver_id
            LEFT JOIN shuttles s ON s.id = t.shuttle_id
            WHERE t.student_id = $1
        `;
        if (status === 'completed' || status === 'cancelled' || status === 'confirmed' || status === 'pending') {
            params.push(status);
            sql += ` AND t.status = $${params.length}`;
        } else if (status === 'last30') {
            sql += ` AND t.created_at >= NOW() - INTERVAL '30 days'`;
        }
        sql += ' ORDER BY t.created_at DESC';
        const result = await client.query(sql, params);
        res.json({ success: true, trips: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/help/faq', authenticateToken, (req, res) => {
    res.json({
        success: true,
        faqs: [
            { category: 'Booking', question: 'How do I book a ride?', answer: 'Open My Rides and choose Book a Ride. Enter your pickup and destination.' },
            { category: 'Booking', question: 'Can I cancel a ride?', answer: 'Yes. Open My Rides and press Cancel on a ride that has not finished.' },
            { category: 'Tracking', question: 'How do I see the shuttle?', answer: 'Open the map. Active shuttles appear when a driver has started a route.' },
            { category: 'Account', question: 'I forgot my password', answer: 'Use Forgot Password on the login page. A reset code is stored for your account.' }
        ]
    });
});

app.post('/api/emergency', authenticateToken, async (req, res) => {
    const { latitude, longitude } = req.body || {};
    io.emit('emergency_alert', {
        userId: req.user.id,
        latitude: latitude || null,
        longitude: longitude || null,
        timestamp: Date.now()
    });
    res.json({ success: true, message: 'Emergency alert sent' });
});

app.get('/api/driver/routes', authenticateToken, (req, res) => {
    res.json({ success: true, routes: CAMPUS_ROUTES });
});

app.get('/api/driver/shuttle', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const shuttle = await ensureDriverShuttle(client, req.user.id);
        const active = activeDrivers.get(req.user.id);
        res.json({
            success: true,
            shuttle: {
                ...shuttle,
                latitude: shuttle.current_latitude,
                longitude: shuttle.current_longitude,
                route: active?.routeName || 'Campus Express'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/driver/trips/history', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT t.*, COALESCE(t.destination, 'Campus Express') AS route,
                   1 AS passengers
            FROM trips t
            WHERE t.driver_id = $1
            ORDER BY t.created_at DESC
        `, [req.user.id]);
        res.json({ success: true, trips: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/driver/active-trip', authenticateToken, requireRole(['driver']), (req, res) => {
    const active = activeDrivers.get(req.user.id);
    if (!active) return res.json({ success: true, trip: null });
    res.json({
        success: true,
        trip: {
            route: active.routeName,
            pickup_points: (active.stops || []).map((stop, index) => ({
                name: stop.name,
                latitude: stop.latitude,
                longitude: stop.longitude,
                status: index === 0 ? 'current' : 'pending'
            }))
        }
    });
});

app.post('/api/driver/start-route', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const shuttle = await ensureDriverShuttle(client, req.user.id);
        await client.query('UPDATE shuttles SET status = $1 WHERE id = $2', ['active', shuttle.id]);
        const named = await client.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        const drive = beginCampusDrive(req.user.id, shuttle, named.rows[0]?.name);
        res.json({
            success: true,
            stops_count: drive.stops.length,
            shuttle,
            startedAt: drive.startedAt,
            loopMs: drive.loopMs,
            route: drive.route,
            message: 'Route started'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error starting route' });
    } finally {
        client.release();
    }
});

app.post('/api/driver/stop-route', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const active = activeDrivers.get(req.user.id);
        stopCampusDrive(req.user.id);
        if (active?.shuttleId) {
            await client.query('UPDATE shuttles SET status = $1 WHERE id = $2', ['inactive', active.shuttleId]);
        }
        activeDrivers.delete(req.user.id);
        res.json({ success: true, message: 'Route stopped' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error stopping route' });
    } finally {
        client.release();
    }
});

app.get('/api/driver/eta-status', authenticateToken, requireRole(['driver']), (req, res) => {
    const active = activeDrivers.get(req.user.id);
    if (!active || !active.stops) return res.json({ success: true, etas: [] });
    const etas = active.stops.map((stop) => {
        const distance = (active.latitude && stop.latitude)
            ? kmBetween(active.latitude, active.longitude, stop.latitude, stop.longitude)
            : null;
        return {
            stop_name: stop.name,
            distance_km: distance == null ? '--' : distance.toFixed(2),
            eta_minutes: distance == null ? '--' : Math.max(1, Math.round((distance / 25) * 60))
        };
    });
    res.json({ success: true, etas });
});

app.post('/api/driver/location-eta', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const latitude = Number(req.body.latitude);
        const longitude = Number(req.body.longitude);
        const active = activeDrivers.get(req.user.id);
        if (!active) return res.status(400).json({ success: false, message: 'Start a route first' });
        await client.query(
            'UPDATE shuttles SET current_latitude = $1, current_longitude = $2, status = $3 WHERE id = $4',
            [latitude, longitude, 'active', active.shuttleId]
        );
        activeDrivers.set(req.user.id, { ...active, latitude, longitude, timestamp: Date.now() });
        io.emit('shuttle_location_update', {
            driverId: req.user.id,
            shuttleId: active.shuttleId,
            latitude,
            longitude,
            routeName: active.routeName,
            timestamp: Date.now()
        });
        const alerts = (active.stops || []).filter((stop) => stop.latitude && kmBetween(latitude, longitude, stop.latitude, stop.longitude) <= 0.4)
            .map((stop) => ({
                location: stop.name,
                eta_minutes: 1,
                students_notified: 1
            }));
        res.json({ success: true, alerts_sent: alerts.length, alerts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating location' });
    } finally {
        client.release();
    }
});

app.post('/api/driver/change-password', authenticateToken, requireRole(['driver']), async (req, res) => {
    const client = await pool.connect();
    try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }
        const user = await client.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const matches = await bcrypt.compare(currentPassword || '', user.rows[0].password);
        if (!matches) return res.status(400).json({ success: false, message: 'Current password is wrong' });
        const hashed = await bcrypt.hash(newPassword, 10);
        await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
        res.json({ success: true, message: 'Password changed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const counts = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
                (SELECT COUNT(*) FROM users WHERE role = 'driver') AS drivers,
                (SELECT COUNT(*) FROM shuttles) AS shuttles,
                (SELECT COUNT(*) FROM shuttles WHERE status = 'active') AS active_shuttles,
                (SELECT COUNT(*) FROM trips) AS trips,
                (SELECT COUNT(*) FROM trips WHERE created_at::date = CURRENT_DATE) AS today_trips,
                (SELECT COUNT(*) FROM trips WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS month_trips
        `);
        const row = counts.rows[0];
        res.json({
            success: true,
            stats: {
                totalUsers: Number(row.total_users),
                totalStudents: Number(row.students),
                totalDrivers: Number(row.drivers),
                totalShuttles: Number(row.shuttles),
                activeShuttles: Number(row.active_shuttles),
                todayTrips: Number(row.today_trips),
                monthlyTrips: Number(row.month_trips),
                totalTrips: Number(row.trips)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/all-users', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name, email, phone, role, status, created_at, last_login FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, users: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.post('/api/admin/add-user', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, email, phone, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
        }
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows[0]) return res.status(400).json({ success: false, message: 'Email already exists' });
        const hashed = await bcrypt.hash(password, 10);
        const result = await client.query(
            'INSERT INTO users (name, email, phone, password, role, is_verified) VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, email, role',
            [name, email, phone || null, hashed, role]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not add user' });
    } finally {
        client.release();
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        if (Number(req.params.id) === Number(req.user.id)) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }
        await client.query('DELETE FROM trips WHERE student_id = $1 OR driver_id = $1', [req.params.id]);
        await client.query('UPDATE shuttles SET driver_id = NULL WHERE driver_id = $1', [req.params.id]);
        await client.query('DELETE FROM password_resets WHERE user_id = $1', [req.params.id]);
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not delete user. They may still have messages or friends.' });
    } finally {
        client.release();
    }
});

app.post('/api/admin/shuttles', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const vehicle = req.body.vehicle_number;
        if (!vehicle) return res.status(400).json({ success: false, message: 'Vehicle number is required' });
        const result = await client.query(
            'INSERT INTO shuttles (vehicle_number, model, capacity, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [vehicle, req.body.model || 'Campus bus', req.body.capacity || 14, 'inactive']
        );
        res.json({ success: true, shuttle: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not add shuttle. That number may already exist.' });
    } finally {
        client.release();
    }
});

app.post('/api/admin/assign-driver', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const driver = await client.query(`SELECT id, name FROM users WHERE email = $1 AND role = 'driver'`, [req.body.email]);
        if (!driver.rows[0]) return res.status(404).json({ success: false, message: 'Driver not found' });
        const shuttle = await client.query(
            'UPDATE shuttles SET driver_id = $1 WHERE vehicle_number = $2 RETURNING *',
            [driver.rows[0].id, req.body.vehicle_number]
        );
        if (!shuttle.rows[0]) return res.status(404).json({ success: false, message: 'Shuttle not found' });
        res.json({ success: true, shuttle: shuttle.rows[0], driver: driver.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not assign driver' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/drivers', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT u.id, u.name, u.email, u.phone, u.license_number AS license,
                   string_agg(s.vehicle_number, ', ') AS shuttle,
                   MAX(s.status) AS shuttle_status,
                   (SELECT COUNT(*) FROM trips t WHERE t.driver_id = u.id) AS trips
            FROM users u
            LEFT JOIN shuttles s ON s.driver_id = u.id
            WHERE u.role = 'driver'
            GROUP BY u.id
            ORDER BY u.name
        `);
        res.json({ success: true, drivers: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/driver-locations', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT u.id, u.name, s.vehicle_number AS shuttle, s.status, s.current_latitude, s.current_longitude
            FROM users u
            LEFT JOIN shuttles s ON s.driver_id = u.id
            WHERE u.role = 'driver'
            ORDER BY u.name
        `);
        const drivers = result.rows.map((row) => {
            const live = activeDrivers.get(row.id);
            const lat = live?.latitude || row.current_latitude;
            const lng = live?.longitude || row.current_longitude;
            const online = row.status === 'active' || !!live;
            return {
                id: row.id,
                name: row.name,
                shuttle: row.shuttle || 'Unassigned',
                status: online ? 'online' : 'offline',
                latitude: lat,
                longitude: lng,
                lat: lat ? Math.max(8, Math.min(92, ((Number(lat) - 5.103) / 0.006) * 100)) : 0,
                lng: lng ? Math.max(8, Math.min(92, ((Number(lng) + 1.197) / 0.006) * 100)) : 0,
                speed: live ? 25 : 0,
                lastUpdate: live?.timestamp ? new Date(live.timestamp) : null
            };
        });
        res.json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/trips', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT t.*, su.name AS student_name, du.name AS driver_name, s.vehicle_number
            FROM trips t
            LEFT JOIN users su ON su.id = t.student_id
            LEFT JOIN users du ON du.id = t.driver_id
            LEFT JOIN shuttles s ON s.id = t.shuttle_id
            ORDER BY t.created_at DESC
            LIMIT 100
        `);
        res.json({ success: true, trips: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/report/:type', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const type = req.params.type;
        let lines = [`UCC Shuttle Tracker ${type} report`, `Generated ${new Date().toISOString()}`, ''];
        if (type === 'users') {
            const rows = await client.query('SELECT name, email, role, created_at FROM users ORDER BY created_at DESC');
            lines.push('name,email,role,created_at');
            rows.rows.forEach((r) => lines.push(`${r.name},${r.email},${r.role},${r.created_at.toISOString()}`));
        } else if (type === 'shuttles') {
            const rows = await client.query('SELECT vehicle_number, status, driver_id FROM shuttles ORDER BY vehicle_number');
            lines.push('vehicle,status,driver_id');
            rows.rows.forEach((r) => lines.push(`${r.vehicle_number},${r.status},${r.driver_id || ''}`));
        } else if (type === 'trips' || type === 'revenue') {
            const rows = await client.query('SELECT id, status, fare, pickup_location, destination, created_at FROM trips ORDER BY created_at DESC');
            lines.push('id,status,fare,pickup,destination,created_at');
            rows.rows.forEach((r) => lines.push(`${r.id},${r.status},${r.fare},${r.pickup_location},${r.destination},${r.created_at.toISOString()}`));
        } else {
            return res.status(404).json({ success: false, message: 'Unknown report' });
        }
        res.type('text/plain').send(lines.join('\n'));
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.get('/api/admin/settings', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT key, value FROM system_settings');
        const settings = {};
        result.rows.forEach((row) => { settings[row.key] = row.value; });
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database error' });
    } finally {
        client.release();
    }
});

app.post('/api/admin/settings', authenticateToken, requireRole(['admin']), async (req, res) => {
    const client = await pool.connect();
    try {
        const entries = Object.entries(req.body || {});
        for (const [key, value] of entries) {
            await client.query(
                `INSERT INTO system_settings (key, value) VALUES ($1, $2)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                [key, String(value)]
            );
        }
        res.json({ success: true, message: 'Settings saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not save settings' });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});