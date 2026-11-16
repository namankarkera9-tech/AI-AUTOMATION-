const express = require('express');
const { param } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', [param('id').isMongoId(), validate], notificationController.markAsRead);

module.exports = router;
