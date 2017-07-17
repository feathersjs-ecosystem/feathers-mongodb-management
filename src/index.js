import database from './database';
import collection from './collection';
import user from './user'; 
import makeDebug from 'debug';

const debug = makeDebug('feathers-mongodb-management');

export default function init () {
  debug('Initializing feathers-mongodb-management');
}

init.database = database;
init.collection = collection;
init.user = user;
