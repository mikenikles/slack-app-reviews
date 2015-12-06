var _ = require('lodash');
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var Parse = require('parse/node');
var config = require('./config.json');
var configKeyWhitelist = ['minRating', 'maxRating'];

var loadReviewFromItunes = function(teamSettings, successCallback, errorCallback) {
  var appIdList = teamSettings.get('appIdList');
  var minRating = teamSettings.get('minRating') || 1;
  var maxRating = teamSettings.get('maxRating') || 5;
  var randomAppIndex = Math.floor(Math.random() * (appIdList.length));
  var randomAppId = appIdList[randomAppIndex];
  // Query iTunes
  request(config.itunesApi.baseUrl + randomAppId + '/' + config.itunesApi.responseFormat,
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var appName;
        var entries = JSON.parse(body).feed.entry;
        var reviews = _.filter(entries, function(entry) {
          if (entry['im:rating']) {
            // All but the first entry have that property.
            if (entry['im:rating'].label >= minRating && entry['im:rating'].label <= maxRating) {
              return entry;
            } else {
              return null;
            }
          } else {
            // Voila, the first entry is the app info
            appName = entry['im:name'].label;
          }
        });

        // Alright, let's see if we've found some reviews
        if (reviews.length > 0) {
          // Woohoo, let's share some random review
          var randomIndex = Math.floor(Math.random() * (reviews.length - 0)) + 0;
          var randomReview = reviews[randomIndex];
          var randomReviewRating = randomReview['im:rating'].label;
          var randomReviewRatingStars = '';
          for (var i = 1; i <= 5; i++) {
            if (i <= randomReviewRating) {
              randomReviewRatingStars += '★';
            } else {
              randomReviewRatingStars += '☆';
            }
          }
          var randomReviewLabel = randomReview.content.label;
          var slackMessage = appName + '\n' + randomReviewRatingStars + ': ' + randomReviewLabel;
          successCallback(slackMessage);
        } else {
          var errorMessage = 'No reviews for app: ' + (appName ? appName : randomAppId);
          console.log(errorMessage);
          errorCallback(errorMessage);
        }
      }
    }
  );
};

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
            console.log('Failed to create new object, with error code: ' + error.message);
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
        console.log('More than 1 settings entry for team: ' + teamDomain);
        errorCallback('Something went wrong... Please try again');
      }
    },
    error: function(error) {
      console.log('Cannot load team settings for team: ' + teamDomain + '. Error: ' + error);
      errorCallback('Something went wrong... Please try again');
    }
  });
};

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
        console.log('0 or more than 1 settings entry for team: ' + teamDomain);
        errorCallback('Something went wrong... Please try again');
      }
    },
    error: function(error) {
      console.log('Cannot load team settings for team: ' + teamDomain + '. Error: ' + error);
      errorCallback('Something went wrong... Please try again');
    }
  });
};

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
              console.log('Failed to create new object, with error code: ' + error.message);
              errorCallback('Failed to create new object, with error code: ' + error.message);
            }
          });
        } else {
          console.log('Invalid config key provided: ' + configKey + '; team: ' + teamDomain);
          errorCallback('Invalid config key.')
        }
        // Settings available, update
      } else if (results.length === 1) {
        if (_.contains(configKeyWhitelist, configKey)) {
          results[0].set(configKey, configValue);
          results[0].save();
          successCallback('Success! Your settings are persisted.');
        } else {
          console.log('Invalid config key provided: ' + configKey + '; team: ' + teamDomain);
          errorCallback('Invalid config key.')
        }
        // More than 1 settings entry for the given team... problem
      } else {
        console.log('More than 1 settings entry for team: ' + teamDomain);
        errorCallback('Something went wrong... Please try again');
      }
    },
    error: function(error) {
      console.log('Cannot load team settings for team: ' + teamDomain + '. Error: ' + error);
      errorCallback('Something went wrong... Please try again');
    }
  });
};

var processCommand = function(slackCommand, teamDomain, parameters, successCallback, errorCallback) {
  var parametersArray = parameters.split(' ');
  var command = parametersArray[0];
  if (command === 'add') {
    var appIdList = parametersArray[1].split(',');
    persistTeamSettings(slackCommand, teamDomain, appIdList, successCallback, errorCallback);
  } else if (command === 'list') {
    listTeamSettings(slackCommand, teamDomain, successCallback, errorCallback);
  } else if (command === 'set') {
    var configKey = parametersArray[1].split('=')[0];
    var configValue = parametersArray[1].split('=')[1];
    setTeamSettingsConfigValue(teamDomain, configKey, configValue, successCallback, errorCallback);
  } else if (command === 'help') {
    var helpMessage = 'Welcome to `slack-app-reviews`!\n\n' +
      'Usage: `' + slackCommand + ' [<command>]`\n\n' +
      'where `<command>` is one of:\n' +
      '    `add`, `list`, `set`, `help`\n\n' +
      '`' + slackCommand + '                          ` Displays a random review\n' +
      '`' + slackCommand + ' add <list of app IDs>    ` A comma separated list of app IDs from iTunes Connect\n' +
      '`' + slackCommand + ' list                     ` Lists all configured app IDs\n' +
      '`' + slackCommand + ' set <configKey>=<value>  ` where `<configKey>` is `minRating` or `maxRating`. A value between 1 and 5, inclusive\n' +
      '`' + slackCommand + ' help                     ` Help\n';
    successCallback(helpMessage);
  }
  // TODO: Add more commands: 'reset', 'remove'
};

var sendSlackResponse = function(res, message) {
  res.json({
    response_type: 'in_channel',
    text: message
  });
};

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

app.get('/test', function(req, res) {
  res.send();
});

app.delete('/remove-test-settings', function(req, res) {
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
      }
    },
    error: function(error) {
      console.log('Cannot delete team settings for team: ' + teamDomain + '. Error: ' + error);
      res.send('Something went wrong... Please try again');
    }
  });
});

app.post('/app-review', function(req, res) {
  var teamDomain = req.body.team_domain;
  var user = req.body.user_name;
  var slackCommand = req.body.command;
  var parameters = req.body.text;
  console.log('Team: ' + teamDomain + '; user: ' + user + '; Slack command: ' + slackCommand + '; parameters: ' + parameters);

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
            loadReviewFromItunes(teamSettings, function(message) {
              sendSlackResponse(res, message);
            }, function(error) {
              sendSlackResponse(res, error);
            });
          }
        }
      } else {
        console.log('More than 1 settings entry for team: ' + teamDomain);
        sendSlackResponse(res, 'Hey there ' + user + '! Something went wrong... Please try again');
      }
    },
    error: function(error) {
      console.log('Cannot load team settings for team: ' + teamDomain + '. Error: ' + error);
      sendSlackResponse(res, 'Hey there ' + user + '! Something went wrong... Please try again');
    }
  });
});


var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
  Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_APP_KEY);

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

module.exports = app;
