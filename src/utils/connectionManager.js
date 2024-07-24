const logger = require('../config/logger');
const MESSAGE_TYPES = require('../websocket/constants/messageTypes'); // Correct import path

let activeConnections = {};
let dataStore = {};
let lastRequestTime = {}; // Track the last request time for each device
const DATA_TTL = 60000; // 1 minute TTL for data
const REQUEST_INTERVAL = 100; // 100 milliseconds interval between requests
const PING_TIMEOUT = 30000; // 30 seconds timeout for PING

const addConnection = (serialNumber, model, ws) => {
  activeConnections[serialNumber] = { model, ws, lastPingTime: Date.now() };
  logger.info(`Connection added for device ${serialNumber}, model: ${model}`);
};

const getConnection = (serialNumber) => activeConnections[serialNumber]?.ws;

const getConnectionModel = (serialNumber) =>
  activeConnections[serialNumber]?.model;

const removeConnection = (serialNumber) => {
  if (activeConnections[serialNumber]) {
    logger.info(`Connection removed for device ${serialNumber}`);
    delete activeConnections[serialNumber];
    delete dataStore[serialNumber]; // also remove stored data
    delete lastRequestTime[serialNumber]; // remove last request time
  }
};

const getAllConnections = () => activeConnections;

const storeData = (serialNumber, data) => {
  const timestamp = Date.now();
  dataStore[serialNumber] = { data, timestamp };
  logger.info(
    `Data stored for device ${serialNumber}: ${JSON.stringify(data)}`
  );
};

const getData = (serialNumber) => {
  const record = dataStore[serialNumber];
  if (record && Date.now() - record.timestamp < DATA_TTL) {
    return record.data;
  } else {
    if (record) {
      logger.info(`Data for device ${serialNumber} expired`);
    }
    delete dataStore[serialNumber];
    return null;
  }
};

const shouldRequestData = (serialNumber) => {
  const lastRequest = lastRequestTime[serialNumber] || 0;
  const now = Date.now();
  if (now - lastRequest >= REQUEST_INTERVAL) {
    lastRequestTime[serialNumber] = now;
    return true;
  }
  return false;
};

const handlePing = (serialNumber, model, ws) => {
  if (serialNumber && model) {
    logger.info(`Received PING from device ${serialNumber} - ${model}`);
    if (activeConnections[serialNumber]) {
      activeConnections[serialNumber].lastPingTime = Date.now(); // Update the lastPingTime
      ws.send(
        JSON.stringify({
          type: MESSAGE_TYPES.PONG,
          data: { serialNumber: serialNumber, model: model },
        })
      );
      logger.info(`Sent PONG to device ${serialNumber} - ${model}`);
    } else {
      logger.warn(`No active connection found for device ${serialNumber}`);
    }
  } else {
    logger.warn('PING message received without valid serial number or model');
  }
};

// Periodic cleanup function
setInterval(() => {
  const now = Date.now();
  for (const serialNumber in dataStore) {
    if (now - dataStore[serialNumber].timestamp >= DATA_TTL) {
      logger.info(`Data for device ${serialNumber} expired and removed`);
      delete dataStore[serialNumber];
    }
  }
  for (const serialNumber in activeConnections) {
    if (now - activeConnections[serialNumber].lastPingTime >= PING_TIMEOUT) {
      logger.warn(
        `No PING received from device ${serialNumber} within timeout period. Removing connection.`
      );
      removeConnection(serialNumber);
    }
  }
}, PING_TIMEOUT / 2); // Run cleanup twice per PING_TIMEOUT duration

module.exports = {
  addConnection,
  getConnection,
  getConnectionModel,
  removeConnection,
  getAllConnections,
  storeData,
  getData,
  shouldRequestData,
  handlePing, // Export handlePing
};
