var bb = require('backbone');
var decorate = require('./collection-decorator');

module.exports = bb.Collection.extend({

  constructor: function () {
    bb.Collection.apply(this, arguments);
    decorate(this);
  }

});