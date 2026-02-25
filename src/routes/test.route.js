const express = require("express");
const router = express.Router();

const { testAsync } = require('../controllers/test.controller');
const asyncHandler = require('../utils/asyncHandler');


router.get('/',asyncHandler(testAsync));

module.exports = router;