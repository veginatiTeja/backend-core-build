/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('webhook_logs', function(table) {
    table.increments('id').primary();
    table.uuid('webhook_id').notNullable();
    table.string('event_type').notNullable();
    table.json('payload').notNullable();
    table.string('status').notNullable(); // 'pending', 'processed', 'failed'
    table.timestamps(true, true);
  });       
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('webhook_logs');       
};
