const express = require("express");
const app = express();
const healthRoute = require('./routes/health.route');
const testRoute = require('./routes/test.route');

app.use(express.json());

app.use('/health',healthRoute);
app.use('/test',testRoute);


app.use((err, req, res, next) => {
  console.error("Error: ",err.message);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

module.exports = app;
