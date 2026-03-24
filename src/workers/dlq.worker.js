const { Worker } = require('bullmq');
const connection = require('../config/redis');


const worker = new Worker("deadLetterQueue", async (job) => {

    console.log("DLQ JOB RECEIVED");

    console.log("Original Job:", job.data.originalJobId);
    console.log("Payload:", job.data.payload);
    console.log("Error:", job.data.failedReason);

    // Here we can:
    // 1. Save to DB
    // 2. Send alert
    // 3. Retry later
    // 4. notify admin

    console.log("ALERT: webhook permanently failed");
}, {connection});