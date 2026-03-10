const walletService = require("../services/wallet.service");


/**
 * GET /api/wallet/balance
 * GET logged-in user's wallet balance
 */
exports.getBalance = async (req, res, next) => {
    try {
        const { userId } = req.user;
        console.log("getting balance from user id is ", userId);
        const wallet = await walletService.getWalletByUserId(userId);

        if (!wallet) {
            const error = new Error("Wallet not found");
            error.statusCode = 400;
            throw error;
        }

        res.status(200).json({
            success: true,
            balance: wallet.balance
        })

    }
    catch (error) {
        next(error);
    }
}

/**
 * POST /api/wallet/deposit
 * Deposit money into logged-in user's wallet
 */


exports.deposit = async (req, res, next) => {
    try {
        const { amount } = req.body;

        const NumeriAmount = Number(amount);
        //validate amount 
        console.log("deposit balance to user id is ", req.user.userId, "amount is ", amount);

        if (amount === undefined || amount === null || isNaN(NumeriAmount) || NumeriAmount <= 0) {
            const error = new Error("Invalid deposit amount");
            error.statusCode = 400;
            throw error;
        };

        const updateWallet = await walletService.depositMoney(req.user.userId, NumeriAmount);
        console.log("updateWallet status ", updateWallet);

        if (!updateWallet) {
            const error = new Error("Wallet not found");
            error.statusCode = 400;
            throw error;
        };

        res.status(200).json({
            success: true,
            message: "Deposit Successful",
            newBalance: updateWallet.balance,
        });
    }
    catch (error) {
        next(error);
    }
}


/**
 * POST /api/wallet/transfer
 * Transfer money between two logged in users
 */

exports.transfer = async (req, res, next) => {
    try {

        const idempotencyKey = req.headers["idempotency-key"];

        if (!idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Idempotency-Key header is required"
            });
        };

        const senderId = req.user.userId;
        let { receiverId, amount } = req.body;

        console.log(
            "Sender:", senderId,
            "Receiver:", receiverId,
            "Amount:", amount,
            "idempotency-key: ", idempotencyKey
        );

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

        return res.status(200).json({
            success: true,
            message: result.message,
            senderBalance: result.senderBalance,
            receiverBalance: result.receiverBalance
        });

    } catch (error) {
        next(error);
    }
};

exports.getTransactions = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        // const page = Number(req.query.page) || 1;
        // const limit = Number(req.query.limit) || 10;
        const cursor = req.query.cursor;
        const limit = req.query.limit || 10;

        const result = await walletService.getTransactions(userId, cursor, limit);

        res.status(200).json({
            success: true,
            ...result
        });

    } catch (error) {
        next(error);
    }
};

exports.withdraw = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const amount = req.body.amount;
        const idempotencyKey = req.headers["idempotency-key"];

        if (!idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Idempotency-Key header is required"
            });
        };

        const numericAmount = Number(amount);

        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal amount"
            });
        }


        const result = await walletService.withDrawMoney(userId, numericAmount, idempotencyKey);

        return res.status(200).json({
            success: true,
            result
        });
    }
    catch (error) {
        next(error);
    }
}

exports.processWithdrawal = async (req, res, next) => {
    try{

        const { transactionId, approve} = req.body;

        const result = await walletService.processWithdrawal(transactionId, approve);

        res.status(200).json({
            success: true,
            message: result.message
        });

    }catch(error) {
        next(error);
    }
}