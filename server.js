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
const { createTables } = require('./database/schema');
const { seedData } = require('./database/seed');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Initialize database
(async () => {
    try {
        console.log('Attempting database connection...');
        await createTables();
        console.log('Tables created successfully');
        await seedData();
        console.log('Database seeded successfully');
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
            fontSrc: ["'self'", "https://fonts.gstatic.com"]
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

app.get('/api/student/profile', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name, email, phone, role, student_id FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json({ success: true, user: result.rows[0] });
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
        
        // Mark driver as active
        activeDrivers.set(req.user.id, {
            shuttleId: shuttle.id,
            latitude: null,
            longitude: null,
            timestamp: Date.now(),
            routeName: route_name || 'Campus Route'
        });
        
        res.json({
            success: true,
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
        
        // Remove from active drivers
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
                lastUpdate: driverData?.timestamp || null
            };
        });
        
        res.json({
            success: true,
            shuttles: shuttles,
            count: shuttles.length
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});