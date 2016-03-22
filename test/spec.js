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
    expect( collection ).to.be.instanceOf( Backbone.Collection );
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
              merge  : function (local, remote, primaryKey) {
                if(local){
                  remote[primaryKey] = local[primaryKey];
                  remote._state = 'updated';
                } else {
                  remote._state = 'new';
                }
                return remote;
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

  it('should have a getBatch convenience function', function(done){
    var IndexedCollection = Collection.extend({
      indexes: [
        {name: 'age', keyPath: 'age'}
      ],
    });
    var collection = new IndexedCollection();

    var data = [
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
    ];

    collection.putBatch(data)
      .then(function(local_ids){
        return collection.getBatch(local_ids);
      })
      .then(function(response){
        expect(response).to.have.length(3);
      })
      .then(function(){
        return collection.getBatch([35, 28], {index: 'age'});
      })
      .then(function(response){
        expect(response).to.have.length(2);
        done();
      })
      .catch(done);
  });

  it('should fetch paginated and offset requests', function(done){
    for(var data = [], i = 0; i < 50; i++) {
      data.push({ foo: i });
    }

    var collection = new Collection();

    collection.putBatch(data)
      .then(function(){
        return collection.fetch({ data: { page: 1 } });
      })
      .then(function(){
        expect(collection).to.have.length(10);
        expect(collection.map('id')).eqls([1,2,3,4,5,6,7,8,9,10]);
        return collection.fetch({ data: { page: 2 } });
      })
      .then(function(){
        expect(collection).to.have.length(10);
        expect(collection.map('id')).eqls([11,12,13,14,15,16,17,18,19,20]);
        return collection.fetch({ data: { filter: { offset: 20 } } });
      })
      .then(function(){
        expect(collection).to.have.length(10);
        expect(collection.map('id')).eqls([21,22,23,24,25,26,27,28,29,30]);
        done();
      })
      .catch(done);
  });

  describe('Simple query requests', function() {

    it('should query keyPath integer', function (done) {
      for (var data = [], i = 0; i < 100; i++) {
        data.push({foo: i});
      }

      var collection = new Collection();

      collection.putBatch(data)
        .then(function () {
          return collection.fetch({data: {filter: {q: 17}}});
        })
        .then(function () {
          expect(collection).to.have.length(1);
          expect(collection.at(0).id).eqls(17);
          return collection.fetch({data: {filter: {q: 1}}});
        })
        .then(function () {
          expect(collection).to.have.length(10);
          expect(collection.map('id')).eqls([1, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
          return collection.fetch({data: {page: 2, filter: {q: 1}}});
        })
        .then(function () {
          expect(collection).to.have.length(10);
          expect(collection.map('id')).eqls([19, 21, 31, 41, 51, 61, 71, 81, 91, 100]);
          return collection.fetch({data: {page: 3, filter: {q: 1}}});
        })
        .then(function () {
          expect(collection).to.have.length(0);
          done();
        })
        .catch(done);
    });

    it('should query index', function (done) {
      var IndexedCollection = Collection.extend({
        indexes: [
          {name: 'age', keyPath: 'age'}
        ],
      });
      var collection = new IndexedCollection();

      var data = [
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
      ];

      collection.putBatch(data)
        .then(function () {
          return collection.fetch({index: 'age', data: {filter: {q: 52}}});
        })
        .then(function () {
          expect(collection).to.have.length(1);
          expect(collection.map('age')).eqls([52]);
          return collection.fetch({index: 'age', data: {filter: {q: 2}}});
        })
        .then(function () {
          expect(collection).to.have.length(2);
          expect(collection.map('age')).eqls([28, 52]); // note: ordered
          done();
        })
        .catch(done);
    });

    it('should query non-index field(s)', function (done) {
      var collection = new Collection();

      var data = [
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
      ];

      collection.putBatch(data)
        .then(function () {
          return collection.fetch({
            data: {
              filter: {
                q: [{query: 'doe', type: 'string'}],
                fields: ['firstname', 'lastname']
              }
            }
          });
        })
        .then(function () {
          expect(collection).to.have.length(1);
          expect(collection.map('firstname')).eqls(['John']);
          return collection.fetch({
            data: {
              filter: {
                q: [{query: 'jo', type: 'string'}],
                fields: ['firstname', 'lastname']
              }
            }
          });
        })
        .then(function () {
          expect(collection).to.have.length(2);
          expect(collection.map('firstname')).eqls(['John', 'Joe']);
          done();
        })
        .catch(done);

    });

    it('should query collection.matchMaker', function(done) {
      var IndexedCollection = Collection.extend({
        indexes   : [
          {name: 'age', keyPath: 'age'}
        ],
        matchMaker: function(model, query, options){
          expect(model).to.be.an('object');
          expect(query).eqls(52);
          expect(options.fields).eqls('age');
          if(model.age === 28){
            return true;
          }
          return this.default.matchMaker.apply(this, arguments);
        }
      });
      var collection = new IndexedCollection();

      var data = [
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
      ];

      collection.putBatch(data)
        .then(function () {
          return collection.fetch({index: 'age', data: {filter: {q: 52}}});
        })
        .then(function(){
          expect(collection).to.have.length(2);
          expect(collection.map('firstname')).eqls(['Joe', 'John']);
          done();
        });

    });

  });

  it('should return the total count for a fetch query', function(done) {
    var random = Math.floor((Math.random() * 100) + 1);
    for(var data = [], i = 0; i < random; i++) {
      data.push({ foo: i });
    }

    var Col = Collection.extend({
      matchMaker: function(model, query, options){
        if(query === 'even:true' && model[options.fields] % 2 === 0){
          return true;
        }
        return this.default.matchMaker.apply(this, arguments);
      }
    });
    var collection = new Col();

    collection.putBatch(data)
      .then(function(){
        return collection.fetch({
          add: false,
          error: done,
          success: function(col, resp, options){
            expect(col).to.have.length(0);
            expect(resp).to.have.length(10);
            expect(options.idb.total).eqls(random);

            col.fetch({
              data: {
                filter: {
                  q: 'even:true',
                  fields: 'foo'
                }
              },
              error: done,
              success: function(c, r, opts){
                expect(c).to.have.length(10);
                expect(opts.idb.total).eqls(Math.ceil(random/2));
                done();
              }
            });
          }
        });
      });
  });

  /**
   * Unit testing is not good for benchmarking
   * eg: an open console will slow indexedDB dramatically
   * this is just a rough comparison
   *
   * 10000 records
   */
  //it('should be performant with putBatch', function(done) {
  //  var collection = new Collection();
  //
  //  var count = is_safari ? 2000 : 10000;
  //
  //  for(var data = [], i = 0; i < count; i++) {
  //    data.push({ foo: i });
  //  }
  //  this.timeout(10000);
  //
  //  var start = Date.now();
  //
  //  collection.putBatch(data)
  //    .then(function() {
  //      var time = Date.now() - start;
  //      expect(time).to.be.below(2000);
  //      console.log(time);
  //      done();
  //    })
  //    .catch(done);
  //});

  /**
   * 1000 records
   */
  //it('should be performant with putBatch merge', function(done) {
  //  var Model = Backbone.IDBModel.extend({
  //    idAttribute: 'local_id'
  //  });
  //
  //  var DualCollection = Collection.extend({
  //    model  : Model,
  //    keyPath: 'local_id',
  //    indexes: [
  //      {name: 'id', keyPath: 'id', unique: true}
  //    ],
  //  });
  //
  //  var count = is_safari ? 200 : 1000;
  //
  //  for(var data = [], i = 0; i < count; i++) {
  //    data.push({ id: i });
  //  }
  //  this.timeout(10000);
  //
  //  var start = Date.now();
  //
  //  var collection = new DualCollection();
  //  collection.putBatch(data)
  //    .then(function () {
  //      return collection.putBatch(data, {index: 'id'});
  //    })
  //    .then(function () {
  //      var time = Date.now() - start;
  //      expect(time).to.be.below(2000);
  //      console.log(time);
  //      done();
  //    })
  //    .catch(done);
  //});

  after(function( done ) {
    var indexedDB = window.indexedDB;
    _.each( dbNameArray, function( dbName ){
      indexedDB.deleteDatabase( dbName );
    });
    done();
  });

});