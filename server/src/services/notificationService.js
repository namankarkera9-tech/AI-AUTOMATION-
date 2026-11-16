const Notification = require('../models/Notification');
const { emitNotification } = require('../config/socket');

class NotificationService {
  async getNotifications(userId) {
    const list = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
    return list;
  }

  async createNotification({ userId, workflowId = null, executionId = null, type = 'info', title, message, metadata = {} }) {
    const notification = await Notification.create({
      userId,
      workflowId,
      executionId,
      type,
      title,
      message,
      isRead: false,
      metadata,
    });

    const notifObj = notification.toObject ? notification.toObject() : notification;
    emitNotification(userId, notifObj);
    return notifObj;
  }

  async markAsRead(id, userId) {
    const existing = await Notification.findById(id);
    if (!existing || String(existing.userId) !== String(userId)) return null;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    return notification;
  }

  async markAllAsRead(userId) {
    const notifications = await Notification.find({ userId, isRead: false });
    await Promise.all(notifications.map((notification) =>
      Notification.findByIdAndUpdate(notification._id || notification.id, { isRead: true }, { new: true })
    ));
    return { success: true, updated: notifications.length };
  }
}

module.exports = new NotificationService();
