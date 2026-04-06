const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("../config/logger");
const asyncHandler = require("../utils/asyncHandler");
const userService = require("../services/user.service");
const SALT_ROUNDS = 10;

// controller does not write sql , just call the service ,handles http response , passes errors to centalized middle ware

exports.getUsers = asyncHandler(async (req, res, next) => {
  logger.info("Fetching all users");
  const users = await userService.getAllUsers();

  logger.info(`Retrieved ${users.length} users`);
  res.status(200).json({
    success: true,
    data: users
  });
});

exports.addUser = asyncHandler(async (req, res, next) => {
  const { name, email } = req.body;

  logger.info(`Creating new user: ${email}`);
  const user = await userService.createUser(name, email);

  logger.info(`User created successfully: ${user.id}`);
  res.status(201).json({
    success: true,
    data: user
  });
});

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  logger.info(`User registration attempt: ${email}`);

  //Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  //store user
  const user = await userService.registerUser(name, email, passwordHash);

  logger.info(`User registered successfully: ${user.id}`);
  res.status(201).json({
    success: true,
    data: user
  });
});


exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  logger.info(`Login attempt for email: ${email}`);

  //find user
  const user = await userService.findUserByEmail(email);

  if (!user) {
    logger.warn(`Login failed: user not found - ${email}`);
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  //compare password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    logger.warn(`Login failed: invalid password - ${email}`);
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  //Generate JWT
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30m" });

  logger.info(`Login successful for user: ${user.id}`);
  res.status(200).json({
    success: true,
    token
  });
});