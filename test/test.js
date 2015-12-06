var _ = require('lodash');
var expect = require('expect.js');
var supertest = require('supertest');
var app = require('../index');

var teamDomain = 'test-team-domain';
var user = 'test-user';
var slackCommand = '/test-appreview';

var testRequestTemplate = {
  token: 'test-token',
  team_id: 'test-team-id',
  team_domain: teamDomain,
  channel_id: 'test-channel-id',
  channel_name: 'test-channel-name',
  user_id: 'test-user-id',
  user_name: user,
  command: slackCommand,
  text: '',
  response_url: ''
};

describe('API', function() {

  var request = supertest(app);

  before('remove test settings', function(done) {
    request
      .delete('/remove-test-settings')
      .send({
        team_domain: teamDomain
      })
      .expect(200, 'Team settings successfully deleted.')
      .end(function(err, res){
      if (err) throw err;
      done();
    });
  });

  it('returns 200 status', function(done) {
    request
      .get('/test')
      .expect(200, done);
  });

  it('cannot find team settings', function(done) {
    request
      .post('/app-review')
      .send(testRequestTemplate)
      .expect({
        response_type: 'in_channel',
        text: 'Hey there ' + user + '! We don\'t yet have any app IDs for your team. Please add some app IDs from iTunes Connect like so: `' + slackCommand + ' add <comma separated app ID list>`. For example: `' + slackCommand + ' add 123,456`'
      }, done);
  });

  it('persists app IDs successfully', function(done) {
    var testRequest = _.extend(testRequestTemplate, {
      text: 'add 123,456,789'
    });
    request
      .post('/app-review')
      .send(testRequest)
      .expect({
        response_type: 'in_channel',
        text: 'Success! Your app IDs are persisted. From now on, use `' + slackCommand + '` to get a random review.'
      }, done);
  });

  it('lists app IDs successfully', function(done) {
    var testRequest = _.extend(testRequestTemplate, {
      text: 'list'
    });
    request
      .post('/app-review')
      .send(testRequest)
      .expect({
        response_type: 'in_channel',
        text: 'Your team has the following app IDs configured:\n123\n456\n789'
      }, done);
  });

  it('sets a valid config value', function(done) {
    var testRequest = _.extend(testRequestTemplate, {
      text: 'set minRating=2'
    });
    request
      .post('/app-review')
      .send(testRequest)
      .expect({
        response_type: 'in_channel',
        text: 'Success! Your settings are persisted.'
      }, done);
  });

  it('cannot set an invalid config value', function(done) {
    var testRequest = _.extend(testRequestTemplate, {
      text: 'set invalid=2'
    });
    request
      .post('/app-review')
      .send(testRequest)
      .expect({
        response_type: 'in_channel',
        text: 'Invalid config key.'
      }, done);
  });
});
