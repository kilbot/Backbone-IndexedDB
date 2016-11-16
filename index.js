/**
 * extend Backbone Collection for app use
 */
var bb = require('backbone');
var decorate = require('./src/collection');

module.exports = {
  Collection : bb.Collection.extend({

    constructor: function () {
      bb.Collection.apply(this, arguments);
      decorate(this);
    }

  })
};