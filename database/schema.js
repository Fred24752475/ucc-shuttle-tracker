const pool = require('./postgres');

const createTables = async () => {
    const client = await pool.connect();
    
    try {
        // Drop existing tables in reverse order to avoid foreign key constraints
        await client.query('DROP TABLE IF EXISTS messages CASCADE');
        await client.query('DROP TABLE IF EXISTS conversations CASCADE');
        await client.query('DROP TABLE IF EXISTS friendships CASCADE');
        await client.query('DROP TABLE IF EXISTS password_resets CASCADE');
        await client.query('DROP TABLE IF EXISTS notifications CASCADE');
        await client.query('DROP TABLE IF EXISTS system_settings CASCADE');
        await client.query('DROP TABLE IF EXISTS trips CASCADE');
        await client.query('DROP TABLE IF EXISTS shuttles CASCADE');
        await client.query('DROP TABLE IF EXISTS users CASCADE');

        // Users table
        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'driver', 'admin', 'support')),
                status VARCHAR(20) DEFAULT 'active',
                student_id VARCHAR(50),
                license_number VARCHAR(50),
                is_verified BOOLEAN DEFAULT false,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Shuttles table
        await client.query(`
            CREATE TABLE shuttles (
                id SERIAL PRIMARY KEY,
                driver_id INTEGER REFERENCES users(id),
                vehicle_number VARCHAR(50) UNIQUE NOT NULL,
                model VARCHAR(100),
                capacity INTEGER DEFAULT 14,
                status VARCHAR(20) DEFAULT 'inactive',
                current_latitude DECIMAL(10, 8),
                current_longitude DECIMAL(11, 8),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Trips table
        await client.query(`
            CREATE TABLE trips (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES users(id),
                driver_id INTEGER REFERENCES users(id),
                shuttle_id INTEGER REFERENCES shuttles(id),
                pickup_location TEXT NOT NULL,
                destination TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                fare DECIMAL(10, 2) DEFAULT 10.00,
                rating INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Conversations table
        await client.query(`
            CREATE TABLE conversations (
                id SERIAL PRIMARY KEY,
                participant1_id INTEGER NOT NULL REFERENCES users(id),
                participant2_id INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Messages table
        await client.query(`
            CREATE TABLE messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id),
                sender_id INTEGER NOT NULL REFERENCES users(id),
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Password resets table
        await client.query(`
            CREATE TABLE password_resets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                reset_code VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Friendships table (for friend requests and connections)
        await client.query(`
            CREATE TABLE friendships (
                id SERIAL PRIMARY KEY,
                requester_id INTEGER NOT NULL REFERENCES users(id),
                receiver_id INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(requester_id, receiver_id)
            )
        `);

        console.log('All tables created successfully');
    } catch (error) {
        console.error('Error creating tables:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { createTables };