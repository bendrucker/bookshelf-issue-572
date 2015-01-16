'use strict';

var assert    = require('assert');
var camel     = require('camel-case');
var snake     = require('snake-case');
var Promise   = require('bluebird');
var Knex      = require('knex');
var Bookshelf = require('bookshelf');
var child     = Promise.promisifyAll(require('child_process'));
var format    = require('util').format;

Promise.longStackTraces();

var dbName = 'bookshelf_572';
var pre = 'create database ' + dbName + ';';
var post = 'drop database if exists ' + dbName + ';';

var config = {
  sqlite: {
    filename: ':memory:'
  },
  postgres: {
    pre: format('psql -c "create database %s;" -U postgres', dbName),
    post: format('psql -c "drop database if exists %s;" -U postgres', dbName),
    database: dbName
  },
  mysql: {
    pre: format('mysql -e "create database %s;" -uroot', dbName),
    post: format('mysql -e "drop database %s;" -uroot', dbName),
    database: dbName,
    user: 'root'
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
    if (user.get('createdAt') instanceof Date && user.get('updatedAt') instanceof Date) {
      console.log(database, 'timestamps are Date instances');
    }
    else {
      console.log(database, 'timestamps are', typeof user.get('createdAt'));
    }
  })
  .bind(knex)
  .finally(knex.destroy)
  .finally(function () {
    if (connection.post) return child.execAsync(connection.post);
  });
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
