const { RateLimiterRedis } = require("rate-limiter-flexible");
const redis = require("../config/redis");

const transferLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "transfer_limit",
    points: 5,  // 5 requests
    duration: 60,  // 60 seconds
});

const redisTransferLimiter = async (req, res, next) => {
    try{
        console.log("redis translimiter checkig user requests limit");
       const userId = req.user?.userId || req.ip;

       await transferLimiter.consume(userId);
       next();
    }
    catch(error) {
     return res.status(429).json({
        success: false,
        message: "Too many transfer attempts. Please try again later."
     });
    };
};


module.exports = redisTransferLimiter;

