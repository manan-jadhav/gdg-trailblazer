var appConfig = require('./config').app;// Get the configuration options

var moment = require('moment-timezone').tz.setDefault(appConfig.timezone)
var jwt = require('jsonwebtoken');

var db = require('./db');// Call the Database connection instantiation code for once

var H = require('./helpers');

var User = require('./models/user');

var express = require('express');// Express is a framework http://expressjs.com
var app = express();// Initialize the app
var bodyParser = require('body-parser');

var usersController = require('./controllers/users');
var eventsController = require('./controllers/events');

app.use(bodyParser.json());// Use 'body-parser' to parse JSON bodies.

app.use(function(req,res,next){
  try
  {
    var header = req.get('Authorization');
    if(header)
      var token = header.split(' ')[1]; // 'Bearer access_token' format
    else
      next();
  }catch(e){}
  if(token)
  {
      jwt.verify(token,appConfig.secret,function(err,decoded){
        if(err && err.name == 'TokenExpiredError')
          res.status(401).json(H.response(401,"Access token is expired."));
        else if(err)
          res.status(400).json(H.response(400,"Access token is invalid."));
        else
          User.findById(decoded._id,function(err,user){
            if(! err)
              req.authorisedUser = user;
            req.tokenErrors = false;
            next();
          });
      });
  }
});

app.use('/users',usersController);
app.use('/events',eventsController);


// Listen to the port specified in config file
app.listen(appConfig.port, function(){
  console.log('Trailblazer server listening on port '+appConfig.port);
});
