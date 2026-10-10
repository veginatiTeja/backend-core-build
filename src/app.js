const express = require("express");
const app = express(); // app.js file is actual express application that receives incoming requests and sends responses. It is the main entry point for the application and is responsible for setting up middleware, routes, and other configurations.

const swaggerUi = require("swagger-ui-express");

const swaggerSpec = require('./config/swagger');
const healthRoute = require('./routes/health.route');
const testRoute = require('./routes/test.route');
const userRoute = require('./routes/user.route');
const walletRoute = require('./routes/wallet.route');
const { errorMiddleware } = require('./middlewares/error.middleware');
const { apiLimiter } = require("./middlewares/rateLimit.middleware");
const queueDashboard = require('./config/queueDashboard');
const requestLogger = require('./middlewares/logger.middleware');
const mcpRoute = require('./routes/mcp.route');
app.set("trust proxy", 1); // trust first proxy, this is important when the app is behind a reverse proxy (like Nginx or Heroku) to ensure that the app correctly identifies the client's IP address and other relevant information. It helps in scenarios where the app needs to know the original request details, such as for logging, rate limiting, or security purposes.

app.use('/mcp', mcpRoute);
app.use(express.json()); // This is json middleware is used to parse incoming requests with JSON payloads. It allows the application to automatically parse the body of incoming requests that have a Content-Type of application/json, making it easier to access the data sent by clients in the request body.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(requestLogger);
app.use(apiLimiter); //This middleware is used to limit the number of requests a client can make to the server within a certain time frame. It helps prevent abuse and ensures fair usage of the API by restricting excessive requests from a single client, which can help protect the server from being overwhelmed and improve overall performance and security.

app.use('/service', healthRoute);
app.use('/test', testRoute);
app.use('/api/users', userRoute);  // This line mounts the userRoute on the /api/users path, meaning that any requests to /api/users will be handled by the userRoute. The userRoute is responsible for handling user-related operations such as fetching users, adding a new user, registering a user, and logging in a user.
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
