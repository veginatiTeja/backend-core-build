
const { Queue } = require("bullmq");

const connection = require("../config/redis")
console.log("refund queue file is running")

const refundQueue = new Queue("refundQueue", {
    connection
}); // this creates a queue with queue name refundQueue bullmq connects to redis , queue is ready to accept the jobs, it is just waiting for jobs

module.exports = refundQueue;

