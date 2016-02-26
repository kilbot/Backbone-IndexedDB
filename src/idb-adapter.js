var _ = require('lodash');

var indexedDB = window.indexedDB;
var Promise = window.Promise;

var consts = {
  'READ_ONLY'         : 'readonly',
  'READ_WRITE'        : 'readwrite',
  'VERSION_CHANGE'    : 'versionchange',
  'NEXT'              : 'next',
  'NEXT_NO_DUPLICATE' : 'nextunique',
  'PREV'              : 'prev',
  'PREV_NO_DUPLICATE' : 'prevunique'
};

var defaults = {
  storeName     : 'store',
  storePrefix   : 'Prefix_',
  dbVersion     : 1,
  keyPath       : 'id',
  autoIncrement : true,
  indexes       : []
};

function IDBAdapter( options ){
  this.opts = _.defaults( options, defaults );
  this.opts.dbName = this.opts.storePrefix + this.opts.storeName;
}

IDBAdapter.prototype = {

  constructor: IDBAdapter,

  open: function(){
    if( ! this._open ){
      var self = this;

      this._open = new Promise(function (resolve, reject) {
        var request = indexedDB.open(self.opts.dbName);

        request.onsuccess = function (event) {
          self.db = event.target.result;
          resolve(self.db);
        };

        request.onerror = function (event) {
          var err = new Error('open indexedDB error');
          err.code = event.target.errorCode;
          reject(err);
        };

        request.onupgradeneeded = function (event) {
          var store = event.currentTarget.result
            .createObjectStore(self.opts.storeName, self.opts);

          self.opts.indexes.forEach(function (index) {
            var unique = !!index.unique;
            store.createIndex(index.name, index.keyPath, {
              unique: unique
            });
          });
        };
      });
    }

    return this._open;
  },

  close: function(){
    this.db.close();
    this.db = undefined;
    this._open = undefined;
  },

  put: function( data ){
    var self = this;

    return new Promise(function (resolve, reject) {
      var objectStore = self.db
        .transaction([self.opts.storeName], consts.READ_WRITE)
        .objectStore(self.opts.storeName);

      var request = objectStore.put( data );

      request.onsuccess = function (event) {
        var key = event.target.result;

        return new Promise(function (undefined, reject){
          var request = objectStore.get( key );

          request.onsuccess = function(event){
            resolve( event.target.result );
          };

          request.onerror = function (event) {
            var err = new Error('get error');
            err.code = event.target.errorCode;
            reject(err);
          };

        });
      };

      request.onerror = function (event) {
        var err = new Error('put error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  }

};

//var IDBAdapter = function(){
//
//
//
//
//  var migration = {};
//  migration[opts.dbVersion] = function( database ){
//    var objStore = database.createObjectStore(opts.storeName, {
//      keyPath: opts.keyPath,
//      autoIncrement: opts.autoIncrement
//    });
//    _.each( opts.indexes, function( index ){
//      objStore.createIndex(index.name, index.keyPath, index);
//    });
//  };
//
//  return _.extend( {}, skladAPI, {
//
//    /**
//     *
//     */
//    open: function(){
//      if( ! this._openPromise ){
//        var dbName = opts.storePrefix + opts.storeName;
//        this._openPromise = skladAPI.open( dbName, {
//          version: opts.dbVersion,
//          migration: migration
//        });
//      }
//      return this._openPromise;
//    },
//
//    /**
//     *
//     */
//    create: function( entity, options ){
//      var data = entity.toJSON();
//      return this.open()
//        .then( function( conn ) {
//          return conn.insert( opts.storeName, data );
//        })
//        .then( function( key ) {
//          data[ opts.keyPath ] = key;
//          return data;
//        });
//    },
//
//    /**
//     *
//     */
//    read: function( entity, options ){
//      var key;
//      if( entity instanceof bb.Model ){
//        key = entity.get( opts.keyPath );
//      }
//      return this.open()
//        .then( function( conn ) {
//          return conn.get( opts.storeName, {
//            index: options.index || opts.keyPath,
//            key: key
//          });
//        });
//    },
//
//    /**
//     *
//     */
//    update: function( entity, options ){
//      var data = entity.toJSON();
//      return this.open()
//        .then( function( conn ) {
//          return conn.upsert( opts.storeName, data );
//        })
//        .then( function() {
//          return data;
//        });
//    },
//
//    /**
//     *
//     */
//    delete: function( entity, options ){
//
//    }
//
//  });
//};

module.exports = IDBAdapter;