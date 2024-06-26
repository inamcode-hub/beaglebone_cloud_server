const express = require('express');
const {
  readData,
  updateRegister,
  getConnections,
} = require('../controllers/deviceController');

const router = express.Router();

router.get('/connections', getConnections);
router.post('/read-data', readData);
router.post('/update-register', updateRegister);

module.exports = router;
