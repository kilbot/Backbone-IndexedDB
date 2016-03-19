var _ = require('lodash');

module.exports = function(Model){

  return Model.extend({

    constructor: function (attributes, options) {
      this.db = _.get(options, ['collection', 'db']);
      if (!this.db) {
        throw Error('Model must be in an IDBCollection');
      }

      Model.apply(this, arguments);
    }

  });

};