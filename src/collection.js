var bb = require('backbone');
var _ = require('lodash');
var IDBAdapter = require('./adapter');
var sync = require('./sync');

var methods = {

  sync: sync,

  /**
   *
   */
  /* jshint -W071, -W074 */
  save: function(models, options){
    options = options || {};
    var collection = this,
      wait = options.wait,
      success = options.success,
      setAttrs = options.set !== false;

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
      if (serverAttrs && setAttrs) { collection.set(serverAttrs, options); }
      if (success) { success.call(options.context, collection, resp, options); }
      collection.trigger('sync', collection, resp, options);
    };

    return this.sync('update', this, _.extend(options, {attrsArray: attrsArray}));
  },

  /**
   *
   */
  destroy: function(models, options){
    if(!options && models && !_.isArray(models)){
      options = models;
    } else {
      options = options || {};
    }

    var collection = this,
      wait = options.wait,
      success = options.success;

    options.attrsArray = _.map(models, function(model){
      return model instanceof bb.Model ? model.toJSON() : model;
    });

    if(options.data){
      wait = true;
    }

    options.success = function(resp) {
      if(wait && _.isEmpty(options.attrsArray) ) {
        collection.resetNew();
        collection.reset();
      }
      if(wait && !_.isEmpty(options.attrsArray)) {
        collection.remove(options.attrsArray);
      }
      if (success) { success.call(options.context, collection, resp, options); }
      collection.trigger('sync', collection, resp, options);
    };

    if(!wait && _.isEmpty(options.attrsArray) ) {
      collection.reset();
    }

    if(!wait && !_.isEmpty(options.attrsArray)) {
      collection.remove(options.attrsArray);
    }

    return this.sync('delete', this, options);
  },
  /* jshint +W071, +W074 */

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
  }
};

module.exports = function (collection){
  _.extend(collection, methods);
  collection.model.prototype.sync = sync;
  collection.db = new IDBAdapter({ collection: collection });
};