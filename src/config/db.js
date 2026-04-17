// require('dotenv').config();
const { Pool } = require("pg");
const logger = require('./logger');

// Use DATABASE_URL if available (Render provides this), otherwise use individual vars
const databaseUrl = process.env.DATABASE_URL;
let poolConfig;

if (databaseUrl) {
    poolConfig = { connectionString: databaseUrl };
} else {
    poolConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };
}

const pool = new Pool(poolConfig);

// ============================================================================
// CONNECTION RETRY LOGIC
// ============================================================================
// Implements exponential backoff to handle database startup delays
// Particularly useful in Docker Compose where DB may not be ready immediately

const maxRetries = 5;
const initialDelayMs = 2000;
const maxDelayMs = 30000;

async function connectWithRetry(retryCount = 0) {
    try {
        const client = await pool.connect();
        client.release();
        logger.info("PostgreSQL Connected Successfully");
        return true;
    } catch (err) {
        if (retryCount < maxRetries) {
            const delayMs = Math.min(
                initialDelayMs * Math.pow(2, retryCount),
                maxDelayMs
            );
            logger.warn(
                `DB Connection failed (attempt ${retryCount + 1}/${maxRetries}), ` +
                `retrying in ${delayMs / 1000}s: ${err.message}`
            );
            
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return connectWithRetry(retryCount + 1);
        } else {
            logger.error(
                `DB Connection failed after ${maxRetries} attempts: ${err.message}. ` +
                `Please check PostgreSQL is running and credentials are correct.`
            );
            // Don't exit process, allow graceful failure handling
            return false;
        }
    }
}

// Start connection retry on module load
connectWithRetry().catch(err => {
    logger.error("Fatal: Could not establish database connection", { error: err.message });
});

module.exports = pool;

