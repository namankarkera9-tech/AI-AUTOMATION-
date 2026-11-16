const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout to failover to in-memory gracefully
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`[Database] MongoDB not available (${error.message}).`);
    console.log('[Database] Active fallback: High-performance In-Memory Document Store enabled for seamless local execution.');
    return false;
  }
};

const isMongoConnected = () => isConnected;

module.exports = {
  connectDB,
  isMongoConnected,
};
