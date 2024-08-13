const express = require('express');
const {
  readData,
  updateRegister,
  getConnections,
  reboot_device,
} = require('../controllers/deviceController');
const validate = require('../middlewares/validator');
const { body } = require('express-validator');
const { handleDataUpload } = require('../controllers/uploadController');

const router = express.Router();

router.get('/connections', getConnections);

router.post(
  '/read-data',
  validate([
    body('serialNumber').notEmpty().withMessage('serialNumber is required'),
  ]),
  readData
);

router.post(
  '/update-register',
  validate([
    body('serialNumber').notEmpty().withMessage('serialNumber is required'),
    body('registerAddress')
      .notEmpty()
      .withMessage('registerAddress is required'),
    body('newValue').notEmpty().withMessage('newValue is required'),
  ]),
  updateRegister
);

router.post(
  '/reboot-device',
  validate([
    body('serialNumber').notEmpty().withMessage('serialNumber is required'),
  ]),
  reboot_device
);

router.post(`/upload`, handleDataUpload);
module.exports = router;
