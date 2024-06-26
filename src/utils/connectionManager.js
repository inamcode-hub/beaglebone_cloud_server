const logger = require('../config/logger');

let activeConnections = {};
let dataStore = {};
let lastRequestTime = {}; // Track the last request time for each device
const DATA_TTL = 60000; // 1 minute TTL for data
const REQUEST_INTERVAL = 5000; // 5 seconds interval between requests

const addConnection = (serialNumber, ws) => {
  activeConnections[serialNumber] = ws;
  logger.info(`Connection added for device ${serialNumber}`);
};

const getConnection = (serialNumber) => activeConnections[serialNumber];

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
  shouldRequestData,
};
