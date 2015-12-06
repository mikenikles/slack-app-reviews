var Parse = require('parse/node');
var util = require('../util');

var persistTeamSettings = function(slackCommand, teamDomain, appIdList, successCallback, errorCallback) {
  var TeamSettings = Parse.Object.extend('TeamSettings');
  var query = new Parse.Query(TeamSettings);
  query.equalTo('teamDomain', teamDomain);
  query.find({
    success: function(results) {
      // No settings yet, create a new entry
      if (results.length === 0) {
        var newTeamSettings = new TeamSettings();
        newTeamSettings.set('teamDomain', teamDomain);
        newTeamSettings.set('appIdList', appIdList);
        newTeamSettings.save(null, {
          success: function(persistedTeamSettings) {
            successCallback('Success! Your app IDs are persisted. From now on, use `' + slackCommand + '` to get a random review.');
          },
          error: function(persistedTeamSettings, error) {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            util.log('Failed to create new object, with error code: ' + error.message);
            errorCallback('Failed to create new object, with error code: ' + error.message);
          }
        });
        // Settings available, update
      } else if (results.length === 1) {
        for (var index = 0; index < appIdList.length; index++) {
          var appId = appIdList[index];
          results[0].addUnique('appIdList', appId);
        }
        results[0].save();
        successCallback('Success! Your app IDs are persisted. From now on, use `' + slackCommand + '` to get a random review.');
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

module.exports = persistTeamSettings;
