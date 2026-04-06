const walletService = require("../services/wallet.service");
const redis = require('../config/redis');
const logger = require('../config/logger');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/wallet/balance
 * GET logged-in user's wallet balance
 */
exports.getBalance = asyncHandler(async (req, res, next) => {
    const { userId } = req.user;
    logger.info(`Fetching wallet balance for user: ${userId}`);
    
    const wallet = await walletService.getWalletByUserId(userId);

    if (!wallet) {
        const error = new Error("Wallet not found");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Balance retrieved for user ${userId}: ${wallet.balance}`);
    res.status(200).json({
        success: true,
        balance: wallet.balance
    });
});

/**
 * POST /api/wallet/deposit
 * Deposit money into logged-in user's wallet
 */
exports.deposit = asyncHandler(async (req, res, next) => {
    const { amount } = req.body;
    const { userId } = req.user;

    const NumeriAmount = Number(amount);
    
    logger.info(`Deposit request from user ${userId}: amount ${amount}`);

    // Validate amount 
    if (amount === undefined || amount === null || isNaN(NumeriAmount) || NumeriAmount <= 0) {
        const error = new Error("Invalid deposit amount");
        error.statusCode = 400;
        throw error;
    }

    const updateWallet = await walletService.depositMoney(userId, NumeriAmount);

    if (!updateWallet) {
        const error = new Error("Wallet not found");
        error.statusCode = 400;
        throw error;
    }

    logger.info(`Deposit successful for user ${userId}, new balance: ${updateWallet.balance}`);
    res.status(200).json({
        success: true,
        message: "Deposit Successful",
        newBalance: updateWallet.balance,
    });
});


/**
 * POST /api/wallet/transfer
 * Transfer money between two logged in users
 */

exports.transfer = asyncHandler(async (req, res, next) => {
    const idempotencyKey = req.idempotencyKey;
    const senderId = req.user.userId;
    let { receiverId, amount } = req.body;

    logger.info(`Transfer initiated`, {
        senderId,
        receiverId,
        amount,
        idempotencyKey
    });

    // ✅ Basic validation
    if (!receiverId || amount === undefined) {
        return res.status(400).json({
            success: false,
            message: "receiverId and amount are required"
        });
    }

    // Convert safely
    receiverId = Number(receiverId);
    amount = Number(amount);

    if (isNaN(receiverId) || isNaN(amount)) {
        return res.status(400).json({
            success: false,
            message: "receiverId and amount must be valid numbers"
        });
    }

    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Amount must be greater than 0"
        });
    }

    // ✅ Call service
    const result = await walletService.transferMoney(
        senderId,
        receiverId,
        amount,
        idempotencyKey
    );

    const response = {
        success: true,
        ...result
    };

    //store response in redis
    await redis.set(
        idempotencyKey,
        JSON.stringify(response),
        "EX",
        3600
    );

    logger.info(`Transfer successful`, { senderId, receiverId, amount });
    return res.status(200).json(response);
});

exports.getTransactions = asyncHandler(async (req, res, next) => {
    const userId = req.user.userId;
    const cursor = req.query.cursor;
    const limit = req.query.limit || 10;

    logger.info(`Fetching transactions for user: ${userId}`, { cursor, limit });

    const result = await walletService.getTransactions(userId, cursor, limit);

    res.status(200).json({
        success: true,
        ...result
    });
});

exports.withdraw = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const amount = req.body.amount;
        const idempotencyKey = req.idempotencyKey;

        const numericAmount = Number(amount);

        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal amount"
            });
        }


        const result = await walletService.withDrawMoney(userId, numericAmount, idempotencyKey);

        const response = {
            success: true,
            ...result
        }

        // store response in redis

        await redis.set(
            idempotencyKey,
            JSON.stringify(response),
            "EX",
            3600
        );

        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
}

exports.processWithdrawal = async (req, res, next) => {
    try {

        const { transactionId, approve } = req.body;

        const result = await walletService.processWithdrawal(transactionId, approve);

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        next(error);
    }
}