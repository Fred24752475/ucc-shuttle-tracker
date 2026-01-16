const pool = require('./postgres');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    const client = await pool.connect();
    
    try {
        // Check if data already exists
        const existingUsers = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(existingUsers.rows[0].count) > 0) {
            console.log('Database already seeded');
            return;
        }

        // Create default users
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        // Admin user
        await client.query(`
            INSERT INTO users (name, email, password, phone, role, is_verified) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `, ['Admin User', 'admin@ucc.edu.gh', hashedPassword, '+233123456789', 'admin', true]);

        // Support user
        await client.query(`
            INSERT INTO users (name, email, password, phone, role, is_verified) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `, ['Support Team', 'support@ucc.edu.gh', hashedPassword, '+233123456790', 'support', true]);

        // Driver users
        await client.query(`
            INSERT INTO users (name, email, password, phone, role, license_number, is_verified) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['Kofi Driver', 'kofi.driver@ucc.edu.gh', hashedPassword, '+233123456791', 'driver', 'DL123456', true]);

        // Student users
        await client.query(`
            INSERT INTO users (name, email, password, phone, role, student_id, is_verified) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['Kwame Student', 'kwame.student@ucc.edu.gh', hashedPassword, '+233123456793', 'student', 'UCC2024001', true]);

        // Create shuttles
        await client.query(`
            INSERT INTO shuttles (driver_id, vehicle_number, model, capacity, status) 
            VALUES ($1, $2, $3, $4, $5)
        `, [3, 'UCC-001', 'Toyota Hiace', 14, 'active']);

        console.log('Database seeded successfully');
    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { seedData };