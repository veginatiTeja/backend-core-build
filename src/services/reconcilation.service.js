const pool = require("../config/db");

async function runLedgerReconcilation() {

    const client = await pool.connect();
    try {
        const users = await client.query(`SELECT user_id, balance from wallets`);
        console.log("running reconcilation cron query result iss " + JSON.stringify(users));

        if (users && Array.isArray(users)) {
            for (const wallet of users.rows) {
                const ledgerResult = await client.query(`
                SELECT
                COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount END), 0) 
                -
                COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount END), 0)
                AS ledger_balance
                FROM ledger_entries
                WHERE user_id = $1
                `, [wallet.user_id]);

                const ledger_balance = ledgerResult.rows[0].ledger_balance;


                if(Number(wallet.balance) !== Number(ledger_balance)) {
                    console.error("Ledger mismatch detected ", {
                        userId: wallet.user_id,
                        walletBalance: wallet.balance,
                        ledgerBalance: ledger_balance
                    })
                }

            }
        };

        console.log("ledger reconcilation is completed");
    }
    catch (error) {
      console.error("Reconcilation error: ",error);
    }
    finally {
        client.release();
    }
};

module.exports = { runLedgerReconcilation}