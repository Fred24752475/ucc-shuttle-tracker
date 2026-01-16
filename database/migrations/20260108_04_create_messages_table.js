exports.up = function(knex) {
  return knex.schema.createTable('messages', table => {
    table.increments('id').primary();
    table.integer('sender_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('recipient_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('message').notNullable();
    table.boolean('read').defaultTo(false);
    table.timestamps(true, true);
    
    table.index('sender_id');
    table.index('recipient_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('messages');
};
