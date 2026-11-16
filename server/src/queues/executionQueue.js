const { Queue, Worker } = require('bullmq');
const { getRedisClient, checkRedisAvailable } = require('./redis');
const orchestrator = require('../agents/orchestrator');
const integrationService = require('../services/integrationService');
const aiService = require('../services/aiService');

let bullQueue = null;
let bullWorker = null;
let waitingForRedis = false;

// In-Memory Queue Fallback
const inMemoryQueue = [];
let isProcessingInMemory = false;

async function processInMemoryJob(jobData) {
  try {
    await orchestrator.runWorkflow({
      executionId: jobData.executionId,
      workflowId: jobData.workflowId,
      workflow: jobData.workflow,
      input: jobData.input,
      userId: jobData.userId,
      integrationService,
      aiService,
    });
  } catch (err) {
    console.error(`[ExecutionQueue] Error executing workflow ${jobData.executionId}:`, err);
  }
}

async function runInMemoryQueueProcessor() {
  if (isProcessingInMemory) return;
  isProcessingInMemory = true;

  while (inMemoryQueue.length > 0) {
    const nextJob = inMemoryQueue.shift();
    if (nextJob) {
      await processInMemoryJob(nextJob);
    }
  }

  isProcessingInMemory = false;
}

const initExecutionQueue = () => {
  if (bullQueue && bullWorker) return;
  if (checkRedisAvailable()) {
    try {
      const connection = getRedisClient();
      bullQueue = new Queue('workflow-execution', { connection });
      bullWorker = new Worker(
        'workflow-execution',
        async (job) => {
          await orchestrator.runWorkflow({
            executionId: job.data.executionId,
            workflowId: job.data.workflowId,
            workflow: job.data.workflow,
            input: job.data.input,
            userId: job.data.userId,
            integrationService,
            aiService,
          });
        },
        { connection, concurrency: 5 }
      );

      bullWorker.on('failed', (job, err) => {
        console.error(`[BullMQ] Job ${job?.id} failed:`, err.message);
      });

      console.log('[Queue] BullMQ execution worker initialized on Redis.');
      return;
    } catch (err) {
      console.warn(`[Queue] Failed to initialize BullMQ worker: ${err.message}. Using In-Memory fallback.`);
    }
  }

  if (!waitingForRedis && getRedisClient()) {
    waitingForRedis = true;
    // Redis emits ready later; initRedis calls this initializer again at that point.
  }

  console.log('[Queue] In-Memory execution queue active.');
};

const addExecutionJob = async (jobData) => {
  if (bullQueue && checkRedisAvailable()) {
    try {
      const job = await bullQueue.add('execute-workflow', jobData, {
        attempts: 1, // Retries are handled agentically by RecoveryAgent
        removeOnComplete: 100,
        removeOnFail: 100,
      });
      return { id: job.id, mode: 'bullmq' };
    } catch (err) {
      console.warn('[Queue] BullMQ enqueue failed, routing to in-memory fallback:', err.message);
    }
  }

  // In-Memory routing
  inMemoryQueue.push(jobData);
  // Trigger processor asynchronously without blocking caller
  setImmediate(() => {
    runInMemoryQueueProcessor();
  });

  return { id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, mode: 'in-memory' };
};

module.exports = {
  initExecutionQueue,
  addExecutionJob,
};
