import { socketAuth } from '../middleware/socketAuthMiddleware.js';

export const initNotificationSocket = (io) => {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Join role-based rooms
    if (userRole === 'admin' || userRole === 'super_admin') {
      socket.join('admin');
      socket.join('admin_analytics');
    } else if (userRole === 'customer') {
      socket.join('customer');
    }

    // Join specific user rooms for targeted notifications
    socket.join(`role:${userRole}`);

    console.log(`[Socket] User ${userId} (${userRole}) connected. Rooms: user:${userId}, ${userRole}, role:${userRole}`);

    // Handle acknowledgment of received notifications
    socket.on('notification:ack', (data) => {
      console.log(`[Socket] Notification acknowledged by user ${userId}:`, data.deduplicationToken);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User ${userId} disconnected`);
    });

    // Error handling
    socket.on('error', (err) => {
      console.error(`[Socket] Error for user ${userId}:`, err);
    });
  });
};
