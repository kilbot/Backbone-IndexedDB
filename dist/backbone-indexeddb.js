var app =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * extend Backbone Collection for app use
	 */
	var bb = __webpack_require__(1);
	var decorate = __webpack_require__(2);

	module.exports = {
	  Collection : bb.Collection.extend({

	    constructor: function () {
	      bb.Collection.apply(this, arguments);
	      decorate(this);
	    }

	  })
	};

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = Backbone;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var bb = __webpack_require__(1);
	var _ = __webpack_require__(3);
	var IDBAdapter = __webpack_require__(4);
	var sync = __webpack_require__(7);

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

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = _;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/* jshint -W071, -W074 */
	var _ = __webpack_require__(3);
	var matchMaker = __webpack_require__(5);

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
	  this.opts.storeName = this.parent.name || this.default.storeName;
	  this.opts.dbName = this.opts.storePrefix + this.opts.storeName;
	}

	IDBAdapter.prototype = {

	  default: {
	    storeName    : 'store',
	    storePrefix  : 'Prefix_',
	    dbVersion    : 1,
	    keyPath      : 'id',
	    autoIncrement: true,
	    indexes      : [],
	    matchMaker   : matchMaker,
	    onerror      : function (options) {
	      options = options || {};
	      var err = new Error(options._error.message);
	      err.code = event.target.errorCode;
	      options._error.callback(err);
	    }
	  },

	  constructor: IDBAdapter,

	  open: function (options) {
	    options = options || {};
	    if (!this._open) {
	      var self = this;

	      this._open = new Promise(function (resolve, reject) {
	        var request = indexedDB.open(self.opts.dbName);

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
	          var store = event.currentTarget.result.createObjectStore(self.opts.storeName, self.opts);

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
	        return get.call(self, resp);
	      });
	  },

	  delete: function(key, options){
	    var remove = key ? this.remove : this.removeBatch;
	    return remove.call(this, key, options);
	  },

	  getTransaction: function (access) {
	    return this.db.transaction([this.opts.storeName], access);
	  },

	  getObjectStore: function (access) {
	    return this.getTransaction(access).objectStore(this.opts.storeName);
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
	    if (options.index) {
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
	    var batch = [];

	    _.each(dataArray, function (data) {
	      batch.push(this.put(data, options));
	    }.bind(this));

	    return Promise.all(batch);
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

	    return new Promise(function (resolve, reject) {
	      var records = [], delayed = 0;
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
	          }
	          return cursor.continue();
	        }
	        _.set(options, 'idb.total', records.length);
	        _.set(options, 'idb.delayed', delayed);
	        end = limit !== -1 ? start + limit : records.length;
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
	          return self.removeBatch(options.attrsArray);
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
	    var fields = _.get(options, ['data', 'filter', 'fields'], keyPath);
	    return this.opts.matchMaker.call(this, json, query, {fields: fields});
	  }

	};

	module.exports = IDBAdapter;
	/* jshint +W071, +W074 */

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);
	var match = __webpack_require__(6);

	var defaults = {
	  fields: ['title'] // json property to use for simple string search
	};

	var pick = function(json, props){
	  return _.chain(props)
	    .map(function (key) {
	      var attr = _.get(json, key); // allows nested get

	      // special case, eg: attributes: [{name: 'Size'}, {name: 'Color'}]
	      if(attr === undefined){
	        var keys = key.split('.');
	        attr = _.chain(json).get(keys[0]).map(keys[1]).value();
	      }

	      return attr;
	    })
	    .value();
	};

	var methods = {

	  string: function(json, filter, options) {
	    var fields = _.isArray(options.fields) ? options.fields : [options.fields];
	    var needle = filter.query ? filter.query.toLowerCase() : '';
	    var haystacks = pick(json, fields);

	    return _.some(haystacks, function (haystack) {
	      return match(haystack, needle, options);
	    });
	  },

	  prefix: function(json, filter){
	    return this.string(json, filter, {fields: filter.prefix});
	  },

	  range: function(json, filter, options){
	    var fields = _.isArray(options.fields) ? options.fields : [options.fields];
	    var haystacks = pick(json, fields);

	    return _.some(haystacks, function (haystack) {
	      return _.inRange(haystack, filter.from, filter.to);
	    });
	  },

	  prange: function(json, filter){
	    return this.range(json, filter, {fields: filter.prefix});
	  },

	  or: function(json, filter, options){
	    var self = this;
	    return _.some(filter.queries, function(query){
	      return self[query.type](json, query, options);
	    });
	  },

	  and: function(json, filter, options){
	    var self = this;
	    return _.every(filter.queries, function(query){
	      return self[query.type](json, query, options);
	    });
	  }

	};

	module.exports = function(json, filterArray, options) {
	  var opts = _.defaults({}, options, defaults);

	  if (!_.isArray(filterArray)) {
	    filterArray = [{type: 'string', query: filterArray.toString()}];
	  }

	  // logical AND
	  return _.every(filterArray, function (filter) {
	    return methods[filter.type](json, filter, opts);
	  });
	};

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);

	var toType = function(obj){
	  return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
	};

	var defaults = {

	};

	var match = {
	  'string': function(str, value, options){
	    if(options.exact || _.isEmpty(value)){
	      return str.toLowerCase() === value;
	    }
	    return str.toLowerCase().indexOf( value ) !== -1;
	  },

	  'number': function(number, value, options){
	    if(options.exact){
	      return number.toString() === value;
	    }
	    return number.toString().indexOf( value ) !== -1;
	  },

	  'boolean': function(bool, value){
	    return bool.toString() === value;
	  },

	  'array': function(array, value){
	    var self = this;
	    return _.some(array, function(elem){
	      var type = toType(elem);
	      return self[type](elem, value, {exact: true});
	    });
	  },

	  'undefined': function(){
	    // console.log(arguments);
	  }
	};

	module.exports = function(haystack, needle, options){
	  var opts = _.defaults({json: haystack}, options, defaults);
	  var type = toType(haystack);
	  if(match[type]){
	    return match[type](haystack, needle, opts);
	  }
	};

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var bb = __webpack_require__(1);

	/* jshint -W074 */
	module.exports = function(method, entity, options) {
	  options = options || {};
	  var isModel = entity instanceof bb.Model,
	      data = options.attrsArray,
	      db = entity.db,
	      key;

	  if(isModel){
	    db = entity.collection.db;
	    key = options.index ? entity.get(options.index) : entity.id;
	    data = entity.toJSON();
	  }

	  return db.open()
	    .then(function () {
	      switch (method) {
	        case 'create':
	        case 'update':
	        case 'patch':
	          return db.update(data, options);
	        case 'read':
	          return db.read(key, options);
	        case 'delete':
	          return db.delete(key, options);
	      }
	    })
	    .then(function (resp) {
	      if (options.success) { options.success(resp); }
	      return resp;
	    })
	    .catch(function (resp) {
	      if (options.error) { options.error(resp); }
	    });

	};
	/* jshint +W074 */

/***/ }
/******/ ]);