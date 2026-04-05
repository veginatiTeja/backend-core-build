const express = require("express");
const router = express.Router();
const healthController = require('../controllers/health.controller.js');


router.get('/health', healthController.getHealth);
router.get('/ready', healthController.getReady);

module.exports = router;