const {
  addConnection,
  storeData,
  getConnection,
  getConnectionModel,
  removeConnection,
  getAllConnections,
  handlePing,
} = require('../utils/connectionManager');
const logger = require('../config/logger');
const emitter = require('../utils/eventEmitter');
const MESSAGE_TYPES = require('../websocket/constants/messageTypes');
const handleMessage = async (ws, message) => {
  const parsedMessage = JSON.parse(message);
  const serialNumber = parsedMessage?.data?.serialNumber;
  const model = parsedMessage?.data?.model;
  const ipAddress = parsedMessage?.data?.ipAddress;
  const publicIpAddress = parsedMessage?.data?.publicIpAddress;

  // =========== Validate message and serial number before processing ===========

  if (!serialNumber) {
    logger.warn('Message received without serial number');
    return;
  }
  if (!model) {
    logger.warn('Message received without model');
    return;
  }

  // =========== Process message based on type ===========
  switch (parsedMessage.type) {
    case MESSAGE_TYPES.DEVICE_CONNECT:
      if (serialNumber) {
        logger.info(
          `Device connected: serial number ${serialNumber}, model ${model}, IP address ${ipAddress} and public IP address ${publicIpAddress}`
        );
        addConnection(serialNumber, model, ipAddress, publicIpAddress, ws);
      } else {
        logger.warn('Device connect message received without serial number');
      }
      break;
    case MESSAGE_TYPES.REQUEST_SENSOR_DATA:
      requestSensorData(serialNumber);
      break;
    case MESSAGE_TYPES.UPDATE_DEVICE_SETTINGS:
      updateDeviceSettings(parsedMessage);
      break;
    case MESSAGE_TYPES.SENSOR_DATA_RESPONSE:
      processSensorDataResponse(parsedMessage);
      break;
    case MESSAGE_TYPES.DEVICE_SETTINGS_UPDATE_ACK:
      processDeviceSettingsUpdateAck(parsedMessage);
      break;
    case MESSAGE_TYPES.DEVICE_DISCONNECT:
      handleDeviceDisconnection(serialNumber);
      break;
    case MESSAGE_TYPES.PING:
      handlePing(serialNumber, model, ws);
      break;
    default:
      logger.warn(`Unknown message type: ${parsedMessage.type}`);
  }
};

const requestSensorData = (serialNumber) => {
  const ws = getConnection(serialNumber);
  if (ws) {
    ws.send(
      JSON.stringify({ type: MESSAGE_TYPES.REQUEST_SENSOR_DATA, serialNumber })
    );
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
        type: MESSAGE_TYPES.UPDATE_DEVICE_SETTINGS,
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
