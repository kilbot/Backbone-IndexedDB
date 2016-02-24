describe('Backbone IndexedDB', function () {

  before(function () {
    this.collection = new Backbone.IDBCollection();
  });

  it('should be in a valid state', function () {
    expect( this.collection ).to.be.ok;
    expect( this.collection.db.store).to.be.instanceOf( IDBStore );
  });


  describe('Working with a IDBCollection', function () {

    it('should create a new Backbone Models', function (done) {
      var collection = this.collection;
      var model = collection.create({
        firstname: 'Jane',
        lastname: 'Smith',
        age: 35,
        email: 'janesmith@example.com'
      }, {
        wait: true,
        special: true,
        success: function(m, resp, opts){
          expect( collection ).to.have.length(1);
          expect( m ).eqls( model );
          expect( opts.special ).to.be.true;
          done();
        }
      });
    });

    it('should batch save the collection', function (done) {
      var collection = this.collection;
      this.collection.saveBatch([
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
      ], {
        success: function(){
          expect( collection ).to.have.length(3);
          done();
        }
      });
    });

    afterEach(function(done) {
      this.collection.clear()
        .done(function(){
          done();
        });
    });

  });


  describe('Working with a IDBModel', function () {

    it('should save a Backbone Model', function (done) {
      var model = this.collection.add(
        {
          firstname: 'John',
          lastname: 'Doe',
          age: 52,
          email: 'johndoe@example.com'
        }
      );

      model.save({},
        {
          special: true,
          success: function(m, resp, opts) {
            expect(m).to.eql(model);
            expect(m.isNew()).to.be.false;
            expect(resp.age).to.eql(52);
            expect(opts.special).to.be.true;
            done();
          }
        }
      );
    });

    it('should update an existing Backbone Model', function (done) {
      var model = this.collection.create(
        {
          firstname: 'John',
          lastname: 'Doe',
          age: 52,
          email: 'johndoe@example.com'
        }
      );

      model.save(
        {
          age: 54
        },
        {
          special: true,
          success: function(m, resp, opts) {
            expect(m).to.eql(model);
            expect(m.get('age')).to.eql(54);
            expect(resp.age).to.eql(54);
            expect(opts.special).to.be.true;
            done();
          }
        }
      );
    });

    it('should fetch a Backbone Model', function (done) {
      this.collection.create({
          firstname: 'John',
          lastname: 'Doe',
          age: 52,
          email: 'johndoe@example.com'
        }, {
          wait: true,
          success: function(model){
            model.set({ age: 53 });
            model.fetch(
              {
                special: true,
                success: function(m, resp, opts) {
                  expect(m).to.eql(model);
                  expect(m.get('age')).to.eql(52);
                  expect(resp.age).to.eql(52);
                  expect(opts.special).to.be.true;
                  done();
                }
              }
            );
          }
      });
    });

    it('should destroy a model', function (done) {
      var collection = this.collection;
      collection.create({
        firstname: 'John',
        lastname: 'Doe',
        age: 52,
        email: 'johndoe@example.com'
      }, {
        wait: true,
        success: function(model){
          model.destroy({
            wait: true,
            special: true,
            success: function(m, resp, opts) {
              expect(m).to.eql(model);
              expect(m.get('age')).to.eql(52);
              expect(resp.age).to.eql(52);
              expect(opts.special).to.be.true;
              expect(collection).to.have.length(0);
              collection.db.store.count( function(count){
                expect( count ).equals(0);
                done();
              });
            }
          });
        }
      });
    });

    it('should destroy a new model', function (done) {
      var model = this.collection.add({
        firstname: 'John',
        lastname: 'Doe',
        age: 52,
        email: 'johndoe@example.com'
      });
      expect( model.destroy() ).to.be.false;
      expect( this.collection ).to.have.length(0);
      done();
    });

    it('should trigger fetch error arguments', function (done) {
      var keyPath = this.collection.db.store.keyPath;
      var model = {};
      model[keyPath] = null;
      model = this.collection.add(model);
      model.fetch({
        special: true,
        error: function(m, resp, opts){
          expect(m).to.eql(model);
          expect(opts.special).to.be.true;
          done();
        }
      });
    });

    afterEach(function(done) {
      this.collection.clear()
        .done(function(){
          done();
        });
    });

  });

  after(function() {
    window.indexedDB.deleteDatabase('IDBWrapper-Store');
  });

});