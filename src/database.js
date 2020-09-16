import Service from './service';

// Create the service.
class DatabaseService extends Service {
  constructor (options) {
    super(options);
    if (!options || !options.db || !options.client) {
      throw new Error('MongoDB DB options have to be provided');
    }

    this.db = options.db;
    this.client = options.client;
    // Use the admin database for some operations
    this.adminDb = options.db.admin();
    if (!this.adminDb) {
      throw new Error('MongoDB Admin DB cannot be retrieved, ensure the connexion user has the rights to do so');
    }
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
