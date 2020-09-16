import chai, { util, expect } from 'chai';
import chailint from 'chai-lint';
import feathers from 'feathers';
import configuration from 'feathers-configuration';
import MongoClient from 'mongodb';
import plugin from '../src';
import makeDebug from 'debug';

const debug = makeDebug('feathers-mongodb-management:tests');

describe('feathers-mongodb-management', () => {
  let app, client, feathersDb, adminDb, testDb, databaseService, collectionService, userService;

  before(async () => {
    chailint(chai, util);
    app = feathers();
    // Load app configuration first
    app.configure(configuration());
    const url = app.get('db').url;
    client = await MongoClient.connect(url);
    // Extract database name.  Need to remove the connections options if any
    let dbName;
    const indexOfDBName = url.lastIndexOf('/') + 1;
    const indexOfOptions = url.indexOf('?');
    if (indexOfOptions === -1) dbName = url.substring(indexOfDBName);
    else dbName = url.substring(indexOfDBName, indexOfOptions);
    feathersDb = client.db(dbName);
    adminDb = feathersDb.admin();
    await adminDb.listDatabases();
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
      db: feathersDb,
      client
    }));
    databaseService = app.service('databases');
    expect(databaseService).toExist();
  });

  it('creates a database', async () => {
    const db = await databaseService.create({
      name: 'test-db'
    });
    debug(db);
    testDb = client.db('test-db');
    expect(testDb).toExist();
  });

  it('finds databases', async () => {
    const serviceDbs = await databaseService.find({
      query: { $select: ['name', 'collections'] }
    });
    debug(serviceDbs);
    const dbsInfo = await adminDb.listDatabases();
    expect(serviceDbs.length).to.equal(dbsInfo.databases.length);
    serviceDbs.forEach(db => expect(db.collections).toExist());
    // Provided by default if no $select
    serviceDbs.forEach(db => expect(db.objects).beUndefined());
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

  it('finds collections', async () => {
    const serviceCollections = await collectionService.find({
      query: { $select: ['name', 'count'] }
    });
    debug(serviceCollections);
    const collections = await testDb.collections();
    expect(serviceCollections.length).to.equal(collections.length);
    serviceCollections.forEach(collection => expect(collection.count).toExist());
    // Provided by default if no $select
    serviceCollections.forEach(collection => expect(collection.size).beUndefined());
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
      // hasUserInfosCommand: false,
      db: testDb
    }));
    userService = app.service('users');
    expect(userService).toExist();
  });

  it('creates a user', async () => {
    const serviceUser = await userService.create({
      name: 'test-user',
      password: 'test-password',
      roles: ['readWrite']
    });
    debug(serviceUser);
    const user = await testDb.command({ usersInfo: 'test-user' });
    expect(user).toExist();
  });

  it('finds users', async () => {
    const serviceUsers = await userService.find({
      query: { $select: ['name', 'roles'] }
    });
    debug(serviceUsers);
    const data = await testDb.command({ usersInfo: 1 });
    expect(serviceUsers.length).to.equal(data.users.length);
    serviceUsers.forEach(user => expect(user.name).toExist());
    // Provided by default if no $select
    serviceUsers.forEach(user => expect(user.db).beUndefined());
  });

  it('removes a user', async () => {
    const serviceUser = await userService.remove('test-user');
    debug(serviceUser);
    try {
      await testDb.command({ usersInfo: 'test-user' });
    } catch (error) {
      expect(error).toExist();
    }
  });

  it('removes a database', async () => {
    const db = await databaseService.remove('test-db');
    debug(db);
    const dbsInfo = await adminDb.listDatabases();
    expect(dbsInfo.databases.find(item => item.name === 'test-db')).beUndefined();
  });

  // Cleanup
  after(() => {
    client.close();
  });
});
