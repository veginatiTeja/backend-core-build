const pool = require("../config/db");
const logger = require("../config/logger");

async function runLedgerReconcilation() {
    const client = await pool.connect();
    
    try {
        logger.info("Starting ledger reconciliation");
        
        const users = await client.query(`SELECT user_id, balance from wallets`);

        if (users && Array.isArray(users.rows)) {
            let mismatches = 0;
            
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

                if (Number(wallet.balance) !== Number(ledger_balance)) {
                    mismatches++;
                    logger.error("Ledger mismatch detected", {
                        userId: wallet.user_id,
                        walletBalance: wallet.balance,
                        ledgerBalance: ledger_balance,
                        difference: Number(wallet.balance) - Number(ledger_balance)
                    });
                }
            }

            logger.info(`Ledger reconciliation completed`, {
                totalWallets: users.rows.length,
                mismatches: mismatches
            });
        }
    }
    catch (error) {
        logger.error(`Reconciliation error: ${error.message}`, { error });
        throw error;
    }
    finally {
        client.release();
    }
}

module.exports = { runLedgerReconcilation };