var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.set('hash', bcrypt.hashSync(this.get('password')));
    this.unset('password');
  }

});

module.exports = User;