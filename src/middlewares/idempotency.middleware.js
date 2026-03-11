const redis = require("../config/redis");

async function idempotencyMiddleware(req, res, next) {
    
    const key = req.headers["idempotency-key"];

    if(!key) {
        return res.status(400).json({
            status: false,
            message: "Idempotency-Key header is required"
        });
    };

    const cached = await redis.get(key);
    console.log("cached redis key ",cached);

    if(cached) {
        console.log("Duplicate request detected from redis");
        return res.json(JSON.parse(cached));
    }
 
    req.idempotencyKey  = key;
    next();

};

module.exports = idempotencyMiddleware;