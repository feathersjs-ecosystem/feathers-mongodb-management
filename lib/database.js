import Service from './service.js';

// Create the service.
class DatabaseService extends Service {
  constructor (options) {
    super(options);
    if (!options || !options.adminDb || !options.client) {
      throw new Error('Database service options (admin DB and DB client) have to be provided');
    }

    // Use the admin database for some operations
    this.adminDb = options.adminDb;
    // And the client for some others
    this.client = options.client;
  }

  // Helper function to process stats object
  processObjectInfos (infos) {
    // In Mongo the db name key is db, change to the more intuitive name just as in create
    infos.name = infos.db;
    delete infos.db;
    return infos;
  }

  async createImplementation (id, options) {
    return this.client.db(id, options).stats()
      .then(infos => this.processObjectInfos(infos));
  }

  async getImplementation (id) {
    return Promise.resolve(this.client.db(id));
  }

  async listImplementation () {
    const data = await this.adminDb.listDatabases();
    // Get DB objects from names
    return data.databases.map(databaseInfo => this.client.db(databaseInfo.name));
  }

  async removeImplementation (item) {
    await item.dropDatabase();
  }
}

export default function init (options) {
  return new DatabaseService(options);
}

init.Service = DatabaseService;
