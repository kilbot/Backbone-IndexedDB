/**
 * Backbone adapter for idb-wrapper api
 */
var IDBStore = require('idb-wrapper');
var $ = require('jquery');
var _ = require('lodash');
var bb = require('backbone');

function IndexedDB(options) {
  options = options || {};
  this.options = options;
}

var methods = {

  /**
   *
   */
  open: function () {
    if( ! this._open ){
      var options = this.options || {};
      this._open = new $.Deferred();

      options.onStoreReady = this._open.resolve;
      options.onError = this._open.reject;

      this.store = new IDBStore(options);
    }

    return this._open;
  },

  /**
   * Wrapper for put, return full data
   */
  update: function(model) {
    var self = this, data = this._returnAttributes(model);

    return this.put(data)
      .then(function(key){
        return self.get(key);
      });
  },

  /**
   * Wrapper for remove, return full data
   */
  destroy: function(model) {
    var data = this._returnAttributes(model);
    var key = this._returnKey( data );

    return this.remove(key)
      .then(function(){
        return data;
      });
  },

  /**
   *
   */
  put: function (data) {
    var deferred = new $.Deferred();
    this.store.put(data, deferred.resolve, deferred.reject);
    return deferred.promise();
  },

  /**
   *
   */
  get: function (key) {
    key = this._returnKey(key);
    var deferred = new $.Deferred();
    try {
      this.store.get(key, deferred.resolve, deferred.reject);
    } catch(error) {
      deferred.reject(error);
    }
    return deferred.promise();
  },

  /**
   *
   */
  remove: function(key){
    var deferred = new $.Deferred();
    this.store.remove(key, deferred.resolve, deferred.reject);
    return deferred.promise();
  },

  /**
   *
   */
  getAll: function(){
    var deferred = new $.Deferred();
    this.store.getAll(deferred.resolve, deferred.reject);
    return deferred.promise();
  },

  /**
   * Iterates over the store using the given options and calling onItem
   * for each entry matching the options.
   */
  iterate: function(options) {
    options = options || {};
    var deferred = new $.Deferred();
    options.onEnd = deferred.resolve;
    options.onError = deferred.reject;
    var onItem = deferred.notify;
    this.store.iterate(onItem, options);
    return deferred.promise();
  },

  /**
   * Creates a key range using specified options. This key range can be
   * handed over to the count() and iterate() methods.
   *
   * Note: You must provide at least one or both of "lower" or "upper" value.
   */
  makeKeyRange: function(options) {
    return this.store.makeKeyRange(options);
  },

  /**
   * Perform a batch operation to save and/or remove models in the current
   * collection to indexedDB. This is a proxy to the idbstore `batch` method
   */
  batch: function(dataArray) {
    var deferred = new $.Deferred();
    dataArray = this._returnArrayOfAttributes( dataArray );
    this.store.batch(dataArray, deferred.resolve, deferred.reject);
    return deferred.promise();
  },

  /**
   * Perform a batch put operation to save models to indexedDB. This is a
   * proxy to the idbstore `putBatch` method
   */
  putBatch: function(dataArray) {
    if( !_.isArray(dataArray) ){
      return this.put(dataArray);
    }

    var deferred = new $.Deferred();
    dataArray = this._returnArrayOfAttributes( dataArray );
    this.store.putBatch(dataArray, deferred.resolve, deferred.reject);
    return deferred.promise();
  },

  /**
   *
   */
  upsertBatch: function(dataArray, options){
    if( !_.isArray(dataArray) ){
      return this.put(dataArray);
    }

    var dfd = new $.Deferred();
    dataArray = this._returnArrayOfAttributes( dataArray );
    this.store.upsertBatch(dataArray, options, dfd.resolve, dfd.reject);
    return dfd.promise();
  },

  /**
   * Perform a batch operation to remove models from indexedDB. This is a
   * proxy to the idbstore `removeBatch` method
   */
  removeBatch: function(keyArray) {
    if( !_.isArray(keyArray) ){
      return this.remove(keyArray);
    }
    var deferred = new $.Deferred();
    keyArray = this._returnArrayOfKeys( keyArray );
    this.store.removeBatch(keyArray, deferred.resolve, deferred.reject);
    return deferred.promise();
  },

  /**
   * Clears all content from the current indexedDB for this collection
   */
  clear: function() {
    var deferred = new $.Deferred();
    this.store.clear(deferred.resolve, deferred.reject);
    return deferred.promise();
  },

  /**
   *
   */
  query: function(index, keyRange){
    var deferred = new $.Deferred();

    this.store.query(deferred.resolve, {
      index: index,
      keyRange: keyRange,
      onError: deferred.reject
    });

    return deferred.promise();
  },

  /**
   * convert models to json
   */
  _returnAttributes: function(model){
    if(model instanceof bb.Model){
      return model.toJSON();
    }
    return model;
  },

  /**
   * convert collections to json
   */
  _returnArrayOfAttributes: function(models){
    return _.map( models, function( model ){
      return this._returnAttributes(model);
    }.bind(this));
  },

  /**
   * convert model to keyPath id
   */
  _returnKey: function(key){
    key = this._returnAttributes(key);
    if( _.isObject(key) && _.has(key, this.store.keyPath) ) {
      key = key[this.store.keyPath];
    }
    return key;
  },

  /**
   * convert collection to keyPath ids
   */
  _returnArrayOfKeys: function(keys){
    return _.map( keys, function( key ){
      return this._returnKey(key);
    }.bind(this));
  }

};

_.extend(IndexedDB.prototype, methods);
module.exports = IndexedDB;