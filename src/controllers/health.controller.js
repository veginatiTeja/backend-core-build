exports.getHealth = (req,res) => {
    res.status(200).json({
        status: "OK",
        message: "Backend core app running"
    });
};