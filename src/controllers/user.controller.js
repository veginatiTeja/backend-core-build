const userService = require("../services/user.service");

// controller does not write sql , just call the service ,handles http response , passes errors to centalized middle ware

exports.getUsers = async (req,res,next) => {
    try{
      const users = await userService.getAllUsers();

      res.status(200).json({
        success: true,
        data: users
      });
    }
    catch(error) {
      next(error);
    };
};


exports.addUser = async (req,res,next) => {
    try{
       const {name, email} = req.body;

       const user = await userService.createUser(name,email);

       res.status(201).json({
        success: true,
        data: user
       });
    }
    catch(error) {
      next(error)
    };
};