var sync = require('./sync');

module.exports = function (parent){

  var IDBModel = parent.extend({
    sync: sync
  });

  return IDBModel;

};