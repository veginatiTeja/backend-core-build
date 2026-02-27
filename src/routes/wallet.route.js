const express = require("express");
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middlewares/auth.middleware');


router.get("/balance", authenticate, walletController.getBalance);
router.post("/deposit", authenticate, walletController.deposit);


module.exports = router;