// src/connectionManager.js

const logger = require('./logger');

let activeConnections = {};
let dataStore = {};
const DATA_TTL = 60000; // 1 minute TTL for example

const addConnection = (serialNumber, ws) => {
  activeConnections[serialNumber] = ws;
  logger.info(`Connection added for device ${serialNumber}`);
};

const getConnection = (serialNumber) => {
  return activeConnections[serialNumber];
};

const removeConnection = (serialNumber) => {
  if (activeConnections[serialNumber]) {
    logger.info(`Connection removed for device ${serialNumber}`);
    delete activeConnections[serialNumber];
    delete dataStore[serialNumber]; // also remove stored data
  }
};

const getAllConnections = () => {
  return activeConnections;
};

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

// Periodic cleanup function
setInterval(() => {
  const now = Date.now();
  for (const serialNumber in dataStore) {
    if (now - dataStore[serialNumber].timestamp >= DATA_TTL) {
      logger.info(`Data for device ${serialNumber} expired and removed`);
      delete dataStore[serialNumber];
    }
  }
}, DATA_TTL / 2); // Run cleanup twice per TTL duration

module.exports = {
  addConnection,
  getConnection,
  removeConnection,
  getAllConnections,
  storeData,
  getData,
};
