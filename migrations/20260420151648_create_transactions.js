/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('transactions', function(table) {
    table.increments('id').primary();
    table.integer('sender_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('amount', 10, 2).notNullable();
    table.string('type').notNullable(); // 'credit' or 'debit'
    table.string('status').notNullable(); // 'pending', 'completed', 'failed'
    table.timestamps(true, true);
  });       
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('transactions');
};
