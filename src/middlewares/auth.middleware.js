const jwt = require("jsonwebtoken");
const logger = require("../config/logger");

exports.authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            logger.warn("Authorization header missing");
            return res.status(401).json({
                success: false,
                message: "Authorization header missing"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            logger.warn("Token is missing from authorization header");
            return res.status(401).json({
                success: false,
                message: "token is missing"
            });
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request
        req.user = decode;
        
        logger.debug(`Authentication successful for user: ${decode.userId}`);

        next();  // Authentication passed, continue to controller
    }
    catch (error) {
        logger.error(`Authentication failed: ${error.message}`);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    };
};


