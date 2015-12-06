var _ = require('lodash');
var request = require('request');
var config = require('../config.json');
var util = require('../util');

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
          util.log(errorMessage);
          errorCallback(errorMessage);
        }
      } else {
        errorCallback(response.statusCode);
      }
    }
  );
};

module.exports = loadReviewFromItunes;
