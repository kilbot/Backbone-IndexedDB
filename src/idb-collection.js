var bb = require('backbone');
var IDBAdapter = require('./idb-adapter');
var IDBModel = require('./idb-model');
var _ = require('lodash');

var Collection = bb.Collection.extend({
  constructor: function() {
    bb.Collection.apply(this, arguments);
    this._isNew = true;
    this.once('sync', function() {
      this._isNew = false;
    });
  },

  isNew: function() {
    return this._isNew;
  }
});

// attach to Backbone
module.exports = bb.IDBCollection = Collection.extend({

  model: IDBModel,

  constructor: function () {
    var opts = {
      storeName    : this.name,
      storePrefix  : this.storePrefix,
      dbVersion    : this.dbVersion,
      keyPath      : this.keyPath,
      autoIncrement: this.autoIncrement,
      indexes      : this.indexes,
      pageSize     : this.pageSize
    };

    this.db = new IDBAdapter(opts);

    bb.Collection.apply(this, arguments);
  },

  /**
   * Clears the IDB storage and resets the collection
   */
  clear: function () {
    var self = this;
    return this.db.open()
      .then(function () {
        self.reset();
        return self.db.clear();
      });
  },

  /**
   *
   */
  count: function () {
    var self = this;
    return this.db.open()
      .then(function () {
        return self.db.count();
      })
      .then(function (count) {
        self.trigger('count', count);
        return count;
      });
  },

  /**
   *
   */
  putBatch: function (models, options) {
    options = options || {};
    var self = this;
    if (_.isEmpty(models)) {
      models = this.getChangedModels();
    }
    if (!models) {
      return;
    }
    return this.db.open()
      .then(function () {
        return self.db.putBatch(models, options);
      });
  },

  /**
   *
   */
  getBatch: function (keyArray, options) {
    var self = this;
    return this.db.open()
      .then(function () {
        return self.db.getBatch(keyArray, options);
      });
  },

  /**
   *
   */
  findHighestIndex: function (keyPath, options) {
    var self = this;
    return this.db.open()
      .then(function () {
        return self.db.findHighestIndex(keyPath, options);
      });
  },

  /**
   *
   */
  getChangedModels: function () {
    return this.filter(function (model) {
      return model.isNew() || model.hasChanged();
    });
  },

  /**
   *
   */
  removeBatch: function (models, options) {
    options = options || {};
    var self = this;
    if (_.isEmpty(models)) {
      return;
    }
    return this.db.open()
      .then(function () {
        return self.db.removeBatch(models);
      })
      .then(function () {
        self.remove(models);
        if (options.success) {
          options.success(self, models, options);
        }
        return models;
      });
  }

});