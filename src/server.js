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

const startServer = () => {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  app.use(cors()); // Enable CORS
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
