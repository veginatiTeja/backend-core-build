exports.authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    if(!req.user || req.user.role !== requiredRole) {
        return res.status(400).json({
            success: false,
            message: "Access denied: insufficient permissions"
        });
    };
    next();
  };
};
