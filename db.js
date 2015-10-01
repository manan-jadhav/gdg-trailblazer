var mongoose = require('mongoose');
var dbConfig = require('./config').database; // Get the configuration options

/*
Connect to the database instance, accessible at mongodb://host:port/database
according to the config file.
*/
mongoose.connect('mongodb://'+dbConfig.host+':'+dbConfig.port+'/'+dbConfig.databaseName,{
  user : dbConfig.user,
  pass : dbConfig.pass
});

// Export the mongoose instance, just in case we need it somewhere.
module.exports = mongoose;
