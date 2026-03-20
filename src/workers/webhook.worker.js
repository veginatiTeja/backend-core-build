const { Worker } = require("bullmq");
const connection = require('../config/redis');
const axios = require("axios");
const crypto = require("crypto");

const SECRET = "supersecretkey"

const worker = new Worker("webhookQueue", async (job) => {
    try {
        console.log("webhook worker receiving the job ", job.id);

        const payload = job.data;
        const body = JSON.stringify(payload);

        const signature = crypto
            .createHmac("sha256", SECRET)
            .update(body)
            .digest("hex");

        const response = await axios.post(
            "http://webhook-receiver:4000/webhook-receiver",
            payload,
            {
                headers: {
                    "x-webhook-signature": signature
                },
                timeout: 5000
            }
        );

        console.log("✅ Webhook delivered:", response.status);

    } catch (error) {
        console.log("❌ ERROR MESSAGE:", error.message);

        if (error.response) {
            console.log("❌ RESPONSE STATUS:", error.response.status);
            console.log("❌ RESPONSE DATA:", error.response.data);
        }

        if (error.request) {
            console.log("❌ NO RESPONSE RECEIVED");
        }

        throw error;
    }
}, { connection });

module.exports = worker;
