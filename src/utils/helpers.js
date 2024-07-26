const logger = require('../config/logger');

const checkAndLogMissingFields = (data, ws) => {
  const { serialNumber, model, publicIpAddress, beagleboneSerialNumber } = data;
  console.log(data);
  const missingFields = [];
  if (!serialNumber) {
    missingFields.push('serial number');
  }
  if (!model) {
    missingFields.push('model');
  }
  if (!publicIpAddress) {
    missingFields.push('public IP address');
  }

  if (missingFields.length > 0) {
    logger.warn(
      `Message received with missing fields: ${missingFields.join(
        ', '
      )}. Received data: ${JSON.stringify(data)}`
    );
  }
  // If the serial number is missing, close the WebSocket connection
  if (!beagleboneSerialNumber) {
    logger.warn(
      'Closing connection because Beaglebone serial number is missing'
    );
    ws.close();
  }
};

module.exports = { checkAndLogMissingFields };
