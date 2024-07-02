const {
  addConnection,
  storeData,
  getConnection,
  removeConnection,
  getAllConnections,
} = require('../utils/connectionManager');
const logger = require('../config/logger');
const emitter = require('../utils/eventEmitter');

const handleMessage = async (ws, message) => {
  const parsedMessage = JSON.parse(message);

  switch (parsedMessage.type) {
    case 'DEVICE_CONNECT':
      console.log(parsedMessage);
      if (parsedMessage.data.serialNumber) {
        logger.info(`Device connected: ${parsedMessage.data.serialNumber}`);
        addConnection(parsedMessage.data.serialNumber, ws);
      } else {
        logger.warn('Device connect message received without serial number');
      }
      break;
    case 'REQUEST_SENSOR_DATA':
      requestSensorData(parsedMessage.data.serialNumber);
      break;
    case 'UPDATE_DEVICE_SETTINGS':
      updateDeviceSettings(parsedMessage);
      break;
    case 'SENSOR_DATA_RESPONSE':
      processSensorDataResponse(parsedMessage);
      break;
    case 'DEVICE_SETTINGS_UPDATE_ACK':
      processDeviceSettingsUpdateAck(parsedMessage);
      break;
    case 'DEVICE_DISCONNECT':
      handleDeviceDisconnection(parsedMessage.data.serialNumber);
      break;
    default:
      logger.warn(`Unknown message type: ${parsedMessage.type}`);
  }
};

const requestSensorData = (serialNumber) => {
  const ws = getConnection(serialNumber);
  if (ws) {
    ws.send(JSON.stringify({ type: 'REQUEST_SENSOR_DATA', serialNumber }));
    logger.info(`Data request sent to device ${serialNumber}`);
  } else {
    logger.error(`No connection found for device ${serialNumber}`);
  }
};

const updateDeviceSettings = (message) => {
  const { serialNumber, registerAddress, newValue } = message;
  const ws = getConnection(serialNumber);
  if (ws) {
    ws.send(
      JSON.stringify({
        type: 'UPDATE_DEVICE_SETTINGS',
        registerAddress,
        newValue,
        serialNumber,
      })
    );
    logger.info(
      `Settings update request sent to device ${serialNumber}: register ${registerAddress} to value ${newValue}`
    );
  } else {
    logger.error(`No connection found for device ${serialNumber}`);
  }
};

const processSensorDataResponse = (parsedMessage) => {
  const { serialNumber, data } = parsedMessage.data;
  if (serialNumber) {
    storeData(serialNumber, data);
    logger.info(
      `Received and stored data for serial number ${serialNumber}: ${JSON.stringify(
        data
      )}`
    );
    emitter.emit('sensor_data_received', serialNumber); // Emit event when data is received
  } else {
    logger.warn('Received data without serial number');
  }
};

const processDeviceSettingsUpdateAck = (parsedMessage) => {
  const { serialNumber, registerAddress, newValue } = parsedMessage.data;
  if (serialNumber) {
    logger.info(
      `Register ${registerAddress} updated to ${newValue} for device ${serialNumber}`
    );
    emitter.emit('device_settings_update_ack', {
      serialNumber,
      registerAddress,
      newValue,
    }); // Emit event when update is acknowledged
  } else {
    logger.warn('Settings update ACK received without serial number');
  }
};

const handleDeviceDisconnection = (serialNumber) => {
  const ws = getConnection(serialNumber);
  if (ws) {
    ws.close();
    removeConnection(serialNumber);
    logger.info(`Device disconnected: ${serialNumber}`);
    emitter.emit('device_disconnected', serialNumber); // Emit event when device disconnects
  } else {
    logger.warn(`No connection found for device ${serialNumber}`);
  }
};

const handleDisconnection = (ws) => {
  const serialNumber = getSerialNumberByWS(ws);
  if (serialNumber) {
    removeConnection(serialNumber);
    logger.info(`Connection closed for device ${serialNumber}`);
    emitter.emit('device_disconnected', serialNumber); // Emit event when device disconnects
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
  requestSensorData,
  updateDeviceSettings,
  processSensorDataResponse,
  processDeviceSettingsUpdateAck,
  handleDisconnection,
  handleDeviceDisconnection,
};
