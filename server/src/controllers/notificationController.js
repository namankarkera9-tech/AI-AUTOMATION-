const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getNotifications(req.user.id);
  res.status(200).json({
    success: true,
    data: { notifications },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await notificationService.markAsRead(id, req.user.id);
  if (!updated) throw ApiError.notFound('Notification not found');
  res.status(200).json({
    success: true,
    data: { notification: updated },
  });
});

module.exports = {
  getNotifications,
  markAsRead,
};
