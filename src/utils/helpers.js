const logger = require('../config/logger');

const checkAndLogMissingFields = (data, ws) => {
  const { serialNumber, model, ipAddress, publicIpAddress } = data;
  const missingFields = [];
  if (!serialNumber) {
    missingFields.push('serial number');
  }
  if (!model) {
    missingFields.push('model');
  }
  if (!ipAddress) {
    missingFields.push('IP address');
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
  if (!serialNumber) {
    ws.close();
  }
};

module.exports = { checkAndLogMissingFields };
