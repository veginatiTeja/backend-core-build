const { Worker } = require("bullmq");
const connection = require('../config/redis');
const axios = require("axios");
const crypto = require("crypto");

const SECRET = "supersecretkey"

const worker = new Worker("webhookQueue", async (job) => {

    console.log("webhook worker receiving the job ", job.id);
    const payload = job.data;
    const body = JSON.stringify(payload);

    const signature = crypto.createHmac("sha256", SECRET).update(body).digest("hex")

    await axios.post("http://localhost:4000/webhook-receiver", payload, {
        headers: {
            "x-webhook-signature": signature
        }
    });
    console.log("Webhook delivered with signature");
}, { connection });

module.exports = worker;
