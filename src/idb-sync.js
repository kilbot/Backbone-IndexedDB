/* jshint -W074 */
module.exports = function(method, entity, options) {
  options = options || {};

  return entity.db[method]( entity, options )
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