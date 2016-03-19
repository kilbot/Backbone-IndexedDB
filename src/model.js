var _ = require('lodash');
var idbSync = require('./sync');

module.exports = function(Model){

  return Model.extend({

    constructor: function (attributes, options) {
      this.db = _.get(options, ['collection', 'db']);
      if (!this.db) {
        throw Error('Model must be in an IDBCollection');
      }

      Model.apply(this, arguments);
    },

    sync: idbSync

  });

};