exports.up = function(knex) {
  return knex.schema.createTable('trips', table => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('driver_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.integer('shuttle_id').unsigned().references('id').inTable('shuttles').onDelete('SET NULL');
    table.string('pickup_location', 255).notNullable();
    table.string('destination', 255).notNullable();
    table.decimal('fare', 10, 2).defaultTo(0);
    table.integer('passengers').defaultTo(1);
    table.enum('status', ['pending', 'accepted', 'en_route', 'completed', 'cancelled']).defaultTo('pending');
    table.integer('rating');
    table.text('feedback');
    table.timestamp('scheduled_time');
    table.timestamps(true, true);
    
    table.index('student_id');
    table.index('driver_id');
    table.index('status');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('trips');
};
