const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

class AuthService {
  generateToken(user) {
    const payload = {
      id: user._id ? String(user._id) : String(user.id),
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  formatUser(user) {
    const raw = user.toObject ? user.toObject() : { ...user };
    delete raw.password;
    raw.id = raw._id ? String(raw._id) : String(raw.id);
    return raw;
  }

  async register({ name, email, password }) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const hashedPassword = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      // Public registration must never grant administrative privileges.
      role: 'operator',
      lastLogin: new Date(),
    });

    const token = this.generateToken(user);
    return {
      token,
      user: this.formatUser(user),
    };
  }

  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();
    // Use select('+password') or direct document
    // Explicitly include the select:false password field for credential comparison.
    const user = await User.findOne(
      { email: normalizedEmail },
      { password: 1, email: 1, name: 1, role: 1, lastLogin: 1 }
    );
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update lastLogin
    await User.findByIdAndUpdate(user._id || user.id, { lastLogin: new Date() });

    const token = this.generateToken(user);
    return {
      token,
      user: this.formatUser(user),
    };
  }

  async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return this.formatUser(user);
  }

  async updateCurrentUser(userId, { name, email }) {
    const update = {};
    if (typeof name === 'string') update.name = name.trim();
    if (typeof email === 'string') {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing && String(existing._id || existing.id) !== String(userId)) {
        throw ApiError.conflict('An account with this email address already exists');
      }
      update.email = normalizedEmail;
    }
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) throw ApiError.notFound('User not found');
    return this.formatUser(user);
  }
}

module.exports = new AuthService();
