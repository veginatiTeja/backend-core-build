const { Queue } = require("bullmq");
const connection = require("../config/redis");
const logger = require("../config/logger");

const refundQueue = new Queue("refundQueue", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    }
});

logger.info("Refund Queue initialized");

module.exports = refundQueue;
