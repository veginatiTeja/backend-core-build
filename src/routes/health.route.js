const express = require("express");
const router = express.Router();
const healthController = require('../controllers/health.controller.js');

router.get('/', healthController.getHealth);

module.exports = router;