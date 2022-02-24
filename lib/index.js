import makeDebug from 'debug';

import database from './database.js';
import collection from './collection.js';
import user from './user.js';

const debug = makeDebug('feathers-mongodb-management');

export default function init () {
  debug('Initializing feathers-mongodb-management');
}

init.database = database;
init.collection = collection;
init.user = user;
