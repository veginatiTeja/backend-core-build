const { Worker } = require("bullmq");
const connection = require('../config/redis');
const axios = require("axios");
const crypto = require("crypto");
const deadLetterQueue = require('../queues/deadLetter.queue');
const { v4:uuidv4} = require("uuid");
const logger = require("../config/logger");

const SECRET = "supersecretkey"

const worker = new Worker("webhookQueue", async (job) => {
    try {
          
        logger.info("processing webhook job ", {
            jobId: job.id,
            data: job.data
        });

        const payload = {
            webhookId: uuidv4(),   //idempotency key
            ...job.data
        }
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

        logger.info("✅ Webhook delivered Successfully :", {
            jobId: job.id
        });

    } catch (error) {
        logger.info("❌ Webhook delivery failed ", {
            jobId: job.id,
            error: error.message
        });

        if (error.response) {
            console.log("❌ RESPONSE STATUS:", error.response.status);
            console.log("❌ RESPONSE DATA:", error.response.data);
        };

        if (error.request) {
            console.log("❌ NO RESPONSE RECEIVED");
        };

        //push to DLQ

        await deadLetterQueue.add("failedWebhook", {
            originalJobId: job.id,
            payload: job.data,
            failedReason: error.message,
            failedAt: new Date()
        });

        throw error;
    }
}, { connection });

module.exports = worker;
