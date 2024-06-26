const {
  requestSensorData,
  updateDeviceSettings,
} = require('../websocket/websocketHandler');
const { getData, getAllConnections } = require('../utils/connectionManager');
const emitter = require('../utils/eventEmitter');
const logger = require('../config/logger');

const waitForData = (serialNumber) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      logger.error(`Timeout waiting for data for device ${serialNumber}`);
      reject(new Error('Timeout waiting for data'));
    }, 10000); // 10 seconds timeout, adjust as necessary

    emitter.once('sensor_data_received', (receivedSerialNumber) => {
      logger.info(
        `Event 'sensor_data_received' triggered for device ${receivedSerialNumber}`
      );
      if (receivedSerialNumber === serialNumber) {
        clearTimeout(timeout);
        const data = getData(serialNumber);
        if (data) {
          resolve(data);
        } else {
          logger.error(
            `No data found or data expired for device ${serialNumber}`
          );
          reject(new Error('No data found or data expired'));
        }
      }
    });

    // Check if data is already available
    const data = getData(serialNumber);
    if (data) {
      clearTimeout(timeout);
      resolve(data);
    }
  });
};

const waitForUpdateAck = (serialNumber, registerAddress, newValue) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      logger.error(
        `Timeout waiting for update acknowledgment for device ${serialNumber}`
      );
      reject(new Error('Timeout waiting for update acknowledgment'));
    }, 10000); // 10 seconds timeout, adjust as necessary

    emitter.once('device_settings_update_ack', (ack) => {
      logger.info(
        `Event 'device_settings_update_ack' triggered for device ${serialNumber}`
      );
      if (
        ack.serialNumber === serialNumber &&
        ack.registerAddress === registerAddress &&
        ack.newValue === newValue
      ) {
        clearTimeout(timeout);
        resolve(ack);
      }
    });
  });
};

const getConnections = (req, res) => {
  const connections = getAllConnections();
  res.json({ connections: Object.keys(connections) }); // send list of serial numbers
};

const readData = async (req, res, next) => {
  const { serialNumber } = req.body;
  if (serialNumber) {
    logger.info(`Read data request received for device ${serialNumber}`);
    requestSensorData(serialNumber);
    try {
      const data = await waitForData(serialNumber);
      logger.info(
        `Data received for device ${serialNumber}: ${JSON.stringify(data)}`
      );
      res.json({ status: 'Data received', data });
    } catch (error) {
      logger.error(
        `Error fetching data for device ${serialNumber}: ${error.message}`
      );
      next(error);
    }
  } else {
    res.status(400).json({ error: 'serialNumber is required' });
  }
};

const updateRegister = async (req, res, next) => {
  const { serialNumber, registerAddress, newValue } = req.body;
  if (serialNumber && registerAddress !== undefined && newValue !== undefined) {
    logger.info(`Update register request received for device ${serialNumber}`);
    updateDeviceSettings(req.body);
    try {
      const ack = await waitForUpdateAck(
        serialNumber,
        registerAddress,
        newValue
      );
      logger.info(
        `Register updated for device ${serialNumber}: ${JSON.stringify(ack)}`
      );
      res.json({ status: 'Register updated', ack });
    } catch (error) {
      logger.error(
        `Error updating register for device ${serialNumber}: ${error.message}`
      );
      next(error);
    }
  } else {
    res.status(400).json({
      error: 'serialNumber, registerAddress, and newValue are required',
    });
  }
};

module.exports = {
  getConnections,
  readData,
  updateRegister,
};
