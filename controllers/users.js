var express = require('express');
var moment = require('moment-timezone');
var crypto = require('crypto');
var bcrypt = require('bcryptjs');
var jade = require('jade');
var jwt = require('jsonwebtoken');
var _ = require('underscore');
var router = express.Router();

var config  = require('../config');
var H = require('../helpers');

var User = require('../models/user');

var mailer = require('../mailer');


router.get('/',H.assertPermission('users','view'),
function(request,response){
  User.find({},{
    __v:false,
    email_verification_code:false,
    password:false
  },function(err,users){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching users',null,err));
    else
      response.status(200).json(H.response(200,'Success',users));
  });
});

router.get('/:user_id',H.assertPermission('users','view'),
function(request,response){
  User.findById(request.params.user_id,{
    __v:false,
    email_verification_code:false,
    password:false
  },function(err,user){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching users',null,err));
    else if(user == null)
      response.status(404).json(H.response(404,'User not found'));
    else
      response.status(200).json(H.response(200,'Success',user));
  });
});

router.put('/:user_id/grant_permissions',H.assertPermission('users','manage_permissions'),
function(request,response){
  User.findById(request.params.user_id,
    function(err,user){
      if(err)
        response.status(400).json(H.response(400,'Error while fetching users',null,err));
      else if(user == null)
        response.status(404).json(H.response(404,'User not found'));
      else
      {
        var newPermissions = request.body;
        var contexts = _.keys(newPermissions);
        _.each(contexts,function(context){
          if( ! _.contains(user.permissions[context],newPermissions[context]) )
            user.permissions[context] = _.union(user.permissions[context],newPermissions[context]);
        });
        user.markModified('permissions');
        user.updated_at = moment();
        user.save(function(err){
          if(err)
            response.status(400).json(H.response(400,'Error while saving user',null,err));
          else
            response.status(200).json(H.response(200,'Permissions granted',{_id:user._id}));
        });
      }
    });
});


router.put('/:user_id/revoke_permissions',H.assertPermission('users','manage_permissions'),
function(request,response){
  User.findById(request.params.user_id,
    function(err,user){
      if(err)
        response.status(400).json(H.response(400,'Error while fetching users',null,err));
      else if(user == null)
        response.status(404).json(H.response(404,'User not found'));
      else
      {
        var revokedPermissions = request.body;
        var contexts = _.keys(revokedPermissions);
        _.each(contexts,function(context){
            user.permissions[context] = _.difference(user.permissions[context],revokedPermissions[context]);
        });
        user.markModified('permissions');
        user.updated_at = moment();
        user.save(function(err){
          if(err)
            response.status(400).json(H.response(400,'Error while saving user',null,err));
          else
            response.status(200).json(H.response(200,'Permissions revoked',{_id:user._id}));
        });
      }
    });
});


router.post('/',function(request,response){
  // This endpoint is public
    var data = request.body;
    var user = new User({
      email : data.email,
      first_name : data.first_name,
      last_name : data.last_name,
      mobile : data.mobile,
      timezone : data.timezone,
      city : data.city,
      email_verified_at:null,
      email_verification_code: parseInt(crypto.randomBytes(2).toString('hex'),16),
      created_at:moment(),
      updated_at:moment()
    });
    var validationError = user.validateSync();
    var errors = [];
    if(validationError)
    {
      for(key in validationError.errors)
        errors.push({field:key,message:validationError.errors[key].message});
    }
    if( ! (data.password && data.password.length > 5) )
      errors.push({field:'password',message:'Password must be larger than 5 characters.'});
    else
      user.password = bcrypt.hashSync(data.password,8);
    if(errors.length > 0)
      response.status(422).json(H.response(422,'Invalid data',null,errors));
    else
    user.save(function(err){
      if(err)
      {
        var errors = [];
        for(key in err.errors)
          errors.push({field:key,message:err.errors[key].message});
        response.status(400).json(H.response(400,'Error while saving user',null,errors));
      }
      else
      {
        response.status(201).json(H.response(201,'User created successfully',{_id:user._id}));
        mailer.send({
          from : config.mail.from,
          to : user.email,
          subject : jade.renderFile('emails/users/welcome/subject.jade',{user:user,config:config}),
          html : jade.renderFile('emails/users/welcome/html.jade',{user:user,config:config}),
          text : jade.renderFile('emails/users/welcome/text.jade',{user:user,config:config})
        },function(err,message){
          if(err)
            console.log('Error while sending welcome email : \n',err)
        });
        mailer.send({
          from : config.mail.from,
          to : user.email,
          subject : jade.renderFile('emails/users/verification/subject.jade',
            {user:user,config:config,verificationCode:user.email_verification_code}),
          html : jade.renderFile('emails/users/verification/html.jade',
            {user:user,config:config,verificationCode:user.email_verification_code}),
          text : jade.renderFile('emails/users/verification/text.jade',
          {user:user,config:config,verificationCode:user.email_verification_code})
        },function(err,message){
          if(err)
            console.log('Error while sending verification email : \n',err)
        });
      }
    });
})

router.put('/',H.assertPermission('self','update'),
function(request,response){
  var data = request.body;
  var updateObject = {updated_at:moment()};
  for(i in User.userUpdatables)
  {
    var field = User.userUpdatables[i];
    if(data[field])
      updateObject[field] = data[field];
  }
  User.findByIdAndUpdate(request.authorisedUser._id,{$set:updateObject},function(err, user){
    if(err)
      response.status(400).json(H.response(400,'Error while updating user',null,err));
    else
      response.status(200).json(H.response(200,'User updated successfully',{_id:user._id}));
  });
});

router.put('/:user_id',H.assertPermission('users','update'),
function(request,response){
  var data = request.body;
  var updateObject = {updated_at:moment()};
  for(i in User.userUpdatables)
  {
    var field = User.userUpdatables[i];
    if(data[field])
      updateObject[field] = data[field];
  }
  if(H.hasPermission(request.authorisedUser,'users','manage_permissions'))
    if(data.permissions)
      updateObject.permissions = data.permissions;
  User.findByIdAndUpdate(request.params.user_id,{$set:updateObject},function(err, user){
    if(err)
      response.status(400).json(H.response(400,'Error while updating user',null,err));
    else
      response.status(200).json(H.response(200,'User updated successfully',{_id:user._id}));
  });
});

router.post('/verify_email',function(request,response){
  // This endpoint is public
  User.findOne({email:request.body.email},function(err, user){
    if(err)
      response.status(400).json(H.response(400,'Error while finding user',null,err));
    else if(user == null)
      response.status(404).json(H.response(404,'User not found'))
    else if(user.email_verified_at)
      response.status(422).json(H.response(422,'Email has been already verified'));
    else if(user.email_verification_code != request.body.email_verification_code)
      response.status(400).json(H.response(400,'Invalid verification code',null,
        {field:'email_verification_code',message:'Invalid verification code'}));
    else{
      user.email_verified_at = moment();
      user.updated_at = moment();
      user.save(function(err,user){
        if(err)
          response.status(400).json(H.response(400,'Error while updating user',null,err));
        else
          response.status(200).json(H.response(200,'User email verified successfully',{_id:user._id}));
      });
    }
  });
});

router.post('/authenticate',function(request,response){
  // This endpoint is public
  User.findOne({email:request.body.email},function(err,user){
    if(user == null)
      response.status(404).json(H.response(404,'User not found'));
    else if(err)
      response.status(400).json(H.response(400,'Error while fetching user',null,err));
    else
    {
      if( ! user.email_verified_at)
        response.status(403).json(H.response(403,'Email not verified'));
      else if(request.body.password && bcrypt.compareSync(request.body.password,user.password))
      {
        var payload = {
          _id:user._id,
          email:user.email,
          first_name:user.first_name,
          last_name:user.last_name
        };
        var access_token = jwt.sign(payload,config.app.secret,{expiresInMinutes:120});
        response.status(200).json(H.response(200,'Success',{_id:user._id,access_token:access_token,expires_at:moment().add(120,'minute').format()}));
      }
      else
        response.status(401).json(
          H.response(401,'Invalid Credentials',null,[
            {field:'password',message:'Invalid Credentials'}
          ]));
    }
  });
});
module.exports = router;
