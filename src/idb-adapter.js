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
  indexes       : [],
  pageSize      : 10
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
          var store = event.currentTarget.result.createObjectStore(self.opts.storeName, self.opts);

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

  getTransaction: function( access ){
    return this.db.transaction([this.opts.storeName], access);
    // transaction.oncomplete
    // transaction.onabort
    // transaction.onerror
  },

  getObjectStore: function( access ){
    return this.getTransaction(access).objectStore(this.opts.storeName);
  },

  count: function(){
    var objectStore = this.getObjectStore( consts.READ_ONLY );

    return new Promise(function (resolve, reject) {
      var request = objectStore.count();

      request.onsuccess = function (event) {
        resolve( event.target.result );
      };

      request.onerror = function (event) {
        var err = new Error('count error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  },

  put: function( data, options ){
    options = options || {};
    var self = this, objectStore;

    // merge on index keyPath
    if( options.index ){
      return this.merge( data, options );
    }

    // continue an open transaction
    if( options.objectStore ){
      objectStore = options.objectStore;
    } else {
      objectStore = this.getObjectStore( consts.READ_WRITE );
    }

    return new Promise(function (resolve, reject) {
      var request = objectStore.put( data );

      request.onsuccess = function (event) {
        self.get( event.target.result, {
          objectStore: objectStore
        })
        .then( resolve )
        .catch( reject );
      };

      request.onerror = function (event) {
        var err = new Error('put error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  },

  get: function( key, options ){
    options = options || {};
    var objectStore;

    // continue an open transaction
    if( options.objectStore ){
      objectStore = options.objectStore;
    } else {
      objectStore = this.getObjectStore( consts.READ_ONLY );
    }

    return new Promise(function (resolve, reject) {
      var request = objectStore.get( key );

      request.onsuccess = function (event) {
        resolve( event.target.result );
      };

      request.onerror = function (event) {
        var err = new Error('get error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  },

  delete: function( key, options ){
    options = options || {};
    var objectStore = this.getObjectStore( consts.READ_WRITE );

    return new Promise(function (resolve, reject) {
      var request = objectStore.delete( key );

      request.onsuccess = function (event) {
        resolve( event.target.result ); // undefined
      };

      request.onerror = function (event) {
        var err = new Error('delete error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  },

  putBatch: function( dataArray, options ){
    options = options || {};
    options.objectStore = this.getObjectStore( consts.READ_WRITE );
    var batch = [];

    _.each( dataArray, function(data){
      batch.push( this.put(data, options) );
    }.bind(this));

    return Promise.all(batch);
  },

  merge: function( data, options ){
    options = options || {};
    var self = this, objectStore = this.getObjectStore( consts.READ_WRITE );
    var keyPath = _.isString( options.index ) ? options.index :
      _.get( options, ['index', 'keyPath'], this.opts.keyPath );
    var key = data[keyPath];

    return new Promise(function (resolve, reject) {
      var objectStoreIndex = objectStore.index( keyPath );
      var request = objectStoreIndex.get( key );

      request.onsuccess = function (event) {
        var fn = _.isFunction( options.index.merge ) ? options.index.merge : _.merge ;
        self.put( fn( event.target.result, data ), { objectStore: objectStore } )
          .then( resolve );
      };

      request.onerror = function (event) {
        var err = new Error('merge error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  },

  getAll: function( options ){
    options = options || {};
    var limit = _.get( options, ['data', 'filter', 'limit'], this.opts.pageSize );
    var objectStore = this.getObjectStore( consts.READ_ONLY );

    // getAll fallback
    if( objectStore.getAll === undefined ){
      return this._getAll( options );
    }

    return new Promise(function (resolve, reject) {
      var request = objectStore.getAll(null, limit);

      request.onsuccess = function (event) {
        resolve( event.target.result );
      };

      request.onerror = function (event) {
        var err = new Error('getAll error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  },

  _getAll: function( options ){
    options = options || {};
    var limit = _.get( options, ['data', 'filter', 'limit'], this.opts.pageSize );
    var objectStore = this.getObjectStore( consts.READ_ONLY );

    return new Promise(function (resolve, reject) {
      var request = objectStore.openCursor();
      var records = [];

      request.onsuccess = function (event) {
        var cursor = event.target.result;
        if( cursor && records.length < limit ){
          records.push( cursor.value );
          return cursor.continue();
        }
        resolve( records );
      };

      request.onerror = function (event) {
        var err = new Error('getAll error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  },

  clear: function(){
    var objectStore = this.getObjectStore( consts.READ_WRITE );

    return new Promise(function (resolve, reject) {
      var request = objectStore.clear();

      request.onsuccess = function (event) {
        resolve( event.target.result );
      };

      request.onerror = function (event) {
        var err = new Error('clear error');
        err.code = event.target.errorCode;
        reject(err);
      };
    });
  }

};

module.exports = IDBAdapter;