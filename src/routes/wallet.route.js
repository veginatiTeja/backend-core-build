const express = require("express");
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middlewares/auth.middleware');


router.get("/balance", authenticate, walletController.getBalance);
router.post("/deposit", authenticate, walletController.deposit);
router.post("/transfer", authenticate, walletController.transfer);
router.get("/transactions", authenticate, walletController.getTransactions);

module.exports = router;