require("dotenv").config(); 
const { Worker } = require("bullmq");
const connection = require("../config/redis");
const logger = require("../config/logger");
const pool = require("../config/db");
const { addLedgerEntry } = require("../services/ledger.service");
const deadLetterQueue = require("../queues/deadLetter.queue");

logger.info("Refund Worker initialized");

const worker = new Worker(
    "refundQueue",
    async (job) => {
        logger.info(`Processing refund job: ${job.id}`, { data: job.data });

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const { userId, amount } = job.data;

            logger.info(`Refunding user ${userId}: amount ${amount}`);

            await client.query(
                `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
                [amount, userId]
            );

            await addLedgerEntry(client, userId, "CREDIT", amount, "withdrawal_refund");

            await client.query("COMMIT");

            logger.info(`Refund completed successfully: job=${job.id}, user=${userId}`);


        } catch (error) {
            await client.query("ROLLBACK");
            logger.error(`Refund failed: job=${job.id}`, { error: error.message, userId: job.data.userId });

            throw error;
        } finally {
            client.release();
        }
    },
    {
        connection,
        concurrency: 5
    }
);

worker.on("completed", (job) => {
    logger.info(`Refund job completed: ${job.id}`);
});

worker.on("failed", async (job, err) => {
    logger.warn(`Refund job failed: ${job.id}, attempt ${job.attemptsMade}/${job.opts.attempts}`, { error: err.message });

    if (job.attemptsMade === job.opts.attempts) {
        logger.error(`Refund job permanently failed, moving to DLQ: ${job.id}`);

        await deadLetterQueue.add("failedRefund", {
            jobId: job.id,
            userId: job.data.userId,
            amount: job.data.amount,
            error: err.message
        });
    }
});

worker.on("error", (err) => {
    logger.error(`Refund worker encountered error: ${err.message}`);
});

module.exports = worker;