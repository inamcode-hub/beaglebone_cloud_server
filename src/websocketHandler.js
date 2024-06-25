// src/websocketHandler.js

const {
  addConnection,
  storeData,
  getConnection,
  removeConnection,
  getAllConnections,
} = require('./connectionManager');
const logger = require('./logger');

const handleMessage = (ws, message) => {
  const parsedMessage = JSON.parse(message);

  switch (parsedMessage.type) {
    case 'DEVICE_HANDSHAKE':
      logger.info(`Handshake received from: ${parsedMessage.serialNumber}`);
      addConnection(parsedMessage.serialNumber, ws);
      break;
    case 'DATA_RESPONSE':
      if (parsedMessage.serialNumber) {
        logger.info(
          `Received data from ${parsedMessage.serialNumber}: ${JSON.stringify(
            parsedMessage.data
          )}`
        );
        storeData(parsedMessage.serialNumber, parsedMessage.data);
      } else {
        logger.warn(
          `Received data from an unknown device: ${JSON.stringify(
            parsedMessage.data
          )}`
        );
      }
      break;
    case 'UPDATE_ACK':
      logger.info(
        `Register ${parsedMessage.registerAddress} updated to ${parsedMessage.newValue} for device ${parsedMessage.serialNumber}`
      );
      break;
    default:
      logger.warn(`Unknown message type: ${parsedMessage.type}`);
  }
};

const sendReadDataRequest = (serialNumber) => {
  const ws = getConnection(serialNumber);
  if (ws) {
    ws.send(JSON.stringify({ type: 'READ_DATA', serialNumber }));
    logger.info(`Read data request sent to device ${serialNumber}`);
  } else {
    logger.error(`No connection found for device ${serialNumber}`);
  }
};

const sendUpdateRegisterRequest = (serialNumber, registerAddress, newValue) => {
  const ws = getConnection(serialNumber);
  if (ws) {
    ws.send(
      JSON.stringify({
        type: 'UPDATE_REGISTER',
        registerAddress,
        newValue,
        serialNumber,
      })
    );
    logger.info(
      `Update register request sent to device ${serialNumber}: register ${registerAddress} to value ${newValue}`
    );
  } else {
    logger.error(`No connection found for device ${serialNumber}`);
  }
};

const handleDisconnection = (ws) => {
  const serialNumber = getSerialNumberByWS(ws);
  if (serialNumber) {
    removeConnection(serialNumber);
    logger.info(`Connection closed for device ${serialNumber}`);
  } else {
    logger.warn('Connection closed for unknown device');
  }
};

const getSerialNumberByWS = (ws) => {
  return Object.keys(getAllConnections()).find(
    (serialNumber) => getConnection(serialNumber) === ws
  );
};

module.exports = {
  handleMessage,
  sendReadDataRequest,
  sendUpdateRegisterRequest,
  handleDisconnection,
};
