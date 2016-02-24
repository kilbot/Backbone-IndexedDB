var bb = require('backbone');
var IndexedDB = require('./promisify-idb-wrapper');
var IDBModel = require('./idb-model');
var _ = require('lodash');

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

    this.db = new IndexedDB(opts);
    this.db.open();

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
        self.set(models, options);
        if( options.success ){
          options.success( self, models, options );
        }
        return models;
      });
  },

  getChangedModels: function(){
    return this.filter(function( model ){
      return model.isNew() || model.hasChanged();
    });
  },

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
  }

});