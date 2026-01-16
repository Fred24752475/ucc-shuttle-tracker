exports.up = function(knex) {
  return knex.schema.createTable('password_resets', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reset_code', 10).notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('used').defaultTo(false);
    table.timestamps(true, true);
    
    table.index('user_id');
    table.index('reset_code');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('password_resets');
};
