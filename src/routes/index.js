const express = require('express');
const deviceRoutes = require('./deviceRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.use('/devices', deviceRoutes);
router.use('/users', userRoutes);

module.exports = router;
