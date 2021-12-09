import chai, { util, expect } from 'chai';
import chailint from 'chai-lint';
import feathers from '@feathersjs/feathers';
import configuration from '@feathersjs/configuration';
import { MongoClient } from 'mongodb';
import makeDebug from 'debug';

import plugin from '../lib/index.js';

const debug = makeDebug('feathers-mongodb-management:tests');

describe('feathers-mongodb-management', () => {
  let app, client, adminDb, testDb, databaseService, collectionService, userService;

  before(async () => {
    chailint(chai, util);
    app = feathers();
    // Load app configuration first
    app.configure(configuration());
    const url = app.get('db').url;
    client = await MongoClient.connect(url);
    adminDb = client.db('feathers-test').admin();
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
      adminDb, client
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

  it('creates a collection', async () => {
    const collection = await collectionService.create({
      name: 'test-collection'
    });

    debug(collection);
    // Need to use strict mode to ensure the delete operation has been taken into account
    const createdCollection = await testDb.collection('test-collection', { strict: true });

    expect(createdCollection).toExist();
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

  it('removes a collection', async () => {
    const collection = await collectionService.remove('test-collection');

    debug(collection);

    await expect(() => testDb.collection('test-collection', { strict: true })).to.throw();
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
