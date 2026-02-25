const express = require("express");
const router = express.Router();
const userContoller = require('../controllers/user.controller');

router.get('/', userContoller.getUsers);
router.post('/', userContoller.addUser);

module.exports = router;