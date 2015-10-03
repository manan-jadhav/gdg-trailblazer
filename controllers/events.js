var express = require('express');
var moment = require('moment-timezone');
var jade = require('jade');
var router = express.Router();

var config  = require('../config');
var H = require('../helpers');

var Event = require('../models/event');

var mailer = require('../mailer');

router.get('/',function(request,response){
  Event.find({},{
    __v:false,
  },function(err,events){
    if(err)
      response.status(400).json(H.response(400,"Error while fetching events.",null,err));
    else
      response.status(200).json(H.response(200,"Success.",events));
  });
});

router.post('/',H.assertPermission('events','create'),
function(request,response){
  var data = request.body;
  var event = new Event({
    title:data.title,
    description:data.description,
    event_state:data.event_state,
    start_time:data.start_time,
    end_time:data.end_time,
    participants:[],
    address:data.address,
    location:{
      latitude:data.latitude,
      longitude:data.longitude
    }
  });
  var validationErrors = event.validateSync();
  var errors = [];
  if(validationErrors)
  {
    for(key in validationErrors.errors)
      errors.push({field:key,message:validationErrors.errors[key].message});
  }
  if(errors.length > 0)
    response.status(422).json(H.response(422,"Invalid data.",null,errors));
  else
    event.save(function(err){
      if(err)
      {
        var errors = [];
        for(key in err.errors)
          errors.push({field:key,message:err.errors[key].message});
        response.status(400).json(H.response(400,"Error while saving event.",null,errors));
      }
      else
      {
        response.status(201).json(H.response(201,"Event created successfully.",{_id:event._id}));
      }
    });
});

router.put('/:event_id',H.assertPermission('events','update'),
function(request,response){
  var data = request.body;
  var updateObject = {};
  for(i in Event.updatables)
  {
    var field = Event.updatables[i];
    if(data[field])
      updateObject[field] = data[field];
  }
  if( request.expiredToken)
    response.status(401).json(H.response(401,"Token is expired.",null,[]));
  else if( request.expiredToken)
    response.status(401).json(H.response(401,"Token is invalid.",null,[]));
  else
    Event.findByIdAndUpdate(request.params.event_id,{$set:updateObject},function(err, event){
      if(err)
        response.status(400).json(H.response(400,"Error while updating event.",null,err));
      else
        response.status(200).json(H.response(200,"Event updated successfully.",{_id:event._id}));
    });
});
module.exports = router;
