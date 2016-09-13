var bb = require('backbone');
var decorate = require('./model-decorator');

module.exports = bb.Model.extend({

  constructor: function () {
    bb.Model.apply(this, arguments);
    decorate(this);
  }

});