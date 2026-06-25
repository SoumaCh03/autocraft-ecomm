import { v4 as uuidv4 } from 'uuid';
import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';

let io = null;
const recentTokens = new Set();

// Initialize emitter with io instance
export const initNotificationEmitter = (ioInstance) => {
  io = ioInstance;
};

// Clean up old tokens every 10 seconds to prevent memory bloat
setInterval(() => {
  if (recentTokens.size > 1000) {
    const tokensArray = Array.from(recentTokens);
    tokensArray.slice(0, 500).forEach(token => recentTokens.delete(token));
  }
}, 10000);

export const emitNotificationEvent = async ({
  userId,
  userIds,
  type,
  title,
  message,
  role,
  relatedData = {}
}) => {
  try {
    const deduplicationToken = uuidv4();

    // Determine target users
    let targetUserIds = [];
    if (userId) {
      targetUserIds = [userId];
    } else if (userIds) {
      targetUserIds = Array.isArray(userIds) ? userIds : [userIds];
    }

    // Create notification document (source of truth)
    const notificationData = {
      type,
      title,
      message,
      role,
      relatedData,
      deduplicationToken,
      socketDelivered: false
    };

    // Create notifications for all target users
    const notifications = await Notification.insertMany(
      targetUserIds.map(id => ({
        ...notificationData,
        user: id
      }))
    );

    // Emit socket events for online users
    if (io) {
      recentTokens.add(deduplicationToken);

      // Auto-remove token after 60 seconds
      setTimeout(() => {
        recentTokens.delete(deduplicationToken);
      }, 60000);

      targetUserIds.forEach((targetUserId, index) => {
        const notification = notifications[index];

        // Emit to specific user room
        io.to(`user:${targetUserId}`).emit('notification:update', {
          deduplicationToken,
          notification: {
            _id: notification._id,
            title,
            message,
            type,
            relatedData,
            read: false,
            role,
            createdAt: notification.createdAt
          },
          deliveredAt: new Date()
        });

        // Update socket delivery flag
        Notification.findByIdAndUpdate(
          notification._id,
          {
            socketDelivered: true,
            socketDeliveredAt: new Date()
          },
          { new: true }
        ).catch(err => console.error('[Emitter] Error updating socket delivery:', err));
      });
    }

    return { deduplicationToken, notificationIds: notifications.map(n => n._id) };
  } catch (err) {
    console.error('[Emitter] Error in emitNotificationEvent:', err);
    throw err;
  }
};

// Emit to all admins
export const notifyAllAdmins = async ({ type, title, message, relatedData = {} }) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }, '_id');
    const adminIds = admins.map(a => a._id);

    if (adminIds.length === 0) {
      console.warn('[Emitter] No admins found for notification');
      return;
    }

    return await emitNotificationEvent({
      userIds: adminIds,
      type,
      title,
      message,
      role: 'admin',
      relatedData
    });
  } catch (err) {
    console.error('[Emitter] Error in notifyAllAdmins:', err);
    throw err;
  }
};

// Emit to specific customer
export const notifyCustomer = async ({
  userId,
  type,
  title,
  message,
  relatedData = {}
}) => {
  return await emitNotificationEvent({
    userId,
    type,
    title,
    message,
    role: 'customer',
    relatedData
  });
};

// Emit to multiple customers (e.g., waitlist)
export const notifyCustomers = async ({
  userIds,
  type,
  title,
  message,
  relatedData = {}
}) => {
  return await emitNotificationEvent({
    userIds,
    type,
    title,
    message,
    role: 'customer',
    relatedData
  });
};

