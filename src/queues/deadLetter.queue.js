const { Queue } = require("bullmq");
const connection = require("../config/redis");

console.log("Dead letter queue is running ");

const deadLetterQueue = new Queue("deadLetterQueue", {
    connection
});

module.exports = deadLetterQueue;