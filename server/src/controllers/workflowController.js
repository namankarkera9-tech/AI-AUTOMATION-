const workflowService = require('../services/workflowService');
const asyncHandler = require('../utils/asyncHandler');

const getDashboardMetrics = asyncHandler(async (req, res) => {
  const data = await workflowService.getDashboardMetrics(req.user.id);
  res.status(200).json({
    success: true,
    data,
  });
});

const listWorkflows = asyncHandler(async (req, res) => {
  const { status, search, limit, skip } = req.query;
  const result = await workflowService.listWorkflows(req.user.id, { status, search, limit, skip });
  res.status(200).json({
    success: true,
    data: result,
  });
});

const createWorkflow = asyncHandler(async (req, res) => {
  const workflow = await workflowService.createWorkflow(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: 'Workflow created successfully',
    data: { workflow },
  });
});

const generateWorkflow = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  const workflow = await workflowService.generateWorkflow(req.user.id, { prompt });
  res.status(201).json({
    success: true,
    message: 'Workflow generated from AI prompt successfully',
    data: { workflow },
  });
});

const getWorkflow = asyncHandler(async (req, res) => {
  const workflow = await workflowService.getWorkflowById(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: { workflow },
  });
});

const updateWorkflow = asyncHandler(async (req, res) => {
  const workflow = await workflowService.updateWorkflow(req.params.id, req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Workflow updated successfully',
    data: { workflow },
  });
});

const duplicateWorkflow = asyncHandler(async (req, res) => {
  const workflow = await workflowService.duplicateWorkflow(req.params.id, req.user.id);
  res.status(201).json({
    success: true,
    message: 'Workflow duplicated successfully',
    data: { workflow },
  });
});

const executeWorkflow = asyncHandler(async (req, res) => {
  const execution = await workflowService.executeWorkflow(req.params.id, req.user.id, req.body.input || {});
  res.status(202).json({
    success: true,
    message: 'Workflow execution queued successfully',
    data: { execution },
  });
});

const deleteWorkflow = asyncHandler(async (req, res) => {
  await workflowService.deleteWorkflow(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Workflow deleted successfully',
  });
});

const validateWorkflow = asyncHandler(async (req, res) => {
  const validation = await workflowService.validateWorkflow(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: { validation } });
});

const listWorkflowVersions = asyncHandler(async (req, res) => {
  const versions = await workflowService.listWorkflowVersions(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: { versions } });
});

const restoreWorkflowVersion = asyncHandler(async (req, res) => {
  const workflow = await workflowService.restoreWorkflowVersion(req.params.id, req.user.id, req.params.version);
  res.status(200).json({ success: true, data: { workflow } });
});

module.exports = {
  getDashboardMetrics,
  listWorkflows,
  createWorkflow,
  generateWorkflow,
  getWorkflow,
  updateWorkflow,
  duplicateWorkflow,
  executeWorkflow,
  deleteWorkflow,
  validateWorkflow,
  listWorkflowVersions,
  restoreWorkflowVersion,
};
