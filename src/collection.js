var IDBCollection = require('./idb-collection');
var bb = require('backbone');

module.exports = bb.Collection.extend({

  constructor: function (models, options) {
    bb.Collection.apply(this, arguments);
    IDBCollection(this);
  }

});