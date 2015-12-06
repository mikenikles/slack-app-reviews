var _ = require('lodash');
var expect = require('expect.js');
var supertest = require('supertest');
var nock = require('nock');
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
  var nockiTunes = nock('https://itunes.apple.com')
    .get('/rss/customerreviews/id=400274934/json')
    .reply(200, require('./mock-itunes-response'));

  before('remove test settings', function(done) {
    request
      .delete('/remove-test-settings')
      .send({
        team_domain: teamDomain
      })
      .expect(200, 'Team settings successfully deleted.')
      .end(function(err, res) {
        if (err) throw err;
        done();
      });
  });

  it('returns 200 status for the help command', function(done) {
    var testRequest = _.clone(testRequestTemplate);
    testRequest.text = 'help';
    request
      .post('/app-review')
      .send(testRequest)
      .expect(function(res) {
        res.body.response_type = 'in_channel';
        expect(res.body.text).to.contain('Welcome');
      })
      .end(done);
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
    var testRequest = _.clone(testRequestTemplate);
    testRequest.text = 'add 400274934';
    request
      .post('/app-review')
      .send(testRequest)
      .expect({
        response_type: 'in_channel',
        text: 'Success! Your app IDs are persisted. From now on, use `' + slackCommand + '` to get a random review.'
      }, done);
  });

  it('lists app IDs successfully', function(done) {
    var testRequest = _.clone(testRequestTemplate);
    testRequest.text = 'list';
    request
      .post('/app-review')
      .send(testRequest)
      .expect({
        response_type: 'in_channel',
        text: 'Your team has the following app IDs configured:\n400274934'
      }, done);
  });

  it('sets a valid config value', function(done) {
    var testRequest = _.clone(testRequestTemplate);
    testRequest.text = 'set minRating=2';
    request
      .post('/app-review')
      .send(testRequest)
      .expect({
        response_type: 'in_channel',
        text: 'Success! Your settings are persisted.'
      }, done);
  });

  it('cannot set an invalid config value', function(done) {
    var testRequest = _.clone(testRequestTemplate);
    testRequest.text = 'set invalid=2';
    request
      .post('/app-review')
      .send(testRequest)
      .expect({
        response_type: 'in_channel',
        text: 'Invalid config key.'
      }, done);
  });

  it('loads a review successfully', function(done) {
    request
      .post('/app-review')
      .send(testRequestTemplate)
      .expect(function(res) {
        res.body.response_type = 'in_channel';
        expect(res.body.text).to.not.be('');
      })
      .end(done);
  });

  it('returns a 404 when the iTunes API is not available', function(done) {
    var nockiTunes = nock('https://itunes.apple.com')
      .get('/rss/customerreviews/id=400274934/json')
      .reply(404);
    request
      .post('/app-review')
      .send(testRequestTemplate)
      .expect(function(res) {
        res.body.response_type = 'in_channel';
        expect(res.body.text).to.be(404);
      })
      .end(done);
  });


  it('returns a message when no app review is available', function(done) {
    var nockiTunes = nock('https://itunes.apple.com')
      .get('/rss/customerreviews/id=400274934/json')
      .reply(200, {
        feed: {
          entry: []
        }
      });
    request
      .post('/app-review')
      .send(testRequestTemplate)
      .expect(function(res) {
        res.body.response_type = 'in_channel';
        expect(res.body.text).to.be('No reviews for app: 400274934');
      })
      .end(done);
  });

});
