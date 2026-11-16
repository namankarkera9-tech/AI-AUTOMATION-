const mongoose = require('mongoose');
const { isMongoConnected } = require('../config/db');
const { memoryStore } = require('../utils/memoryStore');

function createModel(name, schema, customMethods = {}) {
  let MongooseModel = null;
  try {
    MongooseModel = mongoose.model(name);
  } catch (e) {
    MongooseModel = mongoose.model(name, schema);
  }

  const memoryCol = memoryStore.getCollection(name);

  // Return a proxy that directs calls to Mongoose if connected, or memoryStore if not
  return {
    async create(data) {
      if (isMongoConnected()) {
        return MongooseModel.create(data);
      }
      return memoryCol.create(data);
    },

    findOne(query = {}, projection = {}) {
      if (isMongoConnected()) {
        return MongooseModel.findOne(query, projection);
      }
      return memoryCol.findOne(query, projection);
    },

    findById(id) {
      if (isMongoConnected()) {
        return MongooseModel.findById(id);
      }
      return memoryCol.findById(id);
    },

    find(query = {}) {
      if (isMongoConnected()) {
        return MongooseModel.find(query);
      }
      return memoryCol.find(query);
    },

    async countDocuments(query = {}) {
      if (isMongoConnected()) {
        return MongooseModel.countDocuments(query);
      }
      return memoryCol.countDocuments(query);
    },

    async findByIdAndUpdate(id, update = {}, options = { new: true }) {
      if (isMongoConnected()) {
        return MongooseModel.findByIdAndUpdate(id, update, options);
      }
      return memoryCol.findByIdAndUpdate(id, update, options);
    },

    async findByIdAndDelete(id) {
      if (isMongoConnected()) {
        return MongooseModel.findByIdAndDelete(id);
      }
      return memoryCol.findByIdAndDelete(id);
    },

    async deleteMany(query = {}) {
      if (isMongoConnected()) {
        return MongooseModel.deleteMany(query);
      }
      return memoryCol.deleteMany(query);
    },

    schema,
    MongooseModel,
    memoryCol,
  };
}

module.exports = {
  createModel,
};
