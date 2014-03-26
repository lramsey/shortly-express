var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link.js');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  links: function(){
    return this.hasMany(Link);
  },
  initialize: function(){
    this.on('creating', this.hash);
  },
  compare: function(password, callback){
    var bcryptComp = Promise.promisify(bcrypt.compare);
    return bcryptComp(password, this.get('password'), function(err, res) {
      if(!err){
        callback(res);
      }
    }).bind(this);
  },
  hash: function(){
    var bcryptify = Promise.promisify(bcrypt.hash);
    return bcryptify(this.get('password'), null, null).bind(this).then(function(hash){
      this.set('password', hash);
    });
  }
});

module.exports = User;