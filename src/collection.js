var bb = require('backbone');
var _ = require('lodash');
var Radio = require('backbone.radio');
var IDBAdapter = require('./adapter');
var IDBModel = require('./model');
var sync = require('./sync');

module.exports = function (parent){

  var IDBCollection = parent.extend({

    model: IDBModel,

    name       : 'store',
    storePrefix: 'wc_pos_',

    constructor: function(){
      parent.apply(this, arguments);
      this.db = new IDBAdapter({ collection: this });
    },

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

      return sync('update', this, _.extend(options, {attrsArray: attrsArray}));
    },

    /**
     *
     */
    destroy: function(models, options){
      if(!options && models && !_.isArray(models)){
        options = models;
        models = undefined;
      } else {
        options = options || {};
      }

      var collection = this,
        wait = options.wait,
        success = options.success;

      if(models){
        options.attrsArray = _.map(models, function(model){
          return model instanceof bb.Model ? model.toJSON() : model;
        });
      }

      if(options.data){
        wait = true;
      }

      options.success = function(resp) {
        if(wait && !options.attrsArray) {
          collection.isNew(true);
          collection.reset();
        }
        if(wait && options.attrsArray) {
          collection.remove(options.attrsArray);
        }
        if (success) { success.call(options.context, collection, resp, options); }
        collection.trigger('sync', collection, resp, options);
      };

      if(!wait && !options.attrsArray) {
        collection.reset();
      }

      if(!wait && options.attrsArray) {
        collection.remove(options.attrsArray);
      }

      return sync('delete', this, options);
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
    },

    /**
     * Each website will have a unique idbVersion number
     * the version number is incremented on plugin update and some user actions
     * this version check will compare the version numbers
     * idb is flushed on version change
     */
    versionCheck: function () {
      var name = this.name;

      var newVersion = parseInt(Radio.request('entities', 'get', {
          type: 'option',
          name: 'idbVersion'
        }), 10) || 0;
      var oldVersion = parseInt(Radio.request('entities', 'get', {
          type: 'localStorage',
          name: name + '_idbVersion'
        }), 10) || 0;

      if (newVersion !== oldVersion) {
        this.destroy().then(function () {
          Radio.request('entities', 'set', {
            type: 'localStorage',
            name: name + '_idbVersion',
            data: newVersion
          });
        });
      }
    }

  });

  return IDBCollection;

};