const { Queue } = require("bullmq");
const connection = require("../config/redis");

const webhookQueue = new Queue("webhookQueue", {
   connection
});

module.exports = webhookQueue;