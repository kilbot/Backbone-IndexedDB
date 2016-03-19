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

	var bb = __webpack_require__(1);

	var createIDBModel = __webpack_require__(2);
	var createIDBCollection = __webpack_require__(4);

	bb.sync = __webpack_require__(8);
	bb.IDBModel = createIDBModel(bb.Model);
	bb.IDBCollection = createIDBCollection(bb.Collection);
	bb.IDBCollection.prototype.model = bb.IDBModel;

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = Backbone;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);

	module.exports = function(Model){

	  return Model.extend({

	    constructor: function (attributes, options) {
	      this.db = _.get(options, ['collection', 'db']);
	      if (!this.db) {
	        throw Error('Model must be in an IDBCollection');
	      }

	      Model.apply(this, arguments);
	    }

	  });

	};

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = _;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var IDBAdapter = __webpack_require__(5);
	var _ = __webpack_require__(3);

	module.exports = function(Collection){
	  
	  return Collection.extend({

	    constructor: function () {
	      this.db = new IDBAdapter({ collection: this });
	      Collection.apply(this, arguments);
	    },
	    
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

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/* jshint -W071, -W074 */
	var _ = __webpack_require__(3);
	var matchMaker = __webpack_require__(6);

	var is_safari = window.navigator.userAgent.indexOf('Safari') !== -1 &&
	  window.navigator.userAgent.indexOf('Chrome') === -1 &&
	  window.navigator.userAgent.indexOf('Android') === -1;

	var indexedDB = window.indexedDB;

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
	    storeName     : 'store',
	    storePrefix   : 'Prefix_',
	    dbVersion     : 1,
	    keyPath       : 'id',
	    autoIncrement : true,
	    indexes       : [],
	    pageSize      : 10,
	    matchMaker    : matchMaker,
	    onerror       : function(options) {
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
	              if(is_safari){
	                return self.findHighestIndex();
	              }
	            })
	            .then(function (key) {
	              if(is_safari){
	                self.highestKey = key || 0;
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
	    var objectStore = options.objectStore || this.getObjectStore(consts.READ_WRITE);
	    var self = this, keyPath = this.opts.keyPath;

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
	    var self = this, objectStore = options.objectStore || this.getObjectStore(consts.READ_ONLY);

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
	    var self = this, objectStore = options.objectStore || this.getObjectStore(consts.READ_WRITE);

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

	    var fn = function(local, remote, keyPath){
	      if(local){
	        remote[keyPath] = local[keyPath];
	      }
	      return remote;
	    };

	    if(_.isObject(options.index)){
	      keyPath = _.get(options, ['index', 'keyPath'], primaryKey);
	      if(_.isFunction(options.index.merge)){
	        fn = options.index.merge;
	      }
	    }

	    return this.getByIndex(keyPath, data[keyPath], options)
	      .then(function(result){
	        return self.put(fn(result, data, primaryKey));
	      });
	  },

	  getByIndex: function(keyPath, key, options){
	    options = options || {};
	    var objectStore = options.objectStore || this.getObjectStore(consts.READ_ONLY),
	        openIndex = objectStore.index(keyPath),
	        request = openIndex.get(key),
	        self = this;

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

	  getBatch: function (keyArray, options) {
	    options = options || keyArray || {};
	    var self = this, objectStore = options.objectStore || this.getObjectStore(consts.READ_ONLY);

	    if(_.isArray(keyArray)){
	      options.filter = _.merge({in: keyArray}, options.filter);
	    }

	    if (objectStore.getAll === undefined || this.hasGetParams(options)) {
	      if(!options.objectStore){
	        options.objectStore = objectStore;
	      }
	      return this.getAll(options);
	    }

	    var limit = _.get(options, ['filter', 'limit'], this.opts.pageSize);
	    if (limit === -1) {
	      limit = null; // firefox doesn't like -1 or Infinity
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

	  getAll: function (options) {
	    options = options || {};
	    var objectStore = options.objectStore || this.getObjectStore(consts.READ_ONLY),
	        limit = _.get(options, ['filter', 'limit'], this.opts.pageSize),
	        offset = _.get(options, ['filter', 'offset'], 0),
	        include = _.get(options, ['filter', 'in']),
	        query = _.get(options, ['filter', 'q']),
	        keyPath = options.index || this.opts.keyPath,
	        page = options.page,
	        self = this;

	    if(_.isObject(keyPath)){
	      keyPath = keyPath.keyPath;
	    }

	    if (limit === -1) {
	      limit = Infinity;
	    }

	    if(page){
	      offset = (page - 1) * limit;
	    }

	    return new Promise(function (resolve, reject) {
	      var records = [], idx = 0;
	      var request = (keyPath === self.opts.keyPath) ?
	        objectStore.openCursor() : objectStore.index(keyPath).openCursor();

	      request.onsuccess = function (event) {
	        var cursor = event.target.result;
	        if (cursor && records.length < limit) {
	          if(
	            (!include || _.includes(include, cursor.value[keyPath])) &&
	            (!query || self._match(query, cursor.value, keyPath, options)) &&
	            ++idx > offset
	          ){
	            records.push(cursor.value);
	          }
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

	  findHighestIndex: function (keyPath, options) {
	    options = options || {};
	    var self = this, objectStore = options.objectStore || this.getObjectStore(consts.READ_ONLY);

	    return new Promise(function (resolve, reject) {
	      var request;
	      if(keyPath){
	        var openIndex = objectStore.index(keyPath);
	        request = openIndex.openCursor(null, consts.PREV);
	      } else {
	        request = objectStore.openCursor(null, consts.PREV);
	      }

	      request.onsuccess = function (event) {
	        var value = _.get(event, ['target', 'result', 'key']);
	        resolve(value);
	      };

	      request.onerror = function (event) {
	        options._error = {event: event, message: 'find highest key error', callback: reject};
	        self.opts.onerror(options);
	      };
	    });
	  },

	  /**
	   * data: {
	   *  filter: {
	   *    limit: -1,
	   *    offset: 10,
	   *    q: 'term'
	   *    ...
	   *  },
	   *  fields: ['id', '_state'],
	   *  page: 2
	   * }
	   */
	  hasGetParams: function(options){
	    options = options || {};
	    if(options.page || options.fields || _.size(options.filter) > 1 ||
	      (_.size(options.filter) === 1 && options.filter.limit === undefined)){
	      return true;
	    }
	    return false;
	  },

	  _match: function(query, json, keyPath, options){
	    var fields = _.get(options, ['filter', 'fields'], keyPath);
	    return this.opts.matchMaker.call(this, json, query, {fields: fields});
	  }

	};

	module.exports = IDBAdapter;
	/* jshint +W071, +W074 */

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);
	var match = __webpack_require__(7);

	var defaults = {
	  fields: ['title'] // json property to use for simple string search
	};

	var pick = function(json, props){
	  return _.chain(props)
	    .map(function (key) {
	      return _.get(json, key); // allows nested get
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

	  return _.every(filterArray, function (filter) {
	    return methods[filter.type](json, filter, opts);
	  });
	};

/***/ },
/* 7 */
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

	  'array': function(array, value, options){
	    var self = this;
	    return _.some(array, function(elem){
	      var type = toType(elem);
	      return self[type](elem, value, options);
	    });
	  }
	};

	module.exports = function(haystack, needle, options){
	  var opts = _.defaults({}, options, defaults);
	  var type = toType(haystack);
	  if(match[type]){
	    return match[type](haystack, needle, opts);
	  }
	};

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var bb = __webpack_require__(1);
	var _ = __webpack_require__(3);

	/* jshint -W074 */
	module.exports = function(method, entity, options) {
	  options = options || {};
	  var isModel = entity instanceof bb.Model;

	  return entity.db.open()
	    .then(function () {
	      switch (method) {
	        case 'read':
	          if (isModel) {
	            return entity.db.get(entity.id);
	          }
	          var data = _.clone(options.data);
	          return entity.db.getBatch(data);
	        case 'create':
	          return entity.db.add(entity.toJSON())
	            .then(function (key) {
	              return entity.db.get(key);
	            });
	        case 'update':
	          return entity.db.put(entity.toJSON())
	            .then(function (key) {
	              return entity.db.get(key);
	            });
	        case 'delete':
	          if (isModel) {
	            return entity.db.delete(entity.id);
	          }
	          return;
	      }
	    })
	    .then(function (resp) {
	      if (options.success) {
	        options.success(resp);
	      }
	      return resp;
	    })
	    .catch(function (resp) {
	      if (options.error) {
	        options.error(resp);
	      }
	    });

	};
	/* jshint +W074 */

/***/ }
/******/ ]);