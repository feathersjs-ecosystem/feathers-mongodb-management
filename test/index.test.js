import chai, { util, expect } from 'chai';
import chailint from 'chai-lint';
import feathers from 'feathers';
import configuration from 'feathers-configuration';
import mongodb from 'mongodb';
import plugin from '../src';
import makeDebug from 'debug';

const debug = makeDebug('feathers-mongodb-management:tests')

describe('feathers-mongodb-management', () => {
  let app, feathersDb, adminDb, testDb, databaseService, collectionService, userService;

  before(() => {
    chailint(chai, util);
    app = feathers();
    // Load app configuration first
    app.configure(configuration());
    return mongodb.connect(app.get('db').url)
    .then(mongo => {
      feathersDb = mongo;
      adminDb = feathersDb.admin();
      return adminDb.listDatabases();
    });
  });

  it('is CommonJS compatible', () => {
    expect(typeof plugin).to.equal('function');
    expect(typeof plugin.database).to.equal('function');
    expect(typeof plugin.database.Service).to.equal('function');
    expect(typeof plugin.collection).to.equal('function');
    expect(typeof plugin.collection.Service).to.equal('function');
    expect(typeof plugin.user).to.equal('function');
    expect(typeof plugin.user.Service).to.equal('function');
  });

  it('registers the plugin', () => {
    app.configure(plugin);
  });

  it('creates the database service', () => {
    app.use('databases', plugin.database({
      db: feathersDb
    }));
    databaseService = app.service('databases');
    expect(databaseService).toExist();
  });

  it('creates a database', () => {
    return databaseService.create({
      name: 'test-db'
    })
    .then(db => {
      debug(db);
      testDb = feathersDb.db('test-db');
      expect(testDb).toExist();
      return adminDb.listDatabases();
    });
  });

  it('finds databases', () => {
    return databaseService.find({
      query: { $select: ['name', 'collections'] }
    })
    .then(serviceDbs => {
      debug(serviceDbs);
      return adminDb.listDatabases()
      .then(dbsInfo => {
        expect(serviceDbs.length).to.equal(dbsInfo.databases.length);
        serviceDbs.forEach(db => expect(db.collections).toExist());
        // Provided by default if no $select
        serviceDbs.forEach(db => expect(db.objects).beUndefined());
      });
    });
  });

  it('creates the collection service', () => {
    app.use('collections', plugin.collection({
      db: testDb
    }));
    collectionService = app.service('collections');
    expect(collectionService).toExist();
  });

  it('creates a collection', (done) => {
    collectionService.create({
      name: 'test-collection'
    })
    .then(collection => {
      debug(collection);
      // Need to use strict mode to ensure the delete operation has been taken into account
      testDb.collection('test-collection', { strict: true }, function (err, collection) {
        expect(err).beNull();
        expect(collection).toExist();
        done();
      });
    });
  });

  it('finds collections', () => {
    return collectionService.find({
      query: { $select: ['name', 'count'] }
    })
    .then(serviceCollections => {
      debug(serviceCollections);
      return testDb.collections()
      .then(collections => {
        expect(serviceCollections.length).to.equal(collections.length);
        serviceCollections.forEach(collection => expect(collection.count).toExist());
        // Provided by default if no $select
        serviceCollections.forEach(collection => expect(collection.size).beUndefined());
      });
    });
  });

  it('removes a collection', (done) => {
    collectionService.remove('test-collection')
    .then(collection => {
      debug(collection);
      // Need to use strict mode to ensure the delete operation has been taken into account
      testDb.collection('test-collection', { strict: true }, function (err, collection) {
        expect(err).toExist();
        done();
      });
    });
  });

  it('creates the user service', () => {
    app.use('users', plugin.user({
      // To test fallback for Mongo <= 2.4
      //hasUserInfosCommand: false,
      db: testDb
    }));
    userService = app.service('users');
    expect(userService).toExist();
  });

  it('creates a user', () => {
    return userService.create({
      name: 'test-user',
      password: 'test-password',
      roles: [ 'readWrite' ]
    })
    .then(serviceUser => {
      debug(serviceUser);
      return testDb.command({ usersInfo: 'test-user' })
      .then(user => {
        expect(user).toExist();
      });
    });
  });

  it('finds users', () => {
    return userService.find({
      query: { $select: ['name', 'roles'] }
    })
    .then(serviceUsers => {
      debug(serviceUsers);
      return testDb.command({ usersInfo: 1 })
      .then(data => {
        expect(serviceUsers.length).to.equal(data.users.length);
        serviceUsers.forEach(user => expect(user.name).toExist());
        // Provided by default if no $select
        serviceUsers.forEach(user => expect(user.db).beUndefined());
      });
    });
  });

  it('removes a user', () => {
    return userService.remove('test-user')
    .then(serviceUser => {
      debug(serviceUser);
      return testDb.command({ usersInfo: 'test-user' })
      .then((err, user) => {
        expect(err).toExist();
      });
    });
  });

  it('removes a database', () => {
    databaseService.remove('test-db')
    .then(db => {
      debug(db);
      expect(testDb.db('test-db')).beNull();
    });
  });

  // Cleanup
  after(() => {
    feathersDb.close();
  });
});
