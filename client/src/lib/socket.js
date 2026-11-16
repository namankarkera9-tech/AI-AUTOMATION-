import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: (callback) => callback({
        token: typeof window !== 'undefined' ? localStorage.getItem('agentflow_token') : null,
      }),
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });
  }
  return socket;
};

export const joinExecution = (executionId) => {
  const s = getSocket();
  s.emit('join:execution', executionId);
};

export const leaveExecution = (executionId) => {
  const s = getSocket();
  s.emit('leave:execution', executionId);
};

export const joinUserRoom = (userId) => {
  const s = getSocket();
  // User identity is derived and authorized by the server from the JWT.
  s.auth = { token: typeof window !== 'undefined' ? localStorage.getItem('agentflow_token') : null };
  if (!s.connected) s.connect();
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
