import errors from '@feathersjs/errors';
import matcher from 'sift';
import { filterQuery, sorter, select } from '@feathersjs/adapter-commons';
import { _ } from '@feathersjs/commons';

// Create the base service.
class Service {
  constructor (options) {
    this.paginate = options.paginate || {};
    this._matcher = options.matcher || matcher;
    this._sorter = options.sorter || sorter;
  }

  // Find without hooks and mixins that can be used internally and always returns
  // a pagination object
  async _find (params, getFilter = filterQuery) {
    const { query, filters } = getFilter(params.query || {});
    // first get all items
    const items = await this.listImplementation();
    const infosPromises = items.map(item => {
    // Then get stats/infos for all items if possible
      if (typeof item.stats === 'function') {
        return item.stats();
      } else {
        return Promise.resolve(item);
      }
    });
    const infos = await Promise.all(infosPromises);
    _.each(infos, this.processObjectInfos);

    let values = _.values(infos).filter(this._matcher(query));

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
  }

  async find (params) {
    const paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
    // Call the internal find with query parameter that include pagination
    const result = await this._find(params, query => filterQuery(query, paginate));

    if (!(paginate && paginate.default)) {
      return result.data;
    }

    return result;
  }

  // Create without hooks and mixins that can be used internally
  async _create (data, params) {
    const name = data.name;
    if (!name) {
      throw new errors.BadRequest('Missing required name to create a collection');
    }

    // The driver complies about valid options
    delete data.name;
    return Promise.resolve(this.createImplementation(name, data))
      .then(select(params));
  }

  async create (data, params) {
    if (Array.isArray(data)) {
      await Promise.all(data.map(current => this._create(current)));
    } else {
      await this._create(data, params);
    }
  }

  // Remove without hooks and mixins that can be used internally
  async _remove (idOrInfos, params) {
    let item;
    if (_.isObject(idOrInfos)) {
      item = await this.getImplementation(idOrInfos.name);
    } else {
      item = await this.getImplementation(idOrInfos);
    }

    if (item) {
      await this.removeImplementation(item);
      if (_.isObject(idOrInfos)) {
        return idOrInfos;
      } else {
        return { name: idOrInfos };
      }
    }

    if (_.isObject(idOrInfos)) {
      throw new errors.NotFound(`No record found for id '${idOrInfos.name}'`);
    } else {
      throw new errors.NotFound(`No record found for id '${idOrInfos}'`);
    }
  }

  async remove (id, params) {
    if (id === null) {
      const page = await this._find(params);

      await Promise.all(page.data.map(current =>
        this._remove(current, params)
          .then(select(params))
      ));
    } else {
      await this._remove(id, params);
    }
  }

  /* NOT IMPLEMENTED
  patch (id, data, params) {

  }

  update (id, data, params) {

  }
  */
}

export default Service;
