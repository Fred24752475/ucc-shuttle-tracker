exports.up = function(knex) {
  return knex.schema.createTable('shuttles', table => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('license_plate', 50).notNullable().unique();
    table.integer('capacity').notNullable();
    table.integer('driver_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.enum('status', ['available', 'in_use', 'maintenance', 'offline']).defaultTo('available');
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    table.timestamp('last_updated');
    table.timestamps(true, true);
    
    table.index('driver_id');
    table.index('status');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('shuttles');
};
