describe('Backbone IndexedDB', function () {
  var dbNameArray = [];
  var Collection;

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
    var model = collection.add({
      firstname: 'John',
      lastname: 'Doe',
      age: 52,
      email: 'johndoe@example.com'
    });

    model.save({}, {
      special: true,
      error: done,
      success: function(m, resp, opts) {
        expect(m).to.eql(model);
        expect(m.isNew()).to.be.false;
        expect(resp.age).to.eql(52);
        expect(opts.special).to.be.true;
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
      success: function( model ){
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
      expect( collection ).to.have.length( 0 );
      expect( records ).to.have.length( 3 );
      _.each( records, function( record ){
        expect( record.id ).to.not.be.undefined;
      });
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

  it('should fetch 10 records by default', function(done){
    for(var data = [], i = 0; i < 100; i++) {
      data.push({ foo: i });
    }

    var collection = new Collection();

    collection.putBatch(data)
      .then(function(){
        collection.fetch({
          error: done,
          success: function(){
            expect( collection ).to.have.length( 10 );
            done();
          }
        })
      });
  });

  it('should merge models on a non-keyPath attribute', function (done) {
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
    collection.putBatch([ { id: 1 }, { id: 2 }, { id: 3 } ])
      .then( function() {
        collection.putBatch(
          [ { id: 1, foo: 'bar' }, { id: 2, foo: 'baz' } ],
          { index: 'id' }
        )
        .then( function( records ) {
          expect( records ).to.have.length( 2 );
          _.each( records, function( record ){
            expect( record.local_id ).to.not.be.undefined;
          });

          collection.fetch({
            error: done,
            success: function( collection ){
              expect( collection ).to.have.length( 3 );
              expect( collection.findWhere({ id: 1 }).get('foo')).equals('bar');
              expect( collection.findWhere({ id: 2 }).get('foo')).equals('baz');
              done();
            }
          })

        });
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