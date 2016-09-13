var IDBDecorator = require('./idb-decorator');
var bb = require('backbone');

module.exports = bb.Collection.extend({

  constructor: function () {
    bb.Collection.apply(this, arguments);
    this.db = new IDBDecorator(this);
  }

});