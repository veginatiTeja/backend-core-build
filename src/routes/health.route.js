const express = require("express");
const router = express.Router();
const healthController = require('../controllers/health.controller.js');

/**
 * @swagger
 * /service/health:
 *   get:
 *     summary: Get health status
 *     description: Returns the health status of the service, including uptime and timestamp.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 service:
 *                   type: string
 *                   example: "wallet-api"
 *                 uptime:
 *                   type: number
 *                   example: 123.45
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-10-01T12:00:00.000Z"
 */
router.get('/health', healthController.getHealth);

/**
 * @swagger
 * /service/ready:
 *   get:
 *     summary: Get readiness status
 *     description: Checks the readiness of the service by verifying database and Redis connections.
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ready"
 *                 postgres:
 *                   type: string
 *                   example: "connected"
 *                 redis:
 *                   type: string
 *                   example: "connected"
 *       500:
 *         description: Service is not ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "not ready"
 *                 error:
 *                   type: string
 *                   example: "Connection failed"
 */
router.get('/ready', healthController.getReady);

module.exports = router;