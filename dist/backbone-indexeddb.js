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
	bb.sync = __webpack_require__(2);
	__webpack_require__(3);

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = Backbone;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var bb = __webpack_require__(1);

	/* jshint -W074 */
	module.exports = function(method, entity, options) {
	  options = options || {};
	  var isModel = entity instanceof bb.Model;
	  var data = entity.toJSON();

	  return entity.db.open()
	    .then(function(){
	      switch(method){
	        case 'read':

	        case 'create':
	          return entity.db.put( data );
	        case 'update':

	        case 'delete':

	      }
	    })
	    .then(function(resp){
	      if(options.success){
	        options.success(resp);
	      }
	    })
	    .catch(function(resp){
	      debugger;
	      if( options.error ){
	        options.error(resp);
	      }
	    });

	};
	/* jshint +W074 */

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var bb = __webpack_require__(1);
	var IDBAdapter = __webpack_require__(4);
	var IDBModel = __webpack_require__(6);
	var _ = __webpack_require__(5);

	// attach to Backbone
	module.exports = bb.IDBCollection = bb.Collection.extend({

	  model: IDBModel,

	  constructor: function(){
	    var opts = {
	      storeName     : this.name,
	      storePrefix   : this.storePrefix,
	      dbVersion     : this.dbVersion,
	      keyPath       : this.keyPath,
	      autoIncrement : this.autoIncrement,
	      indexes       : this.indexes
	    };

	    this.db = new IDBAdapter(opts);

	    bb.Collection.apply( this, arguments );
	  },

	  /**
	   * Clears the IDB storage and resets the collection
	   */
	  clear: function(){
	    var self = this;
	    return this.db.open()
	      .then(function(){
	        return self.db.clear();
	      })
	      .done(function(){
	        self.reset();
	      });
	  },

	  /**
	   *
	   */
	  saveBatch: function( models, options ){
	    options = options || {};
	    var self = this;
	    if( _.isEmpty( models ) ){
	      models = this.getChangedModels();
	    }
	    if( ! models ){
	      return;
	    }
	    return this.db.open()
	      .then( function() {
	        return self.db.putBatch( models );
	      })
	      .then( function(){
	        if( options.success ){
	          options.success( self, models, options );
	        }
	        return models;
	      });
	  },

	  /**
	   *
	   */
	  getChangedModels: function(){
	    return this.filter(function( model ){
	      return model.isNew() || model.hasChanged();
	    });
	  },

	  /**
	   *
	   */
	  removeBatch: function( models, options ){
	    options = options || {};
	    var self = this;
	    if( _.isEmpty( models ) ){
	      return;
	    }
	    return this.db.open()
	      .then( function() {
	        return self.db.removeBatch( models );
	      })
	      .then( function(){
	        self.remove( models );
	        if( options.success ){
	          options.success( self, models, options );
	        }
	        return models;
	      });
	  },

	  /**
	   *
	   */
	  mergeBatch: function( models, options ){
	    options = options || {};
	    var self = this;
	    if( _.isEmpty( models ) ){
	      return;
	    }

	    return this.db.open()
	      .then( function() {
	        return self.db.mergeBatch( models, options );
	      })
	      .then( function(){
	        if( options.success ){
	          options.success( self, models, options );
	        }
	        return models;
	      });
	  }

	});

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(5);

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
	        var res = resolve;

	        return new Promise(function (res, reject){
	          var request = objectStore.get( key );

	          request.onsuccess = function(event){
	            resolve( event.target.result );
	          }

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

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = _;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var bb = __webpack_require__(1);
	var _ = __webpack_require__(5);

	// attach to Backbone
	module.exports = bb.IDBModel = bb.Model.extend({

	  // idAttribute: this.collection.db.store.keyPath

	  constructor: function( attributes, options ){
	    this.db = _.get( options, ['collection', 'db'] );
	    if( !this.db ){
	      throw Error('Model must be in an IDBCollection');
	    }

	    bb.Model.apply( this, arguments );
	  }

	});

/***/ }
/******/ ]);