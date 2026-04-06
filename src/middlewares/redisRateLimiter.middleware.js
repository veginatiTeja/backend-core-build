const { RateLimiterRedis } = require("rate-limiter-flexible");
const redis = require("../config/redis");
const logger = require("../config/logger");

const transferLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "transfer_limit",
    points: 5,  // 5 requests
    duration: 60,  // 60 seconds
});

const redisTransferLimiter = async (req, res, next) => {
    try {
        const userId = req.user?.userId || req.ip;

        logger.debug(`Checking transfer rate limit for user: ${userId}`);
        await transferLimiter.consume(userId);
        
        next();
    }
    catch (error) {
        logger.warn(`Rate limit exceeded for user: ${req.user?.userId || req.ip}`);
        return res.status(429).json({
            success: false,
            message: "Too many transfer attempts. Please try again later."
        });
    }
};


module.exports = redisTransferLimiter;

