const { Queue } = require("bullmq");
const connection = require("../config/redis");
const logger = require("../config/logger");

const deadLetterQueue = new Queue("deadLetterQueue", {
    connection
});

logger.info("Dead Letter Queue initialized");

module.exports = deadLetterQueue;