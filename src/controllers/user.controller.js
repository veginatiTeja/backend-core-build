const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userService = require("../services/user.service");
const SALT_ROUNDS = 10;

// controller does not write sql , just call the service ,handles http response , passes errors to centalized middle ware

exports.getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();

    res.status(200).json({
      success: true,
      data: users
    });
  }
  catch (error) {
    next(error);
  };
};


exports.addUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const user = await userService.createUser(name, email);

    res.status(201).json({
      success: true,
      data: user
    });
  }
  catch (error) {
    next(error)
  };
};

exports.register = async (req, res, next) => {
  try {

    const { name, email, password } = req.body;

    //Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    //store user

    const user = await userService.registerUser(name, email, passwordHash);

    res.status(201).json({
      success: true,
      data: user
    });

  } catch (error) {
   next(error);
  }
};


exports.login = async (req, res, next) => {
  try{
    const {email, password} = req.body;

    //find user

    const user = await userService.findUserByEmail(email);
    console.log("user details in login router ",user);

    if(!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    };

    //compare password


    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    };


    //Generate JWT

    const token = jwt.sign({userId: user.id, role: user.role},process.env.JWT_SECRET,{ expiresIn: "15m"});

    res.status(200).json({
      success: true,
      token
    });

  }
  catch(error) {
   next(error);
  }
}