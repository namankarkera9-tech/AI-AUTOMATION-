const crypto = require('crypto');

/**
 * High-performance In-Memory Document Store providing MongoDB-compatible collection APIs.
 * Ensures zero-friction local development when MongoDB is not running locally.
 */
class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.documents = new Map();
  }

  _generateId() {
    return crypto.randomBytes(12).toString('hex');
  }

  _clone(doc) {
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  _matchesQuery(doc, query = {}) {
    for (const [key, val] of Object.entries(query)) {
      if (key === '_id' || key === 'id') {
        const docId = doc._id || doc.id;
        if (docId !== String(val)) return false;
        continue;
      }

      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if ('$in' in val && Array.isArray(val.$in)) {
          if (!val.$in.includes(doc[key])) return false;
          continue;
        }
        if ('$ne' in val) {
          if (doc[key] === val.$ne) return false;
          continue;
        }
      }

      if (doc[key] !== val) {
        return false;
      }
    }
    return true;
  }

  async create(data) {
    const docData = Array.isArray(data) ? data : [data];
    const createdDocs = docData.map((item) => {
      const _id = item._id ? String(item._id) : this._generateId();
      const now = new Date();
      const newDoc = {
        ...item,
        _id,
        id: _id,
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now,
      };
      this.documents.set(_id, newDoc);
      return this._wrapDocument(this._clone(newDoc));
    });

    return Array.isArray(data) ? createdDocs : createdDocs[0];
  }

  async findOne(query = {}, projection = {}) {
    for (const doc of this.documents.values()) {
      if (this._matchesQuery(doc, query)) {
        return this._wrapDocument(this._clone(doc));
      }
    }
    return null;
  }

  async findById(id) {
    const doc = this.documents.get(String(id));
    if (!doc) return null;
    return this._wrapDocument(this._clone(doc));
  }

  find(query = {}) {
    const self = this;
    const matched = [];
    for (const doc of this.documents.values()) {
      if (this._matchesQuery(doc, query)) {
        matched.push(this._clone(doc));
      }
    }

    let sortFn = null;
    let skipCount = 0;
    let limitCount = Infinity;
    let selectFields = null;

    const queryPromise = {
      sort(criteria) {
        sortFn = (a, b) => {
          for (const [field, dir] of Object.entries(criteria)) {
            const mult = dir === -1 || dir === 'desc' ? -1 : 1;
            if (a[field] < b[field]) return -1 * mult;
            if (a[field] > b[field]) return 1 * mult;
          }
          return 0;
        };
        return queryPromise;
      },
      skip(n) {
        skipCount = Number(n) || 0;
        return queryPromise;
      },
      limit(n) {
        limitCount = Number(n) || Infinity;
        return queryPromise;
      },
      select(fields) {
        selectFields = fields;
        return queryPromise;
      },
      populate() {
        return queryPromise; // noop for memory store
      },
      async then(resolve, reject) {
        try {
          let results = matched;
          if (sortFn) {
            results = [...results].sort(sortFn);
          }
          if (skipCount > 0 || limitCount !== Infinity) {
            results = results.slice(skipCount, skipCount + limitCount);
          }
          const wrapped = results.map((d) => self._wrapDocument(d));
          resolve(wrapped);
        } catch (err) {
          reject(err);
        }
      },
    };

    return queryPromise;
  }

  async countDocuments(query = {}) {
    let count = 0;
    for (const doc of this.documents.values()) {
      if (this._matchesQuery(doc, query)) {
        count++;
      }
    }
    return count;
  }

  async findByIdAndUpdate(id, update = {}, options = { new: true }) {
    const strId = String(id);
    const existing = this.documents.get(strId);
    if (!existing) return null;

    const $set = update.$set || (update.$inc || update.$push || update.$unset ? {} : update);
    const updated = {
      ...existing,
      ...$set,
      updatedAt: new Date(),
    };

    if (update.$inc) {
      for (const [key, incVal] of Object.entries(update.$inc)) {
        updated[key] = (Number(updated[key]) || 0) + Number(incVal);
      }
    }

    if (update.$push) {
      for (const [key, value] of Object.entries(update.$push)) {
        const values = Array.isArray(value?.$each) ? value.$each : [value];
        updated[key] = [...(Array.isArray(updated[key]) ? updated[key] : []), ...values];
      }
    }

    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) delete updated[key];
    }

    this.documents.set(strId, updated);
    return this._wrapDocument(this._clone(options.new ? updated : existing));
  }

  async findByIdAndDelete(id) {
    const strId = String(id);
    const existing = this.documents.get(strId);
    if (!existing) return null;
    this.documents.delete(strId);
    return this._wrapDocument(this._clone(existing));
  }

  async deleteMany(query = {}) {
    let deletedCount = 0;
    for (const [id, doc] of this.documents.entries()) {
      if (this._matchesQuery(doc, query)) {
        this.documents.delete(id);
        deletedCount++;
      }
    }
    return { deletedCount };
  }

  _wrapDocument(doc) {
    if (!doc) return null;
    const self = this;
    // Add Mongoose document helper methods
    doc.save = async function () {
      this.updatedAt = new Date();
      self.documents.set(String(this._id), self._clone(this));
      return this;
    };
    doc.toObject = function () {
      const copy = { ...this };
      delete copy.save;
      delete copy.toObject;
      delete copy.toJSON;
      return copy;
    };
    doc.toJSON = doc.toObject;
    return doc;
  }
}

class MemoryStore {
  constructor() {
    this.collections = new Map();
  }

  getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection(name));
    }
    return this.collections.get(name);
  }

  clear() {
    this.collections.clear();
  }
}

const memoryStore = new MemoryStore();

module.exports = {
  memoryStore,
  MemoryCollection,
};
