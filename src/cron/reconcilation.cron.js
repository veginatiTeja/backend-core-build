const cron = require("node-cron");
const { runLedgerReconcilation } = require("../services/reconcilation.service");


cron.schedule("0 * * * * ", async () => {
  console.log("Running ledger Reconcilation job");

  await runLedgerReconcilation();
});  // Running every hour 

