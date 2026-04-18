const express = require("express");
const swaggerUi = require("swagger-ui-express");

const swaggerSpec = require('./config/swagger');
const app = express();
const healthRoute = require('./routes/health.route');
const testRoute = require('./routes/test.route');
const userRoute = require('./routes/user.route');
const walletRoute = require('./routes/wallet.route');
const { errorMiddleware } = require('./middlewares/error.middleware');
const { apiLimiter } = require("./middlewares/rateLimit.middleware");
const queueDashboard = require('./config/queueDashboard');
const requestLogger = require('./middlewares/logger.middleware');
const mcpRoute = require('./routes/mcp.route');

app.use('/mcp', mcpRoute);

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(requestLogger);
app.use(apiLimiter);

app.use('/service', healthRoute);
app.use('/test', testRoute);
app.use('/api/users', userRoute);
app.use('/api/wallet', walletRoute)


app.use('/admin/queues', queueDashboard.getRouter());

app.get("/", (req, res) => {
  res.json({
    message: "Wallet API is running ",
    service: "backend-core-rebuild"
  });
});

// Centralized error middleware - catches all errors passed via next()
app.use((err, req, res, next) => {
  const logger = require('./config/logger');
  logger.error("Unhandled error in request", {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    statusCode: err.statusCode || 500
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

app.use(errorMiddleware);


module.exports = app;
