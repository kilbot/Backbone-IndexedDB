/* jshint -W071, -W074 */
var _ = require('lodash');
var matchMaker = require('json-query');

var is_safari = window.navigator.userAgent.indexOf('Safari') !== -1 &&
  window.navigator.userAgent.indexOf('Chrome') === -1 &&
  window.navigator.userAgent.indexOf('Android') === -1;

var indexedDB = window.indexedDB;
var IDBKeyRange = window.IDBKeyRange;

var consts = {
  'READ_ONLY'         : 'readonly',
  'READ_WRITE'        : 'readwrite',
  'VERSION_CHANGE'    : 'versionchange',
  'NEXT'              : 'next',
  'NEXT_NO_DUPLICATE' : 'nextunique',
  'PREV'              : 'prev',
  'PREV_NO_DUPLICATE' : 'prevunique'
};

function IDBAdapter( options ){
  options = options || {};
  this.parent = options.collection;
  this.opts = _.defaults(_.pick(this.parent, _.keys(this.default)), this.default);
  this.opts.name = this.parent.name || this.default.name;
  this.opts.dbName = this.opts.localDBPrefix + this.opts.name;
}

IDBAdapter.prototype = {

  default: {
    name          : 'store',
    localDBPrefix : 'Prefix_',
    dbVersion     : 1,
    keyPath       : 'id',
    autoIncrement : true,
    indexes       : [],
    matchMaker    : matchMaker,
    onerror       : function (options) {
      var error = _.get(options, '_error', {});
      var e = new Error(error.message);
      e.code = _.get(options, ['target', 'errorCode']);
      if(error.callback){
        error.callback(e);
      }
    }
  },

  constructor: IDBAdapter,

  open: function (options) {
    options = options || {};
    if (!this._open) {
      var self = this;

      this._open = new Promise(function (resolve, reject) {
        var request = indexedDB.open(self.opts.dbName);

        // request = null in Safari Private Browsing
        if(!request){
          options._error = {message: 'open indexedDB error', callback: reject};
          self.opts.onerror(options);
        }

        request.onsuccess = function (event) {
          self.db = event.target.result;

          // get count & safari hack
          self.count()
            .then(function () {
              if (is_safari) {
                return self.getBatch(null, { data: { filter: { limit: 1, order: 'DESC' } } });
              }
            })
            .then(function (resp) {
              if(is_safari){
                self.highestKey = _.isEmpty(resp) ? 0 : resp[0][self.opts.keyPath];
              }
              resolve(self.db);
            });
        };

        request.onerror = function (event) {
          options._error = {event: event, message: 'open indexedDB error', callback: reject};
          self.opts.onerror(options);
        };

        request.onupgradeneeded = function (event) {
          var store = event.currentTarget.result.createObjectStore(self.opts.name, self.opts);

          self.opts.indexes.forEach(function (index) {
            store.createIndex(index.name, index.keyPath, {
              unique: index.unique
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

  read: function(key, options){
    var get = key ? this.get : this.getBatch;
    return get.call(this, key, options);
  },

  update: function(data, options){
    var put = _.isArray(data) ? this.putBatch : this.put;
    var get = _.isArray(data) ? this.getBatch : this.get;
    var self = this;
    return put.call(this, data, options)
      .then(function (resp) {
        resp = resp || [];
        options.index = undefined;
        options.objectStore = undefined;
        // see bug test
        var filter = _.get(options, ['data', 'filter']);
        if(filter){
          delete filter['in'];
          delete filter.not_in;
        }
        return get.call(self, resp, options);
      });
  },

  delete: function(key, options){
    var remove = key ? this.remove : this.removeBatch;
    return remove.call(this, key, options);
  },

  getTransaction: function (access) {
    return this.db.transaction([this.opts.name], access);
  },

  getObjectStore: function (access) {
    return this.getTransaction(access).objectStore(this.opts.name);
  },

  count: function (options) {
    options = options || {};
    var self = this, objectStore = options.objectStore || this.getObjectStore(consts.READ_ONLY);

    return new Promise(function (resolve, reject) {
      var request = objectStore.count();

      request.onsuccess = function (event) {
        self.length = event.target.result || 0;
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'count error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  put: function (data, options) {
    options = options || {};
    var objectStore = options.objectStore || this.getObjectStore(consts.READ_WRITE);
    var self = this, keyPath = this.opts.keyPath;

    // merge on index keyPath
    if (options.index && !options.mergeBatch) {
      return this.merge(data, options);
    }

    if (!data[keyPath]) {
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

  add: function (data, options) {
    options = options || {};
    var objectStore = options.objectStore || this.getObjectStore(consts.READ_WRITE);
    var self = this, keyPath = this.opts.keyPath;

    if (is_safari) {
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
    var objectStore = options.objectStore || this.getObjectStore(consts.READ_ONLY),
      keyPath     = options.index || this.opts.keyPath,
      self        = this;

    if (_.isObject(keyPath)) {
      keyPath = keyPath.keyPath;
    }

    return new Promise(function (resolve, reject) {
      var request = (keyPath === self.opts.keyPath) ?
        objectStore.get(key) : objectStore.index(keyPath).get(key);

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'get error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  remove: function (key, options) {
    options = options || {};
    var objectStore = options.objectStore || this.getObjectStore(consts.READ_WRITE),
      keyPath     = options.index || this.opts.keyPath,
      self        = this;

    if(_.isObject(key)){
      key = key[keyPath];
    }

    return new Promise(function (resolve, reject) {
      var request = (keyPath === self.opts.keyPath) ?
        objectStore.delete(key) : objectStore.index(keyPath).delete(key);

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
    options.objectStore = options.objectStore || this.getObjectStore(consts.READ_WRITE);
    // var put = this.put.bind(this), batch = [];
    var batch = [];

    // more performant batch merge
    if (options.index && !options.mergeBatch) {
      return this.mergeBatch(dataArray, options);
    }

    // all at once
    _.each(dataArray, function (data) {
      batch.push(this.put(data, options));
    }.bind(this));

    return Promise.all(batch);

    // chain promises
    // return dataArray.reduce(function(promise, data) {
    //   return promise.then(function(){
    //     return put(data, options)
    //       .then(function(resp){
    //         batch.push(resp);
    //         return batch;
    //       });
    //   });
    // }, Promise.resolve([]));
  },

  /**
   * 4/3/2016: Chrome can do a fast merge on one transaction, but other browsers can't
   */
  merge: function (data, options) {
    options = options || {};
    var self = this, keyPath = options.index;
    var primaryKey = this.opts.keyPath;

    var fn = function (local, remote, keyPath) {
      if (local) {
        remote[keyPath] = local[keyPath];
      }
      return remote;
    };

    if (_.isObject(options.index)) {
      keyPath = _.get(options, ['index', 'keyPath'], primaryKey);
      if (_.isFunction(options.index.merge)) {
        fn = options.index.merge;
      }
    }

    return this.get(data[keyPath], {index: keyPath, objectStore: options.objectStore})
      .then(function (result) {
        return self.put(fn(result, data, primaryKey));
      });
  },

  getBatch: function (keyArray, options) {
    options = options || {};

    var objectStore = options.objectStore || this.getObjectStore(consts.READ_ONLY),
      include     = _.isArray(keyArray) ? keyArray : _.get(options, ['data', 'filter', 'in']),
      exclude     = _.get(options, ['data', 'filter', 'not_in']),
      limit       = _.get(options, ['data', 'filter', 'limit'], -1),
      start       = _.get(options, ['data', 'filter', 'offset'], 0),
      order       = _.get(options, ['data', 'filter', 'order'], 'ASC'),
      orderby     = _.get(options, ['data', 'filter', 'orderby']),
      direction   = order === 'DESC' ? consts.PREV : consts.NEXT,
      query       = _.get(options, ['data', 'filter', 'q']),
      keyPath     = options.index || this.opts.keyPath,
      page        = _.get(options, ['data', 'page']),
      self        = this,
      range       = null,
      end;

    if (_.isObject(keyPath)) {
      if(keyPath.value){
        range = IDBKeyRange.only(keyPath.value);
      }
      keyPath = keyPath.keyPath;
    }

    if (page && limit !== -1) {
      start = (page - 1) * limit;
    }

    // in & not_in can be strings eg: '1,2,3' for WC REST API
    // make sure these are turned into an array
    include = _.isString(include) ? _.map(include.split(','), _.parseInt) : include;
    exclude = _.isString(exclude) ? _.map(exclude.split(','), _.parseInt) : exclude;

    return new Promise(function (resolve, reject) {
      var records = [], delayed = 0, excluded = 0;
      var request = (keyPath === self.opts.keyPath) ?
        objectStore.openCursor(range, direction) :
        objectStore.index(keyPath).openCursor(range, direction);

      request.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          if (cursor.value._state === 'READ_FAILED') {
            delayed++;
          }
          if (
            (!include || _.includes(include, cursor.value[keyPath])) &&
            (!exclude || !_.includes(exclude, cursor.value[keyPath])) &&
            (!query || self._match(query, cursor.value, keyPath, options))
          ) {
            records.push(cursor.value);
          } else if (exclude && _.includes(exclude, cursor.value[keyPath])){
            excluded++;
          }
          return cursor.continue();
        }
        _.set(options, 'idb', {
          total: records.length + excluded,
          delayed: delayed
        });
        // _.set(options, 'idb.total', records.length + excluded);
        // _.set(options, 'idb.delayed', delayed);
        end = limit !== -1 ? start + limit : records.length;

        // temp fix for lodash v3 compatibility
        records = _.isFunction(_.sortByOrder) ?
          _.sortByOrder(records, orderby, order.toLowerCase()) :
          _.orderBy(records, orderby, order.toLowerCase());

        resolve(_.slice(records, start, end));
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'getAll error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  removeBatch: function(dataArray, options) {
    var batch = [];
    options = options || {};
    dataArray = dataArray || options.attrsArray;

    if(_.isEmpty(dataArray) && !options.data){
      return this.clear(options);
    }

    if(options.data){
      var self = this;
      return this.getBatch(null, options)
        .then(function(response){
          options.attrsArray = _.map(response, self.opts.keyPath);
          if(!_.isEmpty(options.attrsArray)){
            return self.removeBatch(options.attrsArray);
          }
        });
    }

    _.each(dataArray, function (data) {
      batch.push(this.remove(data, options));
    }.bind(this));

    return Promise.all(batch);
  },

  clear: function (options) {
    options = options || {};
    var self = this, objectStore = options.objectStore || this.getObjectStore(consts.READ_WRITE);

    return new Promise(function (resolve, reject) {
      var request = objectStore.clear();

      request.onsuccess = function (event) {
        self.length = 0;
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        options._error = {event: event, message: 'clear error', callback: reject};
        self.opts.onerror(options);
      };
    });
  },

  _match: function (query, json, keyPath, options) {
    var fields = _.get(options, ['data', 'filter', 'qFields'], keyPath);
    return this.opts.matchMaker.call(this, json, query, {fields: fields});
  },

  mergeBatch: function(dataArray, options) {
    options = options || {};
    options.mergeBatch = true;
    options.objectStore = undefined;

    var keyPath = options.index || this.opts.keyPath;
    var primaryKey = this.opts.keyPath;
    var batch = [], putBatch = [];
    var self = this;

    var mergeFn = function (local, remote, keyPath) {
      if (local) {
        remote[keyPath] = local[keyPath];
      }
      return remote;
    };

    if (_.isObject(keyPath)) {
      mergeFn = keyPath.merge || mergeFn;
      keyPath = keyPath.keyPath;
    }

    _.each(dataArray, function (data) {
      var key = data[keyPath];
      batch.push(
        this.get(key, options)
          .then(function (local) {
            putBatch.push(mergeFn(local, data, primaryKey));
          })
      );
    }.bind(this));

    return Promise.all(batch)
      .then(function () {
        return self.putBatch(putBatch, options);
      });
  }

};

module.exports = IDBAdapter;
/* jshint +W071, +W074 */