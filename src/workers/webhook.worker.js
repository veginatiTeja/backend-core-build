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
           `${process.env.WEBHOOK_RECEIVER_URL}`,
            payload,
            {
                headers: {
                    "x-webhook-signature": signature
                },
                timeout: 5000
            }
        );

        logger.info("✅ Webhook delivered successfully", {
            jobId: job.id
        });

    } catch (error) {
        logger.error("❌ Webhook delivery failed", {
            jobId: job.id,
            errorMessage: error.message,
            hasResponse: !!error.response,
            hasRequest: !!error.request,
            responseStatus: error.response?.status,
            responseData: error.response?.data
        });

        // Log detailed error information
        if (error.response) {
            logger.error("HTTP Error Response", {
                status: error.response.status,
                data: error.response.data
            });
        }

        if (error.request && !error.response) {
            logger.error("No response received from webhook endpoint", {
                url: error.config?.url
            });
        }

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
