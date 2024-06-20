const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const {
  handleMessage,
  sendReadDataRequest,
  sendUpdateRegisterRequest,
} = require('./websocketServer');

const app = express();
const port = process.env.PORT || 8080;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    handleMessage(ws, message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error: ${error.message}`);
  });

  // Example of sending a read data request after connection
  setTimeout(() => {
    sendReadDataRequest(ws);
  }, 5000);

  // Example of sending an update register request after connection
  // setTimeout(() => {
  //   sendUpdateRegisterRequest(ws, 10, 42); // Update register 10 to value 42
  // }, 10000);
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
