var config = require('./config');

var db = require('./db');

var User = require('./models/user');

var email = process.argv[2];

User.findOne({email:email},function(err,user){
  if(err)
    console.log('Error while fetching user');
  else if (user == null)
    console.log('No user with email '+email);
  else
  {
    user.permissions = {
      'users':['all'],
      'events':['all']
    };
    user.markModified('permissions');
    user.save(function(err,user){
      if(err)
        console.log('Error while saving user');
      else
        console.log(user.first_name+' <'+user.email+'> is now an admin !');
      db.connection.close();
    });
  }
  setTimeout(function(){db.connection.close()},1000);
});
