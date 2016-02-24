var bb = require('backbone');
var _ = require('lodash');

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