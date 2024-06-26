const express = require('express');
const { getUser, createUser } = require('../controllers/userController');

const router = express.Router();

router.get('/:id', getUser);
router.post('/', createUser);

module.exports = router;
