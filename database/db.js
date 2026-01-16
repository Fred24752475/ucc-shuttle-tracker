const knex = require('knex');
const knexConfig = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// Initialize Knex connection
const db = knex(config);

// Test connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ PostgreSQL connected successfully');
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection error:', err.message);
    console.log('💡 Make sure PostgreSQL is running and database exists');
  });

module.exports = db;
