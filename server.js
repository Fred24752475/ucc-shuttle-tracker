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
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "http://ucc-shuttle-tracker.onrender.com", "https://ucc-shuttle-tracker.onrender.com"],
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