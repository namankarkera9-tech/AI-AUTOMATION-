const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const result = await authService.register({ name, email, password, role });
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: result,
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({
    success: true,
    data: { user },
  });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateCurrentUser(req.user.id, req.body);
  res.status(200).json({ success: true, data: { user } });
});

module.exports = {
  register,
  login,
  getMe,
  updateMe,
};
