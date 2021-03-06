'use strict';

var assert    = require('assert');
var camel     = require('camel-case');
var snake     = require('snake-case');
var Promise   = require('bluebird');
var Knex      = require('knex');
var Bookshelf = require('bookshelf');
var child     = Promise.promisifyAll(require('child_process'));
var format    = require('util').format;
var is        = require('is');

Promise.longStackTraces();

var dbName = 'bookshelf_572';
var pre = 'create database ' + dbName + ';';
var post = 'drop database if exists ' + dbName + ';';

var config = {
  sqlite: {
    filename: ':memory:',
    type: 'number',
  },
  postgres: {
    pre: format('psql -c "create database %s;" -U postgres', dbName),
    post: format('psql -c "drop database if exists %s;" -U postgres', dbName),
    database: dbName,
    type: 'date'
  },
  mysql: {
    pre: format('mysql -e "create database %s;" -uroot', dbName),
    post: format('mysql -e "drop database %s;" -uroot', dbName),
    database: dbName,
    user: 'root',
    type: 'date'
  }
};

Promise.map(Object.keys(config), function (database) {
  var connection = config[database];
  var knex = Knex({
    client: database,
    connection: connection
  });
  var bookshelf = Bookshelf(knex);
  var User = bookshelf.Model.extend({
    tableName: 'users',
    hasTimestamps: ['createdAt', 'updatedAt'],
    format: transform(snake),
    parse: transform(camel)
  });
  return Promise.try(function () {
    if (connection.pre) return child.execAsync(connection.pre);
  })
  .then(function () {
    return knex.schema.createTable(User.prototype.tableName, function (table) {
      table.increments('id');
      table.string('name');
      table.timestamps();
    });
  })  
  .then(function () {
    return User
      .forge({
        name: 'bsiddiqui'
      })
      .save()
      .get('id');
  })
  .then(function (id) {
    return User
      .forge({
        id: id
      })
      .fetch();
  })
  .then(function (user) {
    var type = connection.type;
    assert(is[type](user.get('createdAt')), format('%s timestamps are %s', database, type));
  })
  .bind(knex)
  .finally(knex.destroy)
  .finally(function () {
    if (connection.post) return child.execAsync(connection.post);
  });
})
.catch(function (err) {
  console.error(err);
  process.exit(1);
});

function transform (fn) {
  return function (attributes) {
    return Object.keys(attributes)
      .reduce(function (acc, attribute) {
        acc[fn(attribute)] = attributes[attribute];
        return acc;
      }, {})
  };
}
