var bb = require('backbone');

/* jshint -W074 */
module.exports = function(method, entity, options) {
  options = options || {};
  var isModel = entity instanceof bb.Model;

  return entity.db.open()
    .then(function(){
      switch(method){
        case 'read':
          if( isModel ){
            return entity.db.get(entity);
          }
          return entity.db.getAll();
        case 'create':
          return entity.db.update(entity);
        case 'update':
          return entity.db.update(entity);
        case 'delete':
          if( isModel ){
            return entity.db.destroy(entity);
          }
      }
    })
    .done(function(resp){
      if(options.success){
        options.success(resp);
      }
    })
    .fail(function(resp){
      if( options.error ){
        options.error(resp);
      }
    });

};
/* jshint +W074 */