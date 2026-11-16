const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./env');
const Execution = require('../models/Execution');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [config.clientUrl],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const user = jwt.verify(token, config.jwt.secret);
      socket.data.userId = String(user.id);
      return next();
    } catch {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);

    // Client joins execution room for live timeline
    socket.on('join:execution', async (executionId, acknowledge) => {
      try {
        const execution = executionId && await Execution.findById(executionId);
        const allowed = execution && String(execution.userId) === socket.data.userId;
        if (allowed) socket.join(`execution:${executionId}`);
        if (typeof acknowledge === 'function') acknowledge(Boolean(allowed));
      } catch {
        if (typeof acknowledge === 'function') acknowledge(false);
      }
    });

    socket.on('leave:execution', (executionId) => {
      if (executionId) {
        socket.leave(`execution:${executionId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnection
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

const emitExecutionEvent = (executionId, data) => {
  if (io) {
    io.to(`execution:${executionId}`).emit('execution:event', data);
    Execution.findById(executionId).then((execution) => {
      if (execution) io.to(`user:${execution.userId}`).emit('dashboard:event', data);
    }).catch(() => {});
  }
};

const emitExecutionStatus = (executionId, data) => {
  if (io) {
    io.to(`execution:${executionId}`).emit('execution:status', data);
    Execution.findById(executionId).then((execution) => {
      if (execution) io.to(`user:${execution.userId}`).emit('dashboard:status', data);
    }).catch(() => {});
  }
};

const emitNotification = (userId, data) => {
  if (io && userId) {
    io.to(`user:${userId}`).emit('notification:new', data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitExecutionEvent,
  emitExecutionStatus,
  emitNotification,
};
