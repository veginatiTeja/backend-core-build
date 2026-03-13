const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const webhookQueue = require("../queues/webhook.queue");
const refundQueue = require("../queues/refund.queue");

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

console.log("bullmq dashboard is opening in browser")
createBullBoard({
    queues: [
        new BullMQAdapter(webhookQueue),
        new BullMQAdapter(refundQueue)
    ],
    serverAdapter
});

module.exports = serverAdapter;