const { Schema } = require('mongoose');
const bcrypt = require('bcryptjs');
const { createModel } = require('./modelAdapter');

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'operator'],
      default: 'operator',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = createModel('User', userSchema);

// Attach password helper function for in-memory & mongoose instances
User.comparePassword = async function (candidatePassword, hashedPassword) {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

User.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, 12);
};

module.exports = User;
