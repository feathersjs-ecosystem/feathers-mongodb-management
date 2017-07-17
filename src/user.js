import Service from './service';

// Create the service.
class UserService extends Service {
  constructor (options) {
    super(options);

    if (!options || !options.db) {
      throw new Error('MongoDB DB option has to be provided');
    }
    this.db = options.db;
    // Only available for Mongo > 2.4, if set to false will fallback to Mongo system users collection
    this.hasUserInfosCommand = options.hasUserInfosCommand || true;
  }

  // Helper function to process user infos object
  processObjectInfos (infos) {
    // In Mongo the user name key is user, change to the more intuitive name just as in create
    infos.name = infos.user;
    delete infos.user;
    return infos;
  }

  createImplementation (id, options) {
    if (!options.password) {
      throw new Error('Password option has to be provided');
    }
    return this.db.addUser(id, options.password, options);
  }

  getImplementation (id) {
    if (this.hasUserInfosCommand) {
      return this.db.command({ usersInfo: id })
      .then(data => data.users[0]);
    }else {

    }
  }

  listImplementation () {
    if (this.hasUserInfosCommand) {
      return this.db.command({ usersInfo: 1 })
      .then(data => data.users);
    } else {
      return this.db.collection('system.users').find().toArray()
      .then(users => users);
    }
  }

  removeImplementation (item) {
    return this.db.removeUser(item.user);
  }
}

export default function init (options) {
  return new UserService(options);
}

init.UserService = UserService;
