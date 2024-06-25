// src/routes.js

const express = require('express');
const {
  sendReadDataRequest,
  sendUpdateRegisterRequest,
} = require('./websocketHandler');
const { getData, getAllConnections } = require('./connectionManager');
const emitter = require('./eventEmitter');

const router = express.Router();

const waitForData = (serialNumber) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for data'));
    }, 10000); // 10 seconds timeout, adjust as necessary

    emitter.once('data_received', (receivedSerialNumber) => {
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
  });
};

router.get('/connections', (req, res) => {
  const connections = getAllConnections();
  res.json({ connections: Object.keys(connections) }); // send list of serial numbers
});

router.post('/read-data', async (req, res) => {
  const { serialNumber } = req.body;
  if (serialNumber) {
    sendReadDataRequest(serialNumber);
    try {
      const data = await waitForData(serialNumber);
      res.json({ status: 'Data received', data });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: 'serialNumber is required' });
  }
});

router.post('/update-register', (req, res) => {
  const { serialNumber, registerAddress, newValue } = req.body;
  if (serialNumber && registerAddress !== undefined && newValue !== undefined) {
    sendUpdateRegisterRequest(serialNumber, registerAddress, newValue);
    res.json({ status: 'Request sent to update register' });
  } else {
    res
      .status(400)
      .json({
        error: 'serialNumber, registerAddress, and newValue are required',
      });
  }
});

module.exports = router;
