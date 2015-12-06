var Parse = require('parse/node');
var util = require('../util');
var commands = require('../commands');

var sendSlackResponse = function(res, message) {
  res.json({
    response_type: 'in_channel',
    text: message
  });
};

var processCommand = function(slackCommand, teamDomain, parameters, successCallback, errorCallback) {
  var parametersArray = parameters.split(' ');
  var command = parametersArray[0];
  if (command === 'add') {
    var appIdList = parametersArray[1].split(',');
    commands.add(slackCommand, teamDomain, appIdList, successCallback, errorCallback);
  } else if (command === 'list') {
    commands.list(slackCommand, teamDomain, successCallback, errorCallback);
  } else if (command === 'set') {
    var configKey = parametersArray[1].split('=')[0];
    var configValue = parametersArray[1].split('=')[1];
    commands.set(teamDomain, configKey, configValue, successCallback, errorCallback);
  } else if (command === 'help') {
    commands.help(slackCommand, successCallback);
  }
  // TODO: Add more commands: 'reset', 'remove'
};

var appReviewRoute = function(req, res) {
  var teamDomain = req.body.team_domain;
  var user = req.body.user_name;
  var slackCommand = req.body.command;
  var parameters = req.body.text;
  util.log('Team: ' + teamDomain + '; user: ' + user + '; Slack command: ' + slackCommand + '; parameters: ' + parameters);

  // Load team settings
  var TeamSettings = Parse.Object.extend('TeamSettings');
  var query = new Parse.Query(TeamSettings);
  query.equalTo('teamDomain', teamDomain);
  query.find({
    success: function(results) {
      // No team settings persisted yet
      if (results.length === 0) {
        // If parameters were provided, process them
        if (parameters && parameters.length > 0) {
          processCommand(slackCommand, teamDomain, parameters, function(message) {
            sendSlackResponse(res, message);
          }, function(error) {
            sendSlackResponse(res, error);
          });
        } else {
          sendSlackResponse(res, 'Hey there ' + user + '! We don\'t yet have any app IDs for your team. Please add some app IDs from iTunes Connect like so: `' + slackCommand + ' add <comma separated app ID list>`. For example: `' + slackCommand + ' add 123,456`');
        }
        // Exactly one team settings row - perfect
      } else if (results.length === 1) {
        // If parameters were provided, process them
        if (parameters && parameters.length > 0) {
          processCommand(slackCommand, teamDomain, parameters, function(message) {
            sendSlackResponse(res, message);
          }, function(error) {
            sendSlackResponse(res, error);
          });
          // If no paramters were provided, load a review
        } else {
          var teamSettings = results[0];
          var appIdList = teamSettings.get('appIdList');
          if (appIdList && appIdList.length === 0) {
            // No settings yet for the given team domain
            sendSlackResponse(res, 'Hey there ' + user + '! We don\'t yet have any app IDs for your team. Please add some app IDs from iTunes Connect like so: `' + slackCommand + ' add <comma separated app ID list>`. For example: `' + slackCommand + ' add 123,456`');
          } else {
            require('../lib/load-reviews-itunes')(teamSettings, function(message) {
              sendSlackResponse(res, message);
            }, function(error) {
              sendSlackResponse(res, error);
            });
          }
        }
      } else {
        util.log('More than 1 settings entry for team: ' + teamDomain);
        sendSlackResponse(res, 'Hey there ' + user + '! Something went wrong... Please try again');
      }
    },
    error: function(error) {
      util.log('Cannot load team settings for team: ' + teamDomain + '. Error: ' + error);
      sendSlackResponse(res, 'Hey there ' + user + '! Something went wrong... Please try again');
    }
  });
};

var deleteRoute = function(req, res) {
  var teamDomain = req.body.team_domain;
  var TeamSettings = Parse.Object.extend('TeamSettings');
  var query = new Parse.Query(TeamSettings);
  query.equalTo('teamDomain', teamDomain);
  query.find({
    success: function(results) {
      if (results.length > 0) {
        results[0].destroy({
          success: function() {
            res.send('Team settings successfully deleted.');
          },
          error: function(teamSettings, error) {
            res.send('Team settings could not be deleted due to: ' + error);
          }
        });
      } else {
        res.send('Team settings successfully deleted.');
      }
    },
    error: function(error) {
      util.log('Cannot delete team settings for team: ' + teamDomain + '. Error: ' + error);
      res.send('Something went wrong... Please try again');
    }
  });
};

module.exports = {
  delete: deleteRoute,
  appReview: appReviewRoute
};
