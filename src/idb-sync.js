//var bb = require('backbone');

/* jshint -W074 */
module.exports = function(method, entity, options) {
  options = options || {};
  //var isModel = entity instanceof bb.Model;
  var data = entity.toJSON();

  return entity.db.open()
    .then(function(){
      switch(method){
        case 'read':

        case 'create':
          return entity.db.put( data );
        case 'update':

        case 'delete':

      }
    })
    .then(function(resp){
      if(options.success){
        options.success(resp);
      }
    })
    .catch(function(resp){
      if( options.error ){
        options.error(resp);
      }
    });

};
/* jshint +W074 */