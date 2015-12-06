var express = require('express');
var bodyParser = require('body-parser');
var Parse = require('parse/node');
var routes = require('./lib/routes');

// App config
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// Routes
app.delete('/remove-test-settings', routes.delete);
app.post('/app-review', routes.appReview);

// Server
var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
  Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_APP_KEY);

  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});

module.exports = app;
