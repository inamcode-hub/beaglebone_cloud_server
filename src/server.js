const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const routes = require('./routes');
const {
  handleMessage,
  handleDisconnection,
} = require('./websocket/websocketHandler');
const logger = require('./config/logger');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const errorHandler = require('./middlewares/errorHandler');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // Import rate limit

const startServer = () => {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  // Enable trust proxy for rate limiting to correctly identify user IPs
  app.set('trust proxy', true);

  // Apply rate limiting to all requests
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (15 minutes)
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  });

  app.use(cors()); // Enable CORS
  app.use(limiter); // Apply rate limiter
  app.use(express.json({ limit: '10mb' }));
  app.use(loggerMiddleware);
  app.use('/api', routes);
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(errorHandler);

  wss.on('connection', (ws) => {
    logger.info('New WebSocket connection');
    ws.on('message', (message) => {
      handleMessage(ws, message);
    });
    ws.on('close', () => {
      handleDisconnection(ws);
    });
    ws.on('error', (error) => {
      logger.error(`WebSocket error: ${error.message}`);
    });
  });

  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    logger.info(`Server is running on port ${PORT}`);
  });
};

module.exports = startServer;
