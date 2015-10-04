require('dotenv').load();
var _ = require('underscore');
var timezones = require('moment-timezone').tz.names();

function generateRandomSecret(length)
{
  return require('crypto').randomBytes(length).toString();
}

var config = {
  database : {
    host : process.env.DB_HOST || '127.0.0.1',
    port : process.env.DB_PORT || '27017',
    databaseName : process.env.DB_NAME || 'trailblazer',
    user : process.env.DB_USER,
    pass : process.env.DB_PASS
  },
  app: {
    name : process.env.APP_NAME || 'Trailblazer',
    port : process.env.APP_PORT || 8080,
    hostname : process.env.APP_HOST || 'localhost',
    timezone : process.env.APP_TIMEZONE || 'UTC',
    secret : process.env.APP_SECRET || generateRandomSecret(16)
  },
  mail: {
    from : process.env.MAIL_FROM || 'Trailblazer Mailer <trailblazer@gdgbaroda.com>',
    sendAcceptedEmail : true // Send email when participant is accepted?
  },
  smtp: {
    user : process.env.SMTP_USER,
    password : process.env.SMTP_PASSWORD,
    host : process.env.SMTP_HOST,
    port : process.env.SMTP_PORT,
    ssl : process.env.SMTP_USE_SSL,
    tls : process.env.SMTP_USE_TLS,
    timeout : process.env.SMTP_TIMEOUT,
    domain : process.env.SMTP_GREET_DOMAIN,
    authentication : process.env.SMTP_AUTHENTICATION
  }
}
if( ! _.contains(timezones, config.app.timezone))
{
  console.log('Invalid timezone '+config.app.timezone+' specified. Falling back, using UTC timezone.');
  config.app.timezone = 'UTC';
}
module.exports = config;
