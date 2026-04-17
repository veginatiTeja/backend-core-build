const Redis = require("ioredis");
const logger = require('./logger');

// Use REDIS_URL if available (Render provides this), otherwise use individual vars
const redisUrl = process.env.REDIS_URL;
let connectionConfig;

if (redisUrl) {
    connectionConfig = redisUrl;
} else {
    connectionConfig = {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    };
}

const connection = new Redis(connectionConfig, {
    maxRetriesPerRequest: null
});

connection.on("connect", () => {
  logger.info("Redis connected successfully");
});

connection.on("error", (err) => {
  logger.error("Redis error:", err);
});

module.exports = connection;