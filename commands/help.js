var help = function(slackCommand, successCallback) {
  var helpMessage = 'Welcome to `slack-app-reviews`!\n\n' +
    'Usage: `' + slackCommand + ' [<command>]`\n\n' +
    'where `<command>` is one of:\n' +
    '    `add`, `remove`, `list`, `set`, `help`\n\n' +
    '`' + slackCommand + '                          ` Displays a random review\n' +
    '`' + slackCommand + ' add <list of app IDs>    ` A comma separated list of app IDs from iTunes Connect\n' +
    '`' + slackCommand + ' remove <list of app IDs> ` A comma separated list of app IDs to remove\n' +
    '`' + slackCommand + ' list                     ` Lists all configured app IDs\n' +
    '`' + slackCommand + ' set <configKey>=<value>  ` where `<configKey>` is `minRating` or `maxRating`. A value between 1 and 5, inclusive\n' +
    '`' + slackCommand + ' help                     ` Help\n';
  successCallback(helpMessage);

};

module.exports = help;
