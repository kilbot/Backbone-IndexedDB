var IDBAdapter = require('./adapter');
var idbSync = require('./sync');
var _ = require('lodash');

module.exports = function(Collection){
  
  return Collection.extend({

    constructor: function () {
      this.db = new IDBAdapter({ collection: this });
      Collection.apply(this, arguments);
    },

    sync: idbSync,

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
  
};