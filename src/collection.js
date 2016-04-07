var IDBAdapter = require('./adapter');
var IDBModel = require('./model');
var _ = require('lodash');
var bb = require('backbone');

module.exports = bb.Collection.extend({
  
  model: IDBModel,

  constructor: function () {
    this.db = new IDBAdapter({ collection: this });
    bb.Collection.apply(this, arguments);
  },

  /**
   *
   */
  /* jshint -W071, -W074 */
  save: function(models, options){
    options = options || {};
    var collection = this;
    var wait = options.wait;
    var setAttrs = options.set !== false;
    var success = options.success;

    if(models === null){
      models = this.getChangedModels();
    }

    var attrsArray = _.map(models, function(model){
      return model instanceof bb.Model ? model.toJSON() : model;
    });

    if(!wait && setAttrs){
      this.set(attrsArray, options);
    }

    options.success = function(resp) {
      var serverAttrs = options.parse ? collection.parse(resp, options) : resp;
      if (wait) { serverAttrs = _.extend({}, attrsArray, serverAttrs); }
      if (serverAttrs && setAttrs) { collection.set(serverAttrs, options); }
      if (success) { success.call(options.context, collection, resp, options); }
      collection.trigger('sync', collection, resp, options);
    };

    return this.sync('update', this, _.extend(options, {attrsArray: attrsArray}));
  },
  /* jshint +W071, +W074 */

  /**
   *
   */
  /* jshint -W071 */
  fetch: function(options){
    options = _.extend({parse: true}, options);
    var setAttrs = options.set !== false;
    var success = options.success;
    var collection = this;

    if(this.pageSize){
      var limit = _.get(options, ['data', 'filter', 'limit']);
      if(!limit) { _.set(options, 'data.filter.limit', this.pageSize); }
    }

    options.success = function(resp) {
      var method = options.reset ? 'reset' : 'set';
      if (setAttrs) { collection[method](resp, options); }
      if (success) { success.call(options.context, collection, resp, options); }
      collection.trigger('sync', collection, resp, options);
    };
    return this.sync('read', this, options);
  },
  /* jshint +W071 */

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