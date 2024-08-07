const {
  requestSensorData,
  updateDeviceSettings,
  rebootDevice,
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
  try {
    const connections = getAllConnections();
    const connectionDetails = Object.values(connections).map((connection) => {
      const { data, lastPingTime, connectedAt } = connection;
      return {
        serialNumber: data.serialNumber ?? 'N/A',
        model: data.model ?? 'N/A',
        ipAddress: data.ipAddress ?? 'N/A',
        publicIpAddress: data.publicIpAddress ?? 'N/A',
        beagleboneSerialNumber: data.beagleboneSerialNumber ?? 'N/A',
        deviceStatus: data.deviceStatus ?? 'N/A',
        uptime: data.uptime ?? 0,
        cpuUsage: data.cpuUsage ?? [],
        memoryUsage: data.memoryUsage ?? {},
        diskUsage: data.diskUsage ?? {},
        networkInterfaces: data.networkInterfaces ?? {},
        runningProcesses: data.runningProcesses ?? 0,
        firmwareVersion: data.firmwareVersion ?? 'N/A',
        lastPingTime: lastPingTime ?? 'N/A',
        connectedAt: connectedAt ?? 'N/A',
      };
    });

    res.json({
      totalConnections: connectionDetails.length,
      connections: connectionDetails,
    });
  } catch (error) {
    logger.error(`Failed to get connections: ${error.message}`);
    res.status(500).json({ error: 'Failed to get connections' });
  }
};

const readData = async (req, res, next) => {
  const { serialNumber } = req.body;
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
      res.status(503).json({
        status: 'Service Unavailable',
        message: 'Request interval not met and no existing data',
      });
    }
  }
};

const updateRegister = async (req, res, next) => {
  const { serialNumber, registerAddress, newValue } = req.body;
  logger.info(`Update register request received for device ${serialNumber}`);
  console.log(req.body);
  updateDeviceSettings(req.body);

  try {
    const ack = await waitForUpdateAck(serialNumber, registerAddress, newValue);
    logger.info(
      `Register updated for device ${serialNumber}: ${JSON.stringify(ack)}`
    );
    res.json({ status: 'success', data: ack });
  } catch (error) {
    logger.error(
      `Error updating register for device ${serialNumber}: ${error.message}`
    );
    next(error);
  }
};
const waitForReboot = (serialNumber) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      logger.error(
        `Timeout waiting for reboot acknowledgment for device ${serialNumber}`
      );
      reject(new Error('Timeout waiting for reboot acknowledgment'));
    }, 10000); // 10 seconds timeout, adjust as necessary

    emitter.once(
      'device_reboot_ack',
      (ackSerialNumber, error, errorMessage) => {
        if (ackSerialNumber === serialNumber) {
          clearTimeout(timeout);
          if (error) {
            reject(new Error(errorMessage));
          } else {
            resolve();
          }
        }
      }
    );
  });
};

const reboot_device = async (req, res, next) => {
  const { serialNumber } = req.body;
  logger.info(`Reboot request received for device ${serialNumber}`);
  rebootDevice(serialNumber);

  try {
    await waitForReboot(serialNumber);
    res.json({ status: 'success', message: 'Reboot acknowledged' });
  } catch (error) {
    logger.error(`Error rebooting device ${serialNumber}: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getConnections,
  readData,
  updateRegister,
  reboot_device,
};
