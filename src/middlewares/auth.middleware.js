const jwt = require("jsonwebtoken"); //verify tokens and decode token payload

exports.authenticate = (req, res, next) => {  //express middleware
    try {
        const authHeader = req.headers.authorization;     //Authorization: Bearer eyadgf

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header missing"
            });
        };

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "token is missing"
            });
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET);

        //attach user info to request

        req.user = decode;
        
        console.log("user information details ",req.user);

        next();  //Authentication passed, continue to controller
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    };
};


