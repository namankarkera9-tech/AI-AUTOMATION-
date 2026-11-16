const express = require('express');
const { param, query } = require('express-validator');
const executionController = require('../controllers/executionController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

router.get('/', [query('status').optional().isIn(['all', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'PAUSED', 'CANCELLED']), query('limit').optional().isInt({ min: 1, max: 100 }), query('skip').optional().isInt({ min: 0 }), query('sort').optional().isIn(['newest', 'oldest']), validate], executionController.listExecutions);
router.get('/:id', [param('id').isMongoId(), validate], executionController.getExecution);
router.get('/:id/timeline', [param('id').isMongoId(), validate], executionController.getExecutionTimeline);
router.post('/:id/pause', [param('id').isMongoId(), validate], executionController.pauseExecution);
router.post('/:id/resume', [param('id').isMongoId(), validate], executionController.resumeExecution);
router.post('/:id/cancel', [param('id').isMongoId(), validate], executionController.cancelExecution);
router.post('/:id/retry', [param('id').isMongoId(), validate], executionController.retryExecution);

module.exports = router;
