// require('dotenv').config();
const { Pool } = require("pg");
const logger = require('./logger');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

pool.connect().then(() => {
    logger.info("PostgreSQL Connected Successfully");
})
.catch((err) => {
    logger.error("DB Connection Error ",err.message);
});


module.exports = pool;

