var skladAPI = require('../sklad/dist/sklad.uncompressed');
var _ = require('lodash');
var bb = require('backbone');

// create instance of Sklad
var IDBAdapter = function( opts ){
  opts = _.defaults(opts, {
    storeName     : 'store',
    storePrefix   : 'Prefix_',
    dbVersion     : 1,
    keyPath       : 'id',
    autoIncrement : true,
    indexes       : [
      {name: 'id', keyPath: 'id', unique: true}
    ]
  });

  var migration = {};
  migration[opts.dbVersion] = function( database ){
    var objStore = database.createObjectStore(opts.storeName, {
      keyPath: opts.keyPath,
      autoIncrement: opts.autoIncrement
    });
    _.each( opts.indexes, function( index ){
      objStore.createIndex(index.name, index.keyPath, index);
    });
  };

  return _.extend( {}, skladAPI, {

    /**
     *
     */
    open: function(){
      if( ! this._openPromise ){
        var dbName = opts.storePrefix + opts.storeName;
        this._openPromise = skladAPI.open( dbName, {
          version: opts.dbVersion,
          migration: migration
        });
      }
      return this._openPromise;
    },

    /**
     *
     */
    create: function( entity, options ){
      var data = entity.toJSON();
      return this.open()
        .then( function( conn ) {
          return conn.insert( opts.storeName, data );
        })
        .then( function( key ) {
          data[ opts.keyPath ] = key;
          return data;
        });
    },

    /**
     *
     */
    read: function( entity, options ){
      var key;
      if( entity instanceof bb.Model ){
        key = entity.get( opts.keyPath );
      }
      return this.open()
        .then( function( conn ) {
          return conn.get( opts.storeName, {
            index: options.index || opts.keyPath,
            key: key
          });
        });
    },

    /**
     *
     */
    update: function( entity, options ){
      var data = entity.toJSON();
      return this.open()
        .then( function( conn ) {
          return conn.upsert( opts.storeName, data );
        })
        .then( function() {
          return data;
        });
    },

    /**
     *
     */
    delete: function( entity, options ){

    }

  });
};

module.exports = IDBAdapter;