var express = require('express');
var moment = require('moment-timezone');
var router = express.Router();

var H = require('../helpers');

var User = require('../models/user');

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
        response.status(201).json(H.response(201,"User created successfully.",{_id:user._id}));
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
      response.status(400).json(H.response(400,"Errow while updating user.",null,err));
    else
      response.status(201).json(H.response(201,"User updated successfully.",{_id:user._id}));
  });
});
module.exports = router;
