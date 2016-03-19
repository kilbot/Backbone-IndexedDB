var bb = require('backbone');

var createIDBModel = require('./src/model');
var createIDBCollection = require('./src/collection');

bb.sync = require('./src/sync');
bb.IDBModel = createIDBModel(bb.Model);
bb.IDBCollection = createIDBCollection(bb.Collection);
bb.IDBCollection.prototype.model = bb.IDBModel;