var _ = require('lodash');
var is_safari = navigator.userAgent.indexOf('Safari') !== -1 &&
  navigator.userAgent.indexOf('Chrome') === -1 &&
  navigator.userAgent.indexOf('Android') === -1;

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
  pageSize      : 10,
  onerror       : function(options) {
    options = options || {};
    var err = new Error(options._error.message);
    err.code = event.target.errorCode;
    options._error.callback(err);
  }
};

function IDBAdapter( options ){
  this.opts = _.defaults( options, defaults );
  this.opts.dbName = this.opts.storePrefix + this.opts.storeName;
}

IDBAdapter.prototype = {

  constructor: IDBAdapter,

  open: function (options) {
    options = options || {};
    if (!this._open) {
      var self = this;

      this._open = new Promise(function (resolve, reject) {
        var request = indexedDB.open(self.opts.dbName);

        request.onsuccess = function (event) {
          self.db = event.target.result;

          // hack for Safari
          if( is_safari ){
            return self.findHighestPrimaryKey()
              .then(function (key) {
                self.highestKey = key;
                resolve(self.db);
              });
          }

          resolve(self.db);
        };

        request.onerror = function (event) {
          options._error = {event: event, message: 'open indexedDB error', callback: reject};
          self.opts.onerror(options);
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

  close: function () {
    this.db.close();
    this.db = undefined;
    this._open = undefined;
  },

  getTransaction: function (access) {
    if(!this.txn || is_safari){
      this.txn = this.db.transaction([this.opts.storeName], access);
    }
    return this.txn;
    // transaction.oncomplete
    // transaction.onabort
    // transaction.onerror
  },

  getObjectStore: function (access) {
    if(!this.objectStore || is_safari){
      this.objectStore = this.getTransaction(access).objectStore(this.opts.storeName);
    }
    return this.objectStore;
  },

  count: function (options) {
    options = options || {};
    var self = this, objectStore = this.getObjectStore(consts.READ_ONLY);

    return new Promise(function (resolve, reject) {
      var request = objectStore.count();

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'count error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  create: function(data, options){
    var self = this;
    return this.add(data, options)
      .then(function(key){
        return self.get(key, options);
      });
  },

  update: function(data, options){
    var self = this;
    return this.put(data, options)
      .then(function(key){
        return self.get(key, options);
      });
  },

  put: function (data, options) {
    options = options || {};
    var self = this, keyPath = this.opts.keyPath;
    var objectStore = this.getObjectStore(consts.READ_WRITE);

    // merge on index keyPath
    if (options.index) {
      return this.merge(data, options);
    }

    if(!data[keyPath]){
      return this.add(data, options);
    }

    return new Promise(function (resolve, reject) {
      var request = objectStore.put(data);

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'put error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  add: function(data, options){
    options = options || {};
    var self = this, keyPath = this.opts.keyPath;
    var objectStore = this.getObjectStore(consts.READ_WRITE);

    if(is_safari){
      data[keyPath] = ++this.highestKey;
    }

    return new Promise(function (resolve, reject) {
      var request = objectStore.add(data);

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'add error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  get: function (key, options) {
    options = options || {};
    var self = this, objectStore = this.getObjectStore(consts.READ_ONLY);

    return new Promise(function (resolve, reject) {
      var request = objectStore.get(key);

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'get error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  delete: function (key, options) {
    options = options || {};
    var self = this, objectStore = this.getObjectStore(consts.READ_WRITE);

    return new Promise(function (resolve, reject) {
      var request = objectStore.delete(key);

      request.onsuccess = function (event) {
        resolve(event.target.result); // undefined
      };

      request.onerror = function (event) {
        var err = new Error('delete error');
        err.code = event.target.errorCode;
        reject(err);
      };
      request.onerror = function (event) {
        options._error = {event: event, message: 'delete error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  putBatch: function (dataArray, options) {
    options = options || {};
    var batch = [];

    _.each(dataArray, function (data) {
      batch.push(this.update(data, options));
    }.bind(this));

    return Promise.all(batch);
  },

  merge: function (data, options) {
    options = options || {};
    var self = this, keyPath = options.index, fn = _.merge;

    if(_.isObject(options.index)){
      keyPath = _.get(options, ['index', 'keyPath'], this.opts.keyPath);
      if(_.isFunction(options.index.merge)){
        fn = options.index.merge;
      }
    }

    return this.getByIndex(keyPath, data[keyPath], options)
      .then(function(result){
        return self.put(fn(result, data));
      });
  },

  getByIndex: function(keyPath, key, options){
    options = options || {};
    var self = this;
    var objectStore = this.getObjectStore(consts.READ_ONLY);
    var openIndex = objectStore.index(keyPath);
    var request = openIndex.get(key);

    return new Promise(function (resolve, reject) {
      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'get by index error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  getAll: function (options) {
    options = options || {};
    var self = this;
    var limit = _.get(options, ['data', 'filter', 'limit'], this.opts.pageSize);
    var objectStore = this.getObjectStore(consts.READ_ONLY);

    // getAll fallback
    if (objectStore.getAll === undefined) {
      return this._getAll(objectStore, limit, options);
    }

    return new Promise(function (resolve, reject) {
      var request = objectStore.getAll(null, limit);

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'getAll error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  _getAll: function (objectStore, limit, options) {
    options = options || {};
    var self = this;
    if (limit === -1) {
      limit = Infinity;
    }

    return new Promise(function (resolve, reject) {
      var request = objectStore.openCursor();
      var records = [];

      request.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor && records.length < limit) {
          records.push(cursor.value);
          return cursor.continue();
        }
        resolve(records);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'getAll error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  clear: function (options) {
    options = options || {};
    var self = this, objectStore = this.getObjectStore(consts.READ_WRITE);

    return new Promise(function (resolve, reject) {
      var request = objectStore.clear();

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'clear error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  findHighestPrimaryKey: function (options) {
    options = options || {};
    var self = this, objectStore = this.getObjectStore(consts.READ_ONLY);

    return new Promise(function (resolve, reject) {
      var request = objectStore.openCursor(null, consts.PREV);

      request.onsuccess = function (event) {
        resolve(event.target.result || 0);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'find highest key error', callback: reject};
        self.opts.onerror(options);
      };
    });
  }

};

module.exports = IDBAdapter;