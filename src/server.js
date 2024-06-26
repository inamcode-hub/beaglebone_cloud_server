const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const routes = require('./routes');
const {
  handleMessage,
  handleDisconnection,
} = require('./websocket/websocketHandler');
const logger = require('./config/logger');

const startServer = () => {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  app.use(express.json());
  app.use('/api', routes);

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

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
};

module.exports = startServer;
