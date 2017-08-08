# feathers-mongodb-management

[![Build Status](https://travis-ci.org/feathersjs/feathers-mongodb-management.png?branch=master)](https://travis-ci.org/feathersjs/feathers-mongodb-management)
[![Code Climate](https://codeclimate.com/github/feathersjs/feathers-mongodb-management/badges/gpa.svg)](https://codeclimate.com/github/feathersjs/feathers-mongodb-management)
[![Test Coverage](https://codeclimate.com/github/feathersjs/feathers-mongodb-management/badges/coverage.svg)](https://codeclimate.com/github/feathersjs/feathers-mongodb-management/coverage)
[![Dependency Status](https://img.shields.io/david/feathersjs/feathers-mongodb-management.svg?style=flat-square)](https://david-dm.org/feathersjs/feathers-mongodb-management)
[![Download Status](https://img.shields.io/npm/dm/feathers-mongodb-management.svg?style=flat-square)](https://www.npmjs.com/package/feathers-mongodb-management)

> Feathers service adapters for managing MongoDB databases, users and collections

**This plugin is under alpha-testing, breaking changes could be pushed unexpectedly.
As a consequence it should be considered unstable, not yet ready for production use.**

## Installation

```
npm install feathers-mongodb-management --save
```

## Documentation

**TODO**

Please wait for the [feathers-mongodb-management documentation](http://docs.feathersjs.com/).

## Complete Example

Here's an example of a Feathers server that uses `feathers-mongodb-management`.

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const errorHandler = require('feathers-errors/handler');
const mongodb = require('mongodb');
const plugin = require('feathers-mongodb-management');

// Initialize the application
const app = feathers()
  .configure(rest())
  .configure(hooks())
  // Needed for parsing bodies (login)
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(errorHandler());

// Connect to Mongo instance
mongodb.connect('mongodb://127.0.0.1:27017/feathers-test')
.then(mongo => {
  // Initialize your feathers plugin to manage databases
  app.use('/mongo/databases', plugin.database({ db: mongo }));
  let dbService = app.service('/mongo/databases');
  // Now create a new database
  dbService.create({ name: 'test-db' })
  .then(db => {
    // The objects provided through the plugin services are just metadata and not MongoDB driver instances
    // We need to retrieve it to create collection/user services that require the DB instance
    db = mongodb.db('test-db');
    // Now create services binded to this database to manage collections/users
    app.use('/mongo/test-db/collections', plugin.collection({ db }));
    let collectionService = app.service('/mongo/test-db/collections');
    app.use('/mongo/test-db/users', plugin.user({ db }));
    let userService = app.service('/mongo/test-db/users');
    // Perform other operations using these services if required
    ...
    // Then start the app
    app.listen(3030);
    console.log('Feathers app started on 127.0.0.1:3030');
  });
});
```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
