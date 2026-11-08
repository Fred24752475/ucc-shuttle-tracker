const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
// Supabase (and Render) require SSL even when NODE_ENV is not production.
const isLocal = !connectionString || /localhost|127\.0\.0\.1/.test(connectionString);
const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('The database could not be reached');
    } else {
        console.log('Connected to PostgreSQL database');
        release();
    }
});

module.exports = pool;