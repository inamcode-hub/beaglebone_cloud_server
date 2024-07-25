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
  // if there is no serial number or public IP address or local IP address, close the connection
  if (!serialNumber || !publicIpAddress || !ipAddress) {
    ws.close();
  }
};

module.exports = { checkAndLogMissingFields };
