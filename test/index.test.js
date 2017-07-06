import chai, { util, expect } from 'chai';
import chailint from 'chai-lint';
import feathers from 'feathers';
import configuration from 'feathers-configuration';
import mongodb from 'mongodb';
import plugin from '../src';
import DatabaseService from '../src/database';

describe('feathers-mongodb-management', () => {
  let app, db, adminDb;

  before(() => {
    chailint(chai, util);
    app = feathers();
    // Load app configuration first
    app.configure(configuration());
    return mongodb.connect(app.get('db').url)
    .then(mongo => {
      db = mongo;
      adminDb = db.admin();
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
      db
    }));
    expect(service).toExist();
  });

  it('creates a database', () => {
    app.service('databases').create({
      name: 'test-db'
    })
    .then(db => {
      expect(db.db('test-db')).toExist();
    });
  });

  it('finds databases', () => {
    app.service('databases').find({
      query: { $select: ['db'] }
    })
    .then(serviceDbs => {
      return adminDb.listDatabases()
      .then(mongoDbs => {
        expect(serviceDbs.length).to.equal(mongoDbs.length);
      });
    });
  });

  // Cleanup
  after(() => {
    db.close();
  });
});
