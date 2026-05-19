import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  role = 'customer',
  relatedData = {},
}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      role,
      relatedData,
      read: false,
    });

    return notification;
  } catch (error) {
    console.log('Notification creation error:', error.message);
    return null;
  }
};

export const notifyAllAdmins = async ({
  type,
  title,
  message,
  relatedData = {},
}) => {
  try {
    const admins = await User.find({ role: 'admin' });

    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type,
        title,
        message,
        role: 'admin',
        relatedData,
        read: false,
      });
    }

    return true;
  } catch (error) {
    console.log('Admin notification error:', error.message);
    return false;
  }
};

export default createNotification;
