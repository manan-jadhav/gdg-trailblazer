var appConfig = require('./config').app;// Get the configuration options

var db = require('./db');// Call the Database connection instantiation code for once

var express = require('express');// Express is a framework http://expressjs.com
var app = express();// Initialize the app
var bodyParser = require('body-parser');

var usersController = require('./controllers/users');

app.use(bodyParser.json());// Use 'body-parser' to parse JSON bodies.

app.get('/',function(req,res){
  res.send("Hello");
})
app.use('/users',usersController);


// Listen to the port specified in config file
app.listen(appConfig.port, function(){
  console.log('Trailblazer server listening on port '+appConfig.port);
});
