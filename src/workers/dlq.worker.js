const { Worker } = require('bullmq');
const connection = require('../config/redis');
const logger = require('../config/logger');

/**
 * Dead Letter Queue Worker
 * Processes jobs that have permanently failed after all retries
 * 
 * Features:
 * - Logs detailed failure information
 * - Can be extended to: save to DB, send alerts, retry later, notify admin
 * - Provides forensic data for debugging and auditing
 */
const worker = new Worker("deadLetterQueue", async (job) => {
    logger.error("DLQ Job received - permanent failure", {
        jobId: job.id,
        originalJobId: job.data.originalJobId,
        payload: job.data.payload,
        failureReason: job.data.failedReason,
        attemptsMade: job.data.attemptsMade
    });

    // TODO: Implement failure handling strategies:
    // 1. Save to database for manual review
    // 2. Send alert/email to admin
    // 3. Schedule retry for later
    // 4. Notify monitoring/alerting system
    
    logger.warn("ALERT: Job permanently failed - manual intervention may be required", {
        jobType: job.name,
        jobId: job.id,
        failureReason: job.data.failedReason
    });

    // Example: Save to DB for review
    // await DLQLog.create({
    //   jobId: job.id,
    //   jobType: job.name,
    //   payload: job.data.payload,
    //   failureReason: job.data.failedReason,
    //   createdAt: new Date()
    // });

    return { 
        status: 'logged',
        dlqJobId: job.id,
        timestamp: new Date().toISOString()
    };
}, { connection });

worker.on('completed', (job) => {
    logger.info(`DLQ job processed: ${job.id}`);
});

worker.on('failed', (job, err) => {
    logger.error(`DLQ worker error: ${err.message}`, { jobId: job?.id });
});

module.exports = worker;