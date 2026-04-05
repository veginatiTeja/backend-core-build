const Redis = require("ioredis");
const logger = require('./logger');

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
});

connection.on("connect", () => {
  logger.info("Redis connected successfully");
});

connection.on("error", (err) => {
  logger.error("Redis error:", err);
});

module.exports = connection;