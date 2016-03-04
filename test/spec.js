describe('Backbone IndexedDB', function () {
  var dbNameArray = [];
  var Collection;

  // is_safari worse than IE
  var is_safari = window.navigator.userAgent.indexOf('Safari') !== -1 &&
    window.navigator.userAgent.indexOf('Chrome') === -1 &&
    window.navigator.userAgent.indexOf('Android') === -1;

  beforeEach(function(){
    var storePrefix = 'Test-';
    var name = Date.now().toString();
    Collection = Backbone.IDBCollection.extend({
      storePrefix: storePrefix,
      name: name
    });
    dbNameArray.push( storePrefix + name );
  });

  it('should be in a valid state', function (done) {
    var collection = new Collection();
    expect( collection ).to.be.ok;
    expect( collection.db ).not.to.be.undefined;

    collection.db.open()
      .then( function( database ){
        expect( database ).to.be.instanceOf( IDBDatabase );
        collection.db.close();
        done();
      })
      .catch( done );
  });

  it('should create a model', function (done) {
    var collection = new Collection();
    collection.create({
      firstname: 'John',
      lastname: 'Doe',
      age: 52,
      email: 'johndoe@example.com'
    }, {
      special: true,
      error: done,
      success: function( model, response, options ) {
        expect(model.isNew()).to.be.false;
        expect(response.age).to.eql(52);
        expect(options.special).to.be.true;
        done();
      }
    });
  });

  it('should update an existing model', function (done) {
    var collection = new Collection();
    collection.create({
      firstname: 'John',
      lastname: 'Doe',
      age: 52,
      email: 'johndoe@example.com'
    }, {
      wait: true,
      error: done,
      success: function( model, reposonse, options ){
        model.save({ age: 54 }, {
          special: true,
          error: done,
          success: function(m, resp, opts) {
            expect(m).to.eql(model);
            expect(m.get('age')).to.eql(54);
            expect(resp.age).to.eql(54);
            expect(opts.special).to.be.true;
            done();
          }
        });
      }
    });

  });

  it('should fetch a model', function (done) {
    var collection = new Collection();
    collection.create({
      firstname: 'John',
      lastname: 'Doe',
      age: 52,
      email: 'johndoe@example.com'
    }, {
      wait: true,
      error: done,
      success: function(model){
        model.set({ age: 53 });
        model.fetch({
          special: true,
          success: function(m, resp, opts) {
            expect(m).to.eql(model);
            expect(m.get('age')).to.eql(52);
            expect(resp.age).to.eql(52);
            expect(opts.special).to.be.true;
            done();
          }
        });
      }
    });
  });

  it('should trigger fetch error arguments', function (done) {
    var collection = new Collection();
    var keyPath = collection.db.opts.keyPath;
    var model = {};
    model[keyPath] = null;
    model = collection.add(model);
    model.fetch({
      special: true,
      success: done,
      error: function(m, resp, opts){
        expect(m).to.eql(model);
        expect(resp).to.be.instanceOf(window.Error);
        expect(opts.special).to.be.true;
        done();
      }
    });
  });

  it('should destroy a model', function (done) {
    var collection = new Collection();
    collection.create({
      firstname: 'John',
      lastname: 'Doe',
      age: 52,
      email: 'johndoe@example.com'
    }, {
      wait: true,
      error: done,
      success: function(model){
        model.destroy({
          wait: true,
          special: true,
          error: done,
          success: function(m, resp, opts) {
            expect(m).to.eql(model);
            expect(m.get('age')).to.eql(52);
            expect(resp).to.be.undefined;
            expect(opts.special).to.be.true;
            expect(collection).to.have.length(0);
            done();
          }
        });
      }
    });
  });

  it('should destroy a new model', function (done) {
    var collection = new Collection();
    var model = collection.add({
      firstname: 'John',
      lastname: 'Doe',
      age: 52,
      email: 'johndoe@example.com'
    });
    expect( model.destroy() ).to.be.false;
    expect( collection ).to.have.length(0);
    done();
  });

  it('should batch save a collection of models', function (done) {
    var collection = new Collection();
    collection.putBatch([
        {
          firstname: 'Jane',
          lastname : 'Smith',
          age      : 35,
          email    : 'janesmith@example.com'
        }, {
          firstname: 'John',
          lastname : 'Doe',
          age      : 52,
          email    : 'johndoe@example.com'
        }, {
          firstname: 'Joe',
          lastname : 'Bloggs',
          age      : 28,
          email    : 'joebloggs@example.com'
        }
      ])
      .then(function (records) {
        expect(collection).to.have.length(0);
        expect(records).eqls([1, 2, 3]);
        done();
      });
  });

  it('should count indexeddb records', function (done) {
    var collection = new Collection();
    collection.putBatch([
        {
          firstname: 'Jane',
          lastname: 'Smith',
          age: 35,
          email: 'janesmith@example.com'
        }, {
          firstname: 'John',
          lastname: 'Doe',
          age: 52,
          email: 'johndoe@example.com'
        }, {
          firstname: 'Joe',
          lastname: 'Bloggs',
          age: 28,
          email: 'joebloggs@example.com'
        }
      ])
      .then( function() {
        collection.count()
          .then(function(count){
            expect( count ).equals( 3 );
            done();
          });
      });
  });

  it('should fetch \'collection.pageSize\' records by default', function(done){
    for(var data = [], i = 0; i < 100; i++) {
      data.push({ foo: i });
    }

    var Col = Collection.extend({
      pageSize: Math.floor((Math.random() * 100) + 1)
    });
    var collection = new Col();

    collection.putBatch(data)
      .then(function(){
        collection.fetch({
          special: true,
          error: done,
          success: function(collection, response, options){
            expect( collection ).to.have.length( collection.pageSize );
            expect( options.special).to.be.true;
            done();
          }
        })
      });
  });

  it('should fetch \'filter[limit]\' records', function(done){
    for(var data = [], i = 0; i < 100; i++) {
      data.push({ foo: i });
    }

    var Col = Collection.extend({
      pageSize: Math.floor((Math.random() * 100) + 1)
    });
    var collection = new Col();

    collection.putBatch(data)
      .then(function(){
        var random = Math.floor((Math.random() * 100) + 1);
        collection.fetch({
          data: {
            filter: {
              limit: random,
            }
          },
          special: true,
          error: done,
          success: function(){
            expect( collection ).to.have.length( random );

            collection.fetch({
              data: {
                filter: {
                  limit: -1,
                }
              },
              reset: true,
              error: done,
              success: function(){
                expect( collection ).to.have.length( 100 );
                done();
              }
            });

          }
        });
      });
  });

  it('should merge models on a non-keyPath attribute', function (done) {
    var Model = Backbone.IDBModel.extend({
      idAttribute: 'local_id'
    });

    var DualCollection = Collection.extend({
      model  : Model,
      keyPath: 'local_id',
      indexes: [
        {name: 'id', keyPath: 'id', unique: true}
      ],
    });

    var collection = new DualCollection();
    collection.putBatch([{id: 266}, {id: 8345}, {id: 2346}])
      .then(function () {
        return collection.putBatch(
          [{id: 266, foo: 'bar'}, {id: 8345, foo: 'baz'}],
          {index: 'id'}
        );
      })
      .then(function (records) {
        expect(records).eqls([1, 2]);

        collection.fetch({
          error  : done,
          success: function (collection) {
            expect(collection).to.have.length(3);
            expect(collection.findWhere({id: 266}).get('foo')).equals('bar');
            expect(collection.findWhere({id: 8345}).get('foo')).equals('baz');
            done();
          }
        })

      })
      .catch(done);

  });

  it('should merge models with a custom merge function', function (done) {
    var Model = Backbone.IDBModel.extend({
      idAttribute: 'local_id'
    });

    var DualCollection = Collection.extend({
      model: Model,
      keyPath: 'local_id',
      indexes: [
        {name: 'id', keyPath: 'id', unique: true}
      ],
    });

    var collection = new DualCollection();
    collection.putBatch([ { id: 11 }, { id: 12 }, { id: 13 } ])
      .then( function( records ) {
        return collection.putBatch(
          [{id: 11, foo: 'bar'}, {id: 12, foo: 'baz'}, {id: 14, foo: 'boo'}],
          {
            index: {
              keyPath: 'id',
              merge  : function (oldData, newData) {
                if (_.has(oldData, 'local_id')) {
                  newData._state = 'updated';
                } else {
                  newData._state = 'new';
                }
                return _.merge({}, oldData, newData);
              }
            }
          }
        );
      })
      .then( function() {
        collection.fetch({
          error: done,
          success: function( collection ){
            expect( collection ).to.have.length( 4 );
            expect( collection.findWhere({ id: 11 }).get('_state') ).equals('updated');
            expect( collection.findWhere({ id: 12 }).get('_state') ).equals('updated');
            expect( collection.findWhere({ id: 13 }).get('_state') ).to.be.undefined;
            expect( collection.findWhere({ id: 14 }).get('_state') ).equals('new');
            done();
          }
        })

      })
      .catch(done);

  });

  it('should clear a collection', function (done) {
    var collection = new Collection();
    collection.putBatch([
        {
          firstname: 'Jane',
          lastname: 'Smith',
          age: 35,
          email: 'janesmith@example.com'
        }, {
          firstname: 'John',
          lastname: 'Doe',
          age: 52,
          email: 'johndoe@example.com'
        }, {
          firstname: 'Joe',
          lastname: 'Bloggs',
          age: 28,
          email: 'joebloggs@example.com'
        }
      ])
      .then( function( records ) {
        collection.add(records);
        expect( collection ).to.have.length( 3 );
        collection.clear()
          .then(function(){
            expect( collection ).to.have.length( 0 );
            collection.count()
              .then(function(count){
                expect( count ).equals( 0 );
                done();
              });
          });
      });
  });

  it('should get the highest entry by index', function (done) {
    var IndexedCollection = Collection.extend({
      indexes: [
        {name: 'age', keyPath: 'age'}
      ],
    });
    var collection = new IndexedCollection();

    collection.putBatch([
      {
        firstname: 'Jane',
        lastname: 'Smith',
        age: 35,
        email: 'janesmith@example.com'
      }, {
        firstname: 'John',
        lastname: 'Doe',
        age: 52,
        email: 'johndoe@example.com'
      }, {
        firstname: 'Joe',
        lastname: 'Bloggs',
        age: 28,
        email: 'joebloggs@example.com'
      }
    ])
    .then(function(){
      return collection.db.findHighestIndex('age');
    })
    .then(function(response){
      expect(response).equals(52);
      done();
    });
  });

  it('should count the records on open', function(done){
    var random = Math.floor((Math.random() * 100) + 1);
    for(var data = [], i = 0; i < random; i++) {
      data.push({ foo: i });
    }

    var collection = new Collection();

    collection.putBatch(data)
      .then(function() {
        expect(collection.db.length).equals(0);
        collection.db.close();
        return collection.db.open();
      })
      .then(function () {
        expect(collection.db.length).equals(random);
        return collection.clear()
      })
      .then(function () {
        expect(collection.db.length).equals(0);
        done();
      });
  });

  /**
   * Unit testing is not good for benchmarking
   * eg: an open console will slow indexedDB dramatically
   * this is just a rough comparison
   *
   * 10000 records
   */
  it('should be performant with putBatch', function(done) {
    var collection = new Collection();

    var count = is_safari ? 2000 : 10000;

    for(var data = [], i = 0; i < count; i++) {
      data.push({ foo: i });
    }
    this.timeout(10000);

    var start = Date.now();

    collection.putBatch(data)
      .then(function() {
        var time = Date.now() - start;
        expect(time).to.be.below(2000);
        console.log(time);
        done();
      })
      .catch(done);
  });

  /**
   * 1000 records
   */
  it('should be performant with putBatch merge', function(done) {
    var Model = Backbone.IDBModel.extend({
      idAttribute: 'local_id'
    });

    var DualCollection = Collection.extend({
      model  : Model,
      keyPath: 'local_id',
      indexes: [
        {name: 'id', keyPath: 'id', unique: true}
      ],
    });

    var count = is_safari ? 200 : 1000;

    for(var data = [], i = 0; i < count; i++) {
      data.push({ id: i });
    }
    this.timeout(10000);

    var start = Date.now();

    var collection = new DualCollection();
    collection.putBatch(data)
      .then(function () {
        return collection.putBatch(data, {index: 'id'});
      })
      .then(function () {
        var time = Date.now() - start;
        expect(time).to.be.below(2000);
        console.log(time);
        done();
      })
      .catch(done);
  });



  describe('IDBAdapter', function(){

    it('should have a hasGetParams method', function(){
      var collection = new Collection();
      expect(collection.db).respondsTo('hasGetParams');
      expect(collection.db.hasGetParams()).to.be.false;
      expect(collection.db.hasGetParams({page: 2})).to.be.true;
      expect(collection.db.hasGetParams({fields: ['id', '_state']})).to.be.true;
      expect(collection.db.hasGetParams({filter: {limit: -1}})).to.be.false;
      expect(collection.db.hasGetParams({filter: {limit: -1, in: [1,2,3]}})).to.be.true;
      expect(collection.db.hasGetParams({filter: {in: [1,2,3]}})).to.be.true;
    });

  });

  after(function( done ) {
    var indexedDB = window.indexedDB;
    _.each( dbNameArray, function( dbName ){
      indexedDB.deleteDatabase( dbName );
    });
    done();
  });

});