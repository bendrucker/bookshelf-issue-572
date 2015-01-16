'use strict';

var assert = require('assert');
var camel  = require('camel-case');
var snake  = require('snake-case');

var knex = require('knex')({
  client: 'postgres',
  connection: {
    filename: 'basil_test'
  }
});
var bookshelf = require('bookshelf')(knex);

var User = bookshelf.Model.extend({
  tableName: 'users',
  hasTimestamps: ['createdAt', 'updatedAt'],
  format: transform(snake),
  parse: transform(camel)
});

return knex.schema.createTable(User.prototype.tableName, function (table) {
  table.increments('id');
  table.string('name');
  table.timestamps();
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
  assert(user.get('createdAt') instanceof Date && user.get('updatedAt') instanceof Date, 'timestamps are date objects');
})
.then(function () {
  console.log('success');
})
.bind(knex)
.finally(function () {
  return knex.schema.dropTable('users');
})
.finally(knex.destroy);

function transform (fn) {
  return function (attributes) {
    return Object.keys(attributes)
      .reduce(function (acc, attribute) {
        acc[fn(attribute)] = attributes[attribute];
        return acc;
      }, {})
  };
}
