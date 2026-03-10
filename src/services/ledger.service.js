const pool = require('../config/db');

async function addLedgerEntry(client, user_id, type, amount, reference) {
    
    await client.query(`INSERT INTO ledger_entries (user_id, entry_type, amount, reference) VALUES ($1, $2, $3, $4)`,[user_id, type, amount, reference]);
 

};  // this function records all money movements


module.exports = { addLedgerEntry }