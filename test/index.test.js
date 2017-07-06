import chai, { util, expect } from 'chai';
import chailint from 'chai-lint';
import feathers from 'feathers';
import configuration from 'feathers-configuration';
import mongodb from 'mongodb';
import plugin from '../src';
import DatabaseService from '../src/database';
import CollectionService from '../src/collection';

describe('feathers-mongodb-management', () => {
  let app, feathersDb, adminDb, testDb;

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
    expect(typeof require('../lib')).to.equal('function');
  });

  it('registers the plugin', () => {
    app.configure(plugin);
  });

  it('creates the database service', () => {
    let service = app.use('databases', DatabaseService({
      db: feathersDb
    }));
    expect(service).toExist();
  });

  it('creates a database', () => {
    return app.service('databases').create({
      name: 'test-db'
    })
    .then(db => {
      testDb = feathersDb.db('test-db');
      expect(testDb).toExist();
      return adminDb.listDatabases();
    });
  });

  it('creates the collection service', () => {
    let service = app.use('collections', CollectionService({
      db: testDb
    }));
    expect(service).toExist();
  });

  it('creates a collection', () => {
    return app.service('collections').create({
      name: 'test-collection'
    })
    .then(db => {
      expect(testDb.collection('test-collection')).toExist();
      return testDb.collections();
    })
    .then(collections => {
      expect(collections.length).to.equal(1);
    });
  });

  it('finds databases', () => {
    return app.service('databases').find({
      query: { $select: ['db'] }
    })
    .then(serviceDbs => {
      return adminDb.listDatabases()
      .then(dbsInfo => {
        expect(serviceDbs.length).to.equal(dbsInfo.databases.length);
      });
    });
  });

  // Cleanup
  after(() => {
    feathersDb.close();
  });
});
