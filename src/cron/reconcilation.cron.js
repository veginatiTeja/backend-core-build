const cron = require("node-cron");
const logger = require("../config/logger");
const { runLedgerReconcilation } = require("../services/reconcilation.service");

/**
 * Ledger Reconciliation Cron Job
 * Runs every hour to verify wallet balances match ledger entries
 * Implemented as cron task to detect data inconsistencies early
 */
cron.schedule("0 * * * *", async () => {
  logger.info("Starting ledger reconciliation job");

  try {
    const result = await runLedgerReconcilation();
    logger.info("Ledger reconciliation completed", { result });
  } catch (error) {
    logger.error("Ledger reconciliation failed", { error: error.message });
    // Don't throw - allow cron to continue on next schedule
  }
});

logger.info("Ledger reconciliation cron scheduled: every hour at :00");

