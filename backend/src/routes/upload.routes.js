const express = require('express');
const uploadController = require('../controllers/upload.controller');
const { auth, requireRole } = require('../middleware');

const router = express.Router();

router.use(auth, requireRole('ADMIN', 'STAFF'));

router.post('/', uploadController.uploadImage);
router.post('/sign', uploadController.getSignUrl);

module.exports = router;
