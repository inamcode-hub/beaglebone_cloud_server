// index.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const websocketHandler = require('./src/websocketHandler');
const routes = require('./src/routes');
const { handleDisconnection } = require('./src/websocketHandler');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json()); // Middleware to parse JSON bodies

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    websocketHandler.handleMessage(ws, message);
  });

  ws.on('close', () => {
    websocketHandler.handleDisconnection(ws);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error: ${error.message}`);
  });
});

app.use('/', routes);

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
