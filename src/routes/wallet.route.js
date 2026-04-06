const express = require("express");
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { transferLimiter } = require('../middlewares/rateLimit.middleware');
const { authorizeRole } = require('../middlewares/role.middleware');
const  { idempotencyMiddleware }  = require("../middlewares/idempotency.middleware");
const redisTransferLimiter = require("../middlewares/redisRateLimiter.middleware");

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Retrieves the current balance of the authenticated user's wallet.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 balance:
 *                   type: number
 *                   example: 100.50
 *       400:
 *         description: Wallet not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/balance", authenticate, walletController.getBalance);

/**
 * @swagger
 * /api/wallet/deposit:
 *   post:
 *     summary: Deposit money
 *     description: Deposits a specified amount into the authenticated user's wallet.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 50.00
 *     responses:
 *       200:
 *         description: Deposit successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Deposit Successful"
 *                 newBalance:
 *                   type: number
 *                   example: 150.50
 *       400:
 *         description: Invalid deposit amount
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/deposit", authenticate, walletController.deposit);

/**
 * @swagger
 * /api/wallet/transfer:
 *   post:
 *     summary: Transfer money
 *     description: Transfers money from the authenticated user to another user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - amount
 *             properties:
 *               receiverId:
 *                 type: integer
 *                 example: 2
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 25.00
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 # Additional properties from service result
 *       400:
 *         description: Validation error or insufficient funds
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/transfer", authenticate, redisTransferLimiter, idempotencyMiddleware, walletController.transfer);

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get transaction history
 *     description: Retrieves the transaction history for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of transactions to retrieve
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 # Additional properties from service result
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/transactions", authenticate, walletController.getTransactions);

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Withdraw money
 *     description: Initiates a withdrawal request from the authenticated user's wallet.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 30.00
 *     responses:
 *       200:
 *         description: Withdrawal initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 # Additional properties from service result
 *       400:
 *         description: Invalid withdrawal amount or insufficient funds
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/withdraw", authenticate, redisTransferLimiter, idempotencyMiddleware, walletController.withdraw);

/**
 * @swagger
 * /api/wallet/withdraw/process:
 *   post:
 *     summary: Process withdrawal (Admin only)
 *     description: Processes a withdrawal request (approve or reject). Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - approve
 *             properties:
 *               transactionId:
 *                 type: integer
 *                 example: 123
 *               approve:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Withdrawal processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Withdrawal approved"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.post("/withdraw/process", authenticate, authorizeRole("admin"), walletController.processWithdrawal);

module.exports = router;