require("dotenv").config();
const { Worker } = require("bullmq");
const connection = require("../config/redis");
const pool = require("../config/db");
const { addLedgerEntry } = require("../services/ledger.service");

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

        } catch (error) {

            await client.query("ROLLBACK");
            console.error("Refund failed:", error);

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

worker.on("completed", job => {
    console.log("Job completed:", job.id);
});

worker.on("failed", (job, err) => {
    console.log("Job failed:", err.message);
});

worker.on("error", (err) => {
    console.error("Worker error:", err);
});

module.exports = worker;