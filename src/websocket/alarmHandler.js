const logger = require('../config/logger');
const MESSAGE_TYPES = require('../websocket/constants/messageTypes');

// Store alarm states for each device
let alarmStates = {};

// Function to process ALARM_TRIGGER and send ALARM_ACK
const processAlarmTrigger = (parsedMessage, ws) => {
  const { serialNumber, alarmType, stage, timestamp } =
    parsedMessage.data || {};

  // Validate message content
  if (!serialNumber || !alarmType || !timestamp || !stage) {
    logger.warn('Invalid alarm message received. Missing fields.');
    return;
  }

  logger.info(
    `Alarm triggered: Device ${serialNumber}, Alarm Type: ${alarmType}, Stage: ${stage}, Timestamp: ${timestamp}`
  );

  // Update alarm state
  updateAlarmState(serialNumber, alarmType, stage, timestamp);

  // Send acknowledgment (ALARM_ACK) to the device
  sendAlarmAck(serialNumber, alarmType, stage, timestamp, ws);
};

// Function to update the alarm state for a device
const updateAlarmState = (serialNumber, alarmType, stage, timestamp) => {
  if (!alarmStates[serialNumber]) {
    alarmStates[serialNumber] = {}; // Initialize alarm state for this device
  }

  const currentAlarmState = alarmStates[serialNumber][alarmType] || {};

  // Update alarm state if it's new or the stage has changed
  if (!currentAlarmState.active || currentAlarmState.stage !== stage) {
    alarmStates[serialNumber][alarmType] = {
      stage: stage,
      active: true,
      timestamp: timestamp,
    };
    logger.info(
      `Updated alarm state for ${alarmType} on device ${serialNumber}`
    );
  } else {
    logger.info(
      `No change detected for ${alarmType} on device ${serialNumber}, skipping update.`
    );
  }
};

// Function to send ALARM_ACK to the device
const sendAlarmAck = (serialNumber, alarmType, stage, timestamp, ws) => {
  // Construct the ALARM_ACK message that BeagleBone expects
  const ackMessage = {
    type: MESSAGE_TYPES.ALARM_ACK,
    serialNumber,
    alarmType, // Keep alarmType here as expected by BeagleBone
    stage, // Include the alarm stage
    timestamp, // Acknowledge with the same timestamp
  };

  // Send the message through WebSocket if it's open
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(ackMessage));
    logger.info(
      `Sent ALARM_ACK for device ${serialNumber}: Alarm Type: ${alarmType}, Stage: ${stage}, Timestamp: ${timestamp}`
    );
  } else {
    logger.warn(
      `WebSocket connection not open for device ${serialNumber}. Could not send acknowledgment.`
    );
  }
};

// Export the alarm-related functions
module.exports = {
  processAlarmTrigger,
  updateAlarmState,
};
//
