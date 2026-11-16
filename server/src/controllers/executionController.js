const executionService = require('../services/executionService');
const asyncHandler = require('../utils/asyncHandler');

const listExecutions = asyncHandler(async (req, res) => {
  const { status, workflowId, limit, skip, sort } = req.query;
  const result = await executionService.listExecutions(req.user.id, { status, workflowId, limit, skip, sort });
  res.status(200).json({
    success: true,
    data: result,
  });
});

const getExecution = asyncHandler(async (req, res) => {
  const execution = await executionService.getExecutionById(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: { execution },
  });
});

const getExecutionTimeline = asyncHandler(async (req, res) => {
  const logs = await executionService.getExecutionTimeline(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: { logs },
  });
});

const pauseExecution = asyncHandler(async (req, res) => {
  const execution = await executionService.pauseExecution(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Execution paused successfully',
    data: { execution },
  });
});

const resumeExecution = asyncHandler(async (req, res) => {
  const execution = await executionService.resumeExecution(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Execution resumed successfully',
    data: { execution },
  });
});

const cancelExecution = asyncHandler(async (req, res) => {
  const execution = await executionService.cancelExecution(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Execution cancelled successfully',
    data: { execution },
  });
});

const retryExecution = asyncHandler(async (req, res) => {
  const execution = await executionService.retryExecution(req.params.id, req.user.id);
  res.status(202).json({
    success: true,
    message: 'Execution retry queued successfully',
    data: { execution },
  });
});

module.exports = {
  listExecutions,
  getExecution,
  getExecutionTimeline,
  pauseExecution,
  resumeExecution,
  cancelExecution,
  retryExecution,
};
