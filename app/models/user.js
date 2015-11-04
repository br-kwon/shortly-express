var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({

  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.hashPassword();
  },

  hashPassword: function() {
    bcrypt.hash(this.get('password'), null, null, function(err, hash) {
      if (!err) {
        this.set('hash', hash);
        this.unset('password');
      }
    }.bind(this));
  },

  comparePassword: function(password, callback) {
    bcrypt.compare(password, this.get('hash'), callback);
  }

});

module.exports = User;