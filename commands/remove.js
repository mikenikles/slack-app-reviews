var Parse = require('parse/node');
var util = require('../util');

var removeAppId = function(slackCommand, teamDomain, appIdList, successCallback, errorCallback) {
  var TeamSettings = Parse.Object.extend('TeamSettings');
  var query = new Parse.Query(TeamSettings);
  query.equalTo('teamDomain', teamDomain);
  query.find({
    success: function(results) {
      // No settings yet, create a new entry
      if (results.length === 0) {
        errorCallback('We don\'t yet have any app IDs for your team. Please add some app IDs from iTunes Connect like so: `' + slackCommand + ' add <comma separated app ID list>`. For example: `' + slackCommand + ' add 123,456`');
      // Settings available, update
      } else if (results.length === 1) {
        for (var index = 0; index < appIdList.length; index++) {
          var appId = appIdList[index];
          results[0].remove('appIdList', appId);
        }
        results[0].save();
        successCallback('Success! Your app ID got removed.');
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

module.exports = removeAppId;
