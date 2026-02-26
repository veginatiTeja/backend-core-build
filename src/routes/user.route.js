const express = require("express");
const router = express.Router();
const userContoller = require('../controllers/user.controller');
const {authenticate} = require("../middlewares/auth.middleware");

//protect route
router.get('/', authenticate, userContoller.getUsers);
router.post('/', userContoller.addUser);

router.post('/register', userContoller.register);
router.post("/login", userContoller.login);

module.exports = router;