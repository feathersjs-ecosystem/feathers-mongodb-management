import Service from './service';

// Create the service.
class CollectionService extends Service {
  constructor (options) {
    super(options);

    if (!options || !options.db) {
      throw new Error('MongoDB DB options have to be provided');
    }
    this.db = options.db;
  }

  // Helper function to process stats object
  processStats (stats) {
    // In Mongo the collection name key is ns and prefixed by the db name, change to the more intuitie name just as in create
    const namespace = stats.ns.split('.');
    if (namespace.length > 1) {
      stats.name = namespace[1];
    }
    delete stats.ns;
    return stats;
  }

  createImplementation (id, options) {
    return this.db.createCollection(id, options);
  }

  getImplementation (id) {
    return this.db.collection(id);
  }

  listImplementation () {
    return this.db.collections();
  }

  removeImplementation (item) {
    return item.drop();
  }
}

export default function init (options) {
  return new CollectionService(options);
}

init.CollectionService = CollectionService;
