require("dotenv").config();
const { Worker } = require("bullmq");
const connection = require("../config/redis");
const pool = require("../config/db");
const { addLedgerEntry } = require("../services/ledger.service");
const deadLetterQueue = require("../queues/deadLetter.queue");

console.log("Refund Worker Started...");

const worker = new Worker(
    "refundQueue",
    async (job) => {

        console.log("Worker received job:", job.id, job.data);

        const client = await pool.connect();

        try {

            await client.query("BEGIN");

            const { userId, amount } = job.data;

            console.log("Processing refund for:", userId);

            await client.query(
                `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
                [amount, userId]
            );

            await addLedgerEntry(client, userId, "CREDIT", amount, "withdrawal_refund");

            await client.query("COMMIT");

            console.log("Refund completed for:", userId);
            throw new Error("Testing Retry Mechanism");


        } catch (error) {

            await client.query("ROLLBACK");
            console.log("Refund failed:", error.message);

            throw new Error("Test failure");
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
    console.log("Job completed:", job.id);
});

worker.on("failed", async (job, err) => {
    console.log(`Job ${job.id} failed. Attempt ${job.attemptsMade}`);

    if (job.attemptsMade === job.opts.attempts) {
        console.log("Moving job to Dead Letter Queue");

        await deadLetterQueue.add("failedRefund", {
            jobId: job.id,
            userId: job.data.userId,
            amount: job.data.amount,
            error: err.message
        }) // no need a dead letter queue worker , used for store failed jobs, inverstigate later, manual retry
    };
});

worker.on("error", (err) => {
    console.error("Worker error:", err);
});

module.exports = worker;