const {
  sendReadDataRequest,
  sendUpdateRegisterRequest,
} = require('../websocket/websocketHandler');
const { getData, getAllConnections } = require('../utils/connectionManager');
const emitter = require('../utils/eventEmitter');

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

const waitForUpdateAck = (serialNumber, registerAddress, newValue) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for update acknowledgment'));
    }, 10000); // 10 seconds timeout, adjust as necessary

    emitter.once('update_ack', (ack) => {
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

const readData = async (req, res) => {
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
};

const updateRegister = async (req, res) => {
  const { serialNumber, registerAddress, newValue } = req.body;
  if (serialNumber && registerAddress !== undefined && newValue !== undefined) {
    sendUpdateRegisterRequest(req.body);
    try {
      const ack = await waitForUpdateAck(
        serialNumber,
        registerAddress,
        newValue
      );
      res.json({ status: 'Register updated', ack });
    } catch (error) {
      res.status(404).json({ error: error.message });
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
