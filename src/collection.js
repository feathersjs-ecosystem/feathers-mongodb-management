import errors from 'feathers-errors';
import filter from 'feathers-query-filters';
import { sorter, matcher, select, _ } from 'feathers-commons';

// Create the service.
class CollectionService {
  constructor (options) {
    if (!options || !options.db) {
      throw new Error('MongoDB DB options have to be provided');
    }

    this.db = options.db;
    this.paginate = options.paginate || {};
    this._matcher = options.matcher || matcher;
    this._sorter = options.sorter || sorter;
  }

  // Find without hooks and mixins that can be used internally and always returns
  // a pagination object
  _find (params, getFilter = filter) {
    const { query, filters } = getFilter(params.query || {});
    // first get all DBs
    return this.db.collections()
    .then(databases => {
      // Then get stats for all DBs
      let statsPromises = databases.map(database => database.stats());
      return Promise.all(statsPromises);
    })
    .then(statistics => {
      let values = _.values(statistics).filter(this._matcher(query));

      const total = values.length;

      if (filters.$sort) {
        values.sort(this._sorter(filters.$sort));
      }

      if (filters.$skip) {
        values = values.slice(filters.$skip);
      }

      if (typeof filters.$limit !== 'undefined') {
        values = values.slice(0, filters.$limit);
      }

      if (filters.$select) {
        values = values.map(value => _.pick(value, ...filters.$select));
      }

      return {
        total,
        limit: filters.$limit,
        skip: filters.$skip || 0,
        data: values
      };
    });
  }

  find (params) {
    const paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
    // Call the internal find with query parameter that include pagination
    const result = this._find(params, query => filter(query, paginate));

    if (!(paginate && paginate.default)) {
      return result.then(page => page.data);
    }

    return result;
  }

  // Create without hooks and mixins that can be used internally
  _create (data, params) {
    let name = data.name;
    if (!name) {
      return Promise.reject(new errors.BadRequest('Missing required name to create a collection'));
    }

    // The driver complies about valid options
    delete data.name;
    return Promise.resolve(this.db.createCollection(name, data))
    .then(select(params));
  }

  create (data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this._create(current)));
    }

    return this._create(data, params);
  }
  /*
  patch (id, data, params) {

  }

  update (id, data, params) {

  }

  remove (id, params) {

  }
  */
}

export default function init (options) {
  return new CollectionService(options);
}

init.CollectionService = CollectionService;
