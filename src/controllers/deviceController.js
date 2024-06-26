const {
  requestSensorData,
  updateDeviceSettings,
} = require('../websocket/websocketHandler');
const {
  getData,
  shouldRequestData,
  getAllConnections,
  storeData,
} = require('../utils/connectionManager');
const emitter = require('../utils/eventEmitter');
const logger = require('../config/logger');

const waitForData = (serialNumber) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      logger.error(`Timeout waiting for data for device ${serialNumber}`);
      reject(new Error('Timeout waiting for data'));
    }, 10000); // 10 seconds timeout, adjust as necessary

    emitter.once('sensor_data_received', (receivedSerialNumber) => {
      if (receivedSerialNumber === serialNumber) {
        clearTimeout(timeout);
        const data = getData(serialNumber);
        if (data) {
          resolve(data);
        } else {
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
  if (!serialNumber) {
    return res.status(400).json({ error: 'serialNumber is required' });
  }

  logger.info(`Read data request received for device ${serialNumber}`);

  // Check if data is already available
  const existingData = getData(serialNumber);
  if (existingData) {
    logger.info(`Returning existing data for device ${serialNumber}`);
    res.json({ status: 'Data received', data: existingData });
  }

  // Always determine if a new request to the device should be made
  if (shouldRequestData(serialNumber)) {
    requestSensorData(serialNumber);

    try {
      const newData = await waitForData(serialNumber);
      logger.info(
        `Data received for device ${serialNumber}: ${JSON.stringify(newData)}`
      );
      // Store new data
      storeData(serialNumber, newData);
      if (!existingData) {
        res.json({ status: 'Data received', data: newData });
      }
    } catch (error) {
      logger.error(
        `Error fetching data for device ${serialNumber}: ${error.message}`
      );
      if (!existingData) {
        next(error);
      }
    }
  } else {
    logger.info(`Request interval not met for device ${serialNumber}`);
    if (!existingData) {
      res
        .status(503)
        .json({
          status: 'Service Unavailable',
          message: 'Request interval not met and no existing data',
        });
    }
  }
};

const updateRegister = async (req, res, next) => {
  const { serialNumber, registerAddress, newValue } = req.body;
  if (
    !serialNumber ||
    registerAddress === undefined ||
    newValue === undefined
  ) {
    return res
      .status(400)
      .json({
        error: 'serialNumber, registerAddress, and newValue are required',
      });
  }

  logger.info(`Update register request received for device ${serialNumber}`);
  updateDeviceSettings(req.body);

  try {
    const ack = await waitForUpdateAck(serialNumber, registerAddress, newValue);
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
};

module.exports = {
  getConnections,
  readData,
  updateRegister,
};
