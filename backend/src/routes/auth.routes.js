const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { validateLogin, validateRegister } = require('../validators');
const { authenticate } = require('../middleware');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
