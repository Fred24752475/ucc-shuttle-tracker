const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Delete existing entries
  await knex('users').del();
  
  // Insert sample users
  const users = [
    {
      name: 'Admin User',
      email: 'admin@ucc.edu.gh',
      password: await bcrypt.hash('Admin123!', 10),
      phone: '+233123456789',
      role: 'admin',
      language_preference: 'en'
    },
    {
      name: 'Kwame Student',
      email: 'kwame.student@ucc.edu.gh',
      password: await bcrypt.hash('Student123!', 10),
      phone: '+233555666777',
      role: 'student',
      language_preference: 'en'
    },
    {
      name: 'Kofi Driver',
      email: 'kofi.driver@ucc.edu.gh',
      password: await bcrypt.hash('Driver123!', 10),
      phone: '+233987654321',
      role: 'driver',
      language_preference: 'tw'
    },
    {
      name: 'Support Agent',
      email: 'support@ucc.edu.gh',
      password: await bcrypt.hash('Support123!', 10),
      phone: '+233123456788',
      role: 'support',
      language_preference: 'en'
    }
  ];
  
  await knex('users').insert(users);
  console.log('✅ Sample users created');
};
