import { io } from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const getServerUrl = () => {
  if (import.meta.env.PROD) {
    return 'https://autocraft-backend.onrender.com';
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // Remove /api suffix if present since socket.io connects to the server root
  return apiUrl.replace(/\/api\/?$/, '');
};

export const socketConnect = (user, token) => {
  if (socket?.connected || socket?.connecting) {
    if (import.meta.env.DEV) {
      console.log('[Socket] Already connected or connecting');
    }
    return socket;
  }

  if (!user) {
    if (import.meta.env.DEV) {
      console.warn('[Socket] Cannot connect: missing user');
    }
    return null;
  }

  try {
    socket = io(getServerUrl(), {
      auth: {
        token: token
      },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    });

    socket.on('connect', () => {
      reconnectAttempts = 0;
      if (import.meta.env.DEV) {
        console.log('[Socket] Connected successfully');
      }
    });

    socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) {
        console.warn('[Socket] Disconnected:', reason);
      }
    });

    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) {
        console.error('[Socket] Connection error:', err);
      }
      reconnectAttempts++;
    });

    socket.on('error', (err) => {
      if (import.meta.env.DEV) {
        console.error('[Socket] Error:', err);
      }
    });

    return socket;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[Socket] Failed to initialize:', err);
    }
    return null;
  }
};

export const socketDisconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
    if (import.meta.env.DEV) {
      console.log('[Socket] Disconnected manually');
    }
  }
};

export const getSocket = () => socket;

export const isConnected = () => socket?.connected || false;

export const on = (event, callback) => {
  if (!socket) {
    if (import.meta.env.DEV) {
      console.warn('[Socket] Socket not initialized');
    }
    return;
  }
  socket.on(event, callback);
};

export const off = (event, callback) => {
  if (!socket) return;
  socket.off(event, callback);
};

export const emit = (event, data) => {
  if (!socket?.connected) {
    if (import.meta.env.DEV) {
      console.warn('[Socket] Socket not connected, cannot emit:', event);
    }
    return;
  }
  socket.emit(event, data);
};

export const getConnectionStatus = () => ({
  connected: socket?.connected || false,
  connecting: socket?.connecting || false,
  reconnectAttempts,
  maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
});

