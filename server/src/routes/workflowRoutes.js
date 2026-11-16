const express = require('express');
const { body, param, query } = require('express-validator');
const workflowController = require('../controllers/workflowController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

// Aggregated dashboard metrics
router.get('/dashboard', workflowController.getDashboardMetrics);

// Workflow CRUD & listing
router.get('/', [query('status').optional().isIn(['all', 'draft', 'active', 'paused', 'archived']), query('limit').optional().isInt({ min: 1, max: 100 }), query('skip').optional().isInt({ min: 0 }), validate], workflowController.listWorkflows);

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Workflow name is required'), validate],
  workflowController.createWorkflow
);

// AI prompt generation
router.post(
  '/generate',
  [body('prompt').trim().notEmpty().withMessage('Prompt is required for workflow generation'), validate],
  workflowController.generateWorkflow
);

router.get('/:id', [param('id').isMongoId(), validate], workflowController.getWorkflow);
router.get('/:id/versions', [param('id').isMongoId(), validate], workflowController.listWorkflowVersions);
router.post('/:id/versions/:version/restore', [param('id').isMongoId(), param('version').isInt({ min: 1 }), validate], workflowController.restoreWorkflowVersion);
router.put('/:id', [param('id').isMongoId(), body('name').optional().trim().notEmpty(), body('nodes').optional().isArray(), body('edges').optional().isArray(), body('tags').optional().isArray(), validate], workflowController.updateWorkflow);
router.post('/:id/duplicate', [param('id').isMongoId(), validate], workflowController.duplicateWorkflow);
router.post('/:id/validate', [param('id').isMongoId(), validate], workflowController.validateWorkflow);
router.post('/:id/execute', [param('id').isMongoId(), body('input').optional().isObject(), validate], workflowController.executeWorkflow);
router.delete('/:id', [param('id').isMongoId(), validate], workflowController.deleteWorkflow);

module.exports = router;
