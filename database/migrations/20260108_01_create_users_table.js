exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password', 255).notNullable();
    table.string('phone', 20);
    table.enum('role', ['student', 'driver', 'admin', 'support']).notNullable().defaultTo('student');
    table.string('language_preference', 10).defaultTo('en');
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret', 255);
    table.timestamp('last_login');
    table.timestamps(true, true);
    
    table.index('email');
    table.index('role');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
