/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('idempotency_keys', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('idempotency_key').notNullable().unique();
    table.jsonb('response').notNullable();
    table.timestamps(true, true);});
};

/**
 * @param { import("knex").Knex } knex  
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('idempotency_keys');
};

