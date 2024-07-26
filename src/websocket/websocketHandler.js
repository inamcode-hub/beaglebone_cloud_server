const WebSocket = require('ws');
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
const { checkAndLogMissingFields } = require('../utils/helpers');

const handleMessage = async (ws, message) => {
  try {
    const parsedMessage = JSON.parse(message);
    const { serialNumber, model, ipAddress, publicIpAddress } =
      parsedMessage.data || {};

    // Log missing fields in the message and close the connection if serial number is missing
    checkAndLogMissingFields(parsedMessage.data || {}, ws);

    // Process message based on type
    switch (parsedMessage.type) {
      case MESSAGE_TYPES.DEVICE_CONNECT:
        addConnection(parsedMessage.data || {}, ws);
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
  } catch (error) {
    logger.error(`Error handling message: ${error.message}`);
  }
};

const requestSensorData = (serialNumber) => {
  try {
    const ws = getConnection(serialNumber);
    if (ws) {
      ws.send(
        JSON.stringify({
          type: MESSAGE_TYPES.REQUEST_SENSOR_DATA,
          serialNumber,
        })
      );
      logger.info(`Data request sent to device ${serialNumber}`);
    } else {
      logger.error(`No connection found for device ${serialNumber}`);
    }
  } catch (error) {
    logger.error(
      `Error requesting sensor data for device ${serialNumber}: ${error.message}`
    );
  }
};

const updateDeviceSettings = (message) => {
  const { serialNumber, registerAddress, newValue } = message;
  try {
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
  } catch (error) {
    logger.error(
      `Error updating settings for device ${serialNumber}: ${error.message}`
    );
  }
};

const processSensorDataResponse = (parsedMessage) => {
  const { serialNumber, data } = parsedMessage.data || {};
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
  const { serialNumber, registerAddress, newValue } = parsedMessage.data || {};
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
  try {
    const ws = getConnection(serialNumber);
    if (ws) {
      ws.close();
      removeConnection(serialNumber);
      logger.info(`Device disconnected: ${serialNumber}`);
      emitter.emit('device_disconnected', serialNumber); // Emit event when device disconnects
    } else {
      logger.warn(`No connection found for device ${serialNumber}`);
    }
  } catch (error) {
    logger.error(
      `Error handling disconnection for device ${serialNumber}: ${error.message}`
    );
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

// Set up WebSocket server
const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

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
      handleDisconnection(ws);
    });
  });
};

module.exports = {
  handleMessage,
  requestSensorData,
  updateDeviceSettings,
  processSensorDataResponse,
  processDeviceSettingsUpdateAck,
  handleDisconnection,
  handleDeviceDisconnection,
  setupWebSocketServer,
};
