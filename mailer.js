var smtpConfig = require('./config').smtp;
var emailjs = require('emailjs');

var connectionInstance = null;

function getConnectionInstance()
{
  if(connectionInstance == null)
  {
    connectionInstance = emailjs.server.connect(smtpConfig);
    console.log('Mailer instance created.')
  }
  return connectionInstance;
}

module.exports = getConnectionInstance();
