const express = require("express");
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { transferLimiter } = require('../middlewares/rateLimit.middleware');
const { authorizeRole } = require('../middlewares/role.middleware');


router.get("/balance", authenticate, walletController.getBalance);
router.post("/deposit", authenticate, walletController.deposit);
router.post("/transfer", transferLimiter,  authenticate, walletController.transfer);
router.get("/transactions", authenticate, walletController.getTransactions);
router.post("/withdraw", transferLimiter, authenticate, walletController.withdraw);
router.post("/withdraw/process", authenticate, authorizeRole("admin"), walletController.processWithdrawal);

module.exports = router;