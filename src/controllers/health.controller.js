
const logger = require('../config/logger.js');
const pool = require("../config/db");
const connection = require('../config/redis');


exports.getHealth = (req, res) => {
    logger.info("Health check called");

    res.status(200).json({
        status: "ok",
        service: "wallet-api",
        uptime: process.uptime(),
        timestamp: new Date()
    });
};


exports.getReady = async (req, res) => {
    try {
        //check postgres
        await pool.query("SELECT 1");

        //Check redis
        await connection.ping();

        logger.info("Readiness check passed");

        res.json({
            status: "ready",
            postgres: "connected",
            redis: "connected"
        });

    }
    catch (error) {
      logger.error("Readiness failed: ",error);

      res.status(500).json({
       status:"not ready", 
       error: error.message
      });
    }
};
