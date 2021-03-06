var _ = require('lodash');
var _super = require('sails-auth/api/models/User');
var Promise = require('bluebird');

_.merge(exports, _super);
_.merge(exports, {
  attributes: {
    roles: {
      collection: 'Role',
      via: 'users',
      dominant: true
    },
    permissions: {
      collection: "Permission",
      via: "user"
    }
  },

  /**
   * Attach default Role to a new User
   */
  afterCreate: [
    function setOwner (user, next) {
      sails.log.verbose('User.afterCreate.setOwner', user);
      User
        .update({ id: user.id }, { owner: user.id })
        .then(function (user) {
          next();
        })
        .catch(function (e) {
          sails.log.error(e);
          next(e);
        });
    },
    function attachDefaultRole (user, next) {
      Promise.bind({ }, User.findOne(user.id)
        .populate('roles')
        .then(function (user) {
          this.user = user;
          return Role.findOne({ name: 'registered' });
        })
        .then(function (role) {
          this.user.roles.add(role.id);
          return this.user.save();
        })
        .then(function (updatedUser) {
          sails.log.silly('role "registered" attached to user', this.user.username);
          next();
        })
        .catch(function (e) {
          sails.log.error(e);
          next(e);
        })
      );
    }
  ]
});
exports.afterDestroy = exports.afterDestroy || [];
exports.afterDestroy.push(function deletePermissions(users, cb){
  try{
    Permission.destroy({relation: "user", user: _.map(users, "id")}).exec(function(err){
      if(err) sails.log.error(err);
      return cb();
    });
  } catch (e) {
    return cb(e);
  }

});