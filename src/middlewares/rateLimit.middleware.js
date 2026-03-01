const rateLimit = require("express-rate-limit");

//General API Limiter

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 Minutes
    max: 100, // 100 requests per IP
    message: {
        success: false,
        message: "Too many requests, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});


//Strict transfer limiter

const transferLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 5,   // 5 transfers per minute
    message: {
        success: false,
        message: "Too many transfer attempts. Please wait."
    }
});

module.exports = {
    apiLimiter, transferLimiter
};