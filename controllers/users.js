var express = require('express');
var moment = require('moment-timezone');
var crypto = require('crypto');
var router = express.Router();

var config  = require('../config');
var H = require('../helpers');

var User = require('../models/user');

var mailer = require('../mailer');

var jade = require('jade');

router.get('/',function(request,response){
  User.find({},{
    __v:false,
    email_verified_at:false,
    password:false
  },function(err,users){
    if(err)
      response.status(400).json(H.response(400,"Error while fetching users.",null,err));
    else
      response.status(200).json(H.response(200,"Success.",users));
  });
});

router.get('/:user_id',function(request,response){
  User.findById(request.params.user_id,{
    __v:false,
    email_verified_at:false,
    password:false
  },function(err,user){
    if(err)
      response.status(400).json(H.response(400,"Error while fetching users.",null,err));
    else
      response.status(200).json(H.response(200,"Success.",user));
  });
});

router.post('/',function(request,response){
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

    if(errors.length > 0)
      response.status(422).json(H.response(422,"Invalid data.",null,errors));
    else
    user.save(function(err){
      if(err)
      {
        var errors = [];
        for(key in err.errors)
          errors.push({field:key,message:err.errors[key].message});
        response.status(400).json(H.response(400,"Error while saving user.",null,errors));
      }
      else
      {
        response.status(201).json(H.response(201,"User created successfully.",{_id:user._id}));
        mailer.send({
          from : config.mail.from,
          to : user.email,
          subject : jade.renderFile('emails/welcome/subject.jade',{user:user,config:config}),
          html : jade.renderFile('emails/welcome/html.jade',{user:user,config:config}),
          text : jade.renderFile('emails/welcome/text.jade',{user:user,config:config})
        },function(err,message){
          if(err)
            console.log("Error while sending welcome email : \n",err)
        });
        mailer.send({
          from : config.mail.from,
          to : user.email,
          subject : jade.renderFile('emails/verification/subject.jade',
            {user:user,config:config,verificationCode:user.email_verification_code}),
          html : jade.renderFile('emails/verification/html.jade',
            {user:user,config:config,verificationCode:user.email_verification_code}),
          text : jade.renderFile('emails/verification/text.jade',
          {user:user,config:config,verificationCode:user.email_verification_code})
        },function(err,message){
          if(err)
            console.log("Error while sending verification email : \n",err)
        });
      }
    });
})

router.put('/:user_id',function(request,response){
  var data = request.body;
  var updateObject = {};
  for(i in User.userUpdatables)
  {
    var field = User.userUpdatables[i];
    if(data[field])
      updateObject[field] = data[field];
  }
  User.findByIdAndUpdate(request.params.user_id,{$set:updateObject},function(err, user){
    if(err)
      response.status(400).json(H.response(400,"Error while updating user.",null,err));
    else
      response.status(200).json(H.response(200,"User updated successfully.",{_id:user._id}));
  });
});

router.put('/:user_id/verify_email',function(request,response){
  User.findById(request.params.user_id,function(err, user){
    if(user.email_verification_code == request.body.email_verification_code)
    {
      user.email_verified_at = moment();
      user.save(function(err,user){
        if(err)
          response.status(400).json(H.response(400,"Error while updating user.",null,err));
        else
          response.status(200).json(H.response(200,"User email verified successfully.",{_id:user._id}));
      });
    }
    else
      response.status(400).json(H.response(400,"Invalid verification code.",null,
      {email_verification_code:"Invalid verification code."}));
  });
});
module.exports = router;
