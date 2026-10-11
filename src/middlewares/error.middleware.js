
const logger = require("../config/logger");

exports.errorMiddleware = (err, req, res, next) => {
    const statusCode = Number.isInteger(err.statusCode)
        && err.statusCode >= 400
        && err.statusCode <= 599
        ? err.statusCode
        : 500;

    logger.error({
        err,
        method: req.method,
        path: req.originalUrl,
        statusCode
    }, "Request failed");

    const message = statusCode >= 500
        ? "Internal Server Error"
        : err.message || "Request failed";

    res.status(statusCode).json({
        success: false,
        message
    });
};
