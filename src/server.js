require("dotenv").config(); // tells the node load enviornment varibales from .env file
require("./cron/reconcilation.cron");
require('./workers/refund.worker');
require('./workers/webhook.worker');
const app = require('./app');

const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.info("cloud wallet server is hitting ");
    logger.info(`Server running on port ${PORT}`);
});