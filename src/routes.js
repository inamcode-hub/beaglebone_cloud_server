// src/routes.js

const express = require('express');
const {
  sendReadDataRequest,
  sendUpdateRegisterRequest,
} = require('./websocketHandler');
const { getData, getAllConnections } = require('./connectionManager');

const router = express.Router();

router.get('/connections', (req, res) => {
  const connections = getAllConnections();
  res.json({ connections: Object.keys(connections) }); // send list of serial numbers
});

router.post('/read-data', (req, res) => {
  const { serialNumber } = req.body;
  if (serialNumber) {
    sendReadDataRequest(serialNumber);
    setTimeout(() => {
      // Wait for the data to be received from the device
      const data = getData(serialNumber);
      if (data) {
        res.json({ status: 'Data received', data });
      } else {
        res.status(404).json({ error: 'No data found or data expired' });
      }
    }, 1000); // Adjust the timeout as necessary
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
    res.status(400).json({
      error: 'serialNumber, registerAddress, and newValue are required',
    });
  }
});

module.exports = router;
