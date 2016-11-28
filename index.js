/**
 * extend Backbone Collection for app use
 */
var bb = require('backbone');
var extend = require('./extend');

var Collection = bb.Collection.extend({
  decorators :{
    idb: require('./src/collection')
  },
  constructor: function () {
    // this._parent = Object.getPrototypeOf( Object.getPrototypeOf(this) );
    bb.Collection.apply(this, arguments);
  }
});

var Model = bb.Model.extend({
  decorators :{
    idb: require('./src/model')
  }
});

Collection.extend = Model.extend = extend;

module.exports = {
  Collection  : Collection,
  Model       : Model
};