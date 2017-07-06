// import errors from 'feathers-errors';
import makeDebug from 'debug';

const debug = makeDebug('feathers-mongodb-management');

export default function init () {
  debug('Initializing feathers-mongodb-management plugin');
  return 'feathers-mongodb-management';
}
