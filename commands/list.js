var _ = require('lodash');
var Parse = require('parse/node');
var util = require('../util');

var listTeamSettings = function(slackCommand, teamDomain, successCallback, errorCallback) {
  // Load team settings
  var TeamSettings = Parse.Object.extend('TeamSettings');
  var query = new Parse.Query(TeamSettings);
  query.equalTo('teamDomain', teamDomain);
  query.find({
    success: function(results) {
      if (results.length === 0) {
        successCallback('We don\'t yet have any app IDs for your team. Please add some app IDs from iTunes Connect like so: `' + slackCommand + ' add <comma separated app ID list>`. For example: `' + slackCommand + ' add 123,456`');
      } else if (results.length === 1) {
        var appIdArray = _.sortBy(results[0].get('appIdList'));
        var message = _.reduce(appIdArray, function(result, appId) {
          return result + '\n' + appId;
        });
        successCallback('Your team has the following app IDs configured:\n' + message);
      } else {
        util.log('0 or more than 1 settings entry for team: ' + teamDomain);
        errorCallback('Something went wrong... Please try again');
      }
    },
    error: function(error) {
      util.log('Cannot load team settings for team: ' + teamDomain + '. Error: ' + error);
      errorCallback('Something went wrong... Please try again');
    }
  });
};

module.exports = listTeamSettings;
