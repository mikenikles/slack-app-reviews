var _ = require('lodash');
var Parse = require('parse/node');
var util = require('../util');
var configKeyWhitelist = ['minRating', 'maxRating'];

var setTeamSettingsConfigValue = function(teamDomain, configKey, configValue, successCallback, errorCallback) {
  var TeamSettings = Parse.Object.extend('TeamSettings');
  var query = new Parse.Query(TeamSettings);
  query.equalTo('teamDomain', teamDomain);
  query.find({
    success: function(results) {
      // No settings yet, create a new entry
      if (results.length === 0) {
        var newTeamSettings = new TeamSettings();
        newTeamSettings.set('teamDomain', teamDomain);
        newTeamSettings.set('appIdList', []);
        if (_.contains(configKeyWhitelist, configKey)) {
          newTeamSettings.set(configKey, configValue);
          newTeamSettings.save(null, {
            success: function(persistedTeamSettings) {
              successCallback('Success! Your settings are persisted.');
            },
            error: function(persistedTeamSettings, error) {
              // Execute any logic that should take place if the save fails.
              // error is a Parse.Error with an error code and message.
              util.log('Failed to create new object, with error code: ' + error.message);
              errorCallback('Failed to create new object, with error code: ' + error.message);
            }
          });
        } else {
          util.log('Invalid config key provided: ' + configKey + '; team: ' + teamDomain);
          errorCallback('Invalid config key.')
        }
        // Settings available, update
      } else if (results.length === 1) {
        if (_.contains(configKeyWhitelist, configKey)) {
          results[0].set(configKey, configValue);
          results[0].save();
          successCallback('Success! Your settings are persisted.');
        } else {
          util.log('Invalid config key provided: ' + configKey + '; team: ' + teamDomain);
          errorCallback('Invalid config key.')
        }
        // More than 1 settings entry for the given team... problem
      } else {
        util.log('More than 1 settings entry for team: ' + teamDomain);
        errorCallback('Something went wrong... Please try again');
      }
    },
    error: function(error) {
      util.log('Cannot load team settings for team: ' + teamDomain + '. Error: ' + error);
      errorCallback('Something went wrong... Please try again');
    }
  });
};

module.exports = setTeamSettingsConfigValue;
