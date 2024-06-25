// src/websocketHandler.js

const {
  addConnection,
  storeData,
  getConnection,
  removeConnection,
  getAllConnections,
} = require('./connectionManager');
const logger = require('./logger');
const emitter = require('./eventEmitter');

const handleMessage = async (ws, message) => {
  const parsedMessage = JSON.parse(message);

  switch (parsedMessage.type) {
    case 'DEVICE_HANDSHAKE':
      logger.info(`Handshake received from: ${parsedMessage.serialNumber}`);
      addConnection(parsedMessage.serialNumber, ws);
      break;
    case 'READ_DATA':
      handleReadData(parsedMessage.serialNumber);
      break;
    case 'UPDATE_REGISTER':
      handleUpdateRegister(parsedMessage);
      break;
    case 'DATA_RESPONSE':
      handleDataResponse(parsedMessage);
      break;
    default:
      logger.warn(`Unknown message type: ${parsedMessage.type}`);
  }
};

const handleReadData = (serialNumber) => {
  const ws = getConnection(serialNumber);
  if (ws) {
    ws.send(JSON.stringify({ type: 'READ_DATA', serialNumber }));
    logger.info(`Read data request sent to device ${serialNumber}`);
  } else {
    logger.error(`No connection found for device ${serialNumber}`);
  }
};

const handleUpdateRegister = (message) => {
  const { serialNumber, registerAddress, newValue } = message;
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

const handleDataResponse = (parsedMessage) => {
  const { serialNumber, data } = parsedMessage;
  if (serialNumber) {
    storeData(serialNumber, data);
    logger.info(
      `Received and stored data for serial number ${serialNumber}: ${JSON.stringify(
        data
      )}`
    );
    emitter.emit('data_received', serialNumber); // Emit event when data is received
  } else {
    logger.warn('Received data without serial number');
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
  handleReadData,
  handleUpdateRegister,
  handleDisconnection,
  sendReadDataRequest: handleReadData,
  sendUpdateRegisterRequest: handleUpdateRegister,
};
