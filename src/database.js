import Service from './service';

// Create the service.
class DatabaseService extends Service {
  constructor (options) {
    super(options);
    if (!options || !options.db) {
      throw new Error('MongoDB DB options have to be provided');
    }

    this.db = options.db;
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

  createImplementation (id, options) {
    return this.db.db(id, options);
  }

  getImplementation (id) {
    return Promise.resolve(this.db.db(id));
  }

  listImplementation () {
    return this.adminDb.listDatabases()
    .then(data => {
      // Get DB objects from names
      return data.databases.map(databaseInfo => this.db.db(databaseInfo.name));
    });
  }

  removeImplementation (item) {
    return item.dropDatabase();
  }
}

export default function init (options) {
  return new DatabaseService(options);
}

init.DatabaseService = DatabaseService;
