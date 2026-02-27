const walletService = require("../services/wallet.service");


/**
 * GET /api/wallet/balance
 * GET logged-in user's wallet balance
 */
exports.getBalance = async (req, res, next) => {
    try{
        const { userId } = req.user;
        console.log("getting balance from user id is ",userId);
       const wallet = await walletService.getWalletByUserId(userId);

       if(!wallet) {
        const error = new Error("Wallet not found");
        error.statusCode = 400;
        throw error;
       }

       res.status(200).json({
        success: true,
        balance: wallet.balance
       })

    }
    catch(error) {
        next(error);
    }
}

/**
 * POST /api/wallet/deposit
 * Deposit money into logged-in user's wallet
 */


exports.deposit = async (req, res, next) => {
    try{
        const { amount } = req.body;

        const NumeriAmount = Number(amount);
        //validate amount 
        console.log("deposit balance to user id is ",req.user.userId, "amount is ",amount);

        if(amount === undefined || amount === null || isNaN(NumeriAmount) || NumeriAmount <= 0) {
            const error = new Error("Invalid deposit amount");
            error.statusCode = 400;
            throw error;
        };

        const updateWallet = await walletService.depositMoney(req.user.userId, NumeriAmount);
        console.log("updateWallet status ",updateWallet);

        if(!updateWallet) {
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
    catch(error) {
        next(error);
    }
}