var express = require('express');
var moment = require('moment-timezone');
var jade = require('jade');
var _ = require('underscore');
var router = express.Router();

var config  = require('../config');
var H = require('../helpers');

var Event = require('../models/event');

var mailer = require('../mailer');

router.get('/',function(request,response){
  var projection = {
    __v:false
  }
  if( ! H.hasPermission(request.authorisedUser,'events','view_responses'))
    projection["participants.answers"] = false;
  Event.find({},projection,
    function(err,events){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching events',null,err));
    else
      response.status(200).json(H.response(200,'Success',events));
  });
});

router.get('/:event_id',function(request,response){
  var projection = {
    __v:false
  }
  if( ! H.hasPermission(request.authorisedUser,'events','view_responses'))
    projection["participants.answers"] = false;
  Event.findById(request.params.event_id,projection
  ,function(err,event){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching event',null,err));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found',null,err));
    else
      response.status(200).json(H.response(200,'Success',event));
  });
});

router.post('/',H.assertPermission('events','create'),
function(request,response){
  var data = request.body;
  var event = new Event({
    title:data.title,
    description:data.description,
    event_url:data.event_url,
    event_state:data.event_state,
    start_time:data.start_time,
    end_time:data.end_time,
    participants:[],
    address:data.address,
    location:{
      latitude:data.latitude,
      longitude:data.longitude
    },
    questions:data.questions,
    created_at:moment(),
    updated_at:moment()
  });
  var validationErrors = event.validateSync();
  var errors = [];
  if(validationErrors)
  {
    for(key in validationErrors.errors)
      errors.push({field:key,message:validationErrors.errors[key].message});
  }
  if(errors.length > 0)
    response.status(422).json(H.response(422,'Invalid data',null,errors));
  else
    event.save(function(err){
      if(err)
      {
        var errors = [];
        for(key in err.errors)
          errors.push({field:key,message:err.errors[key].message});
        response.status(400).json(H.response(400,'Error while saving event',null,errors));
      }
      else
      {
        response.status(201).json(H.response(201,'Event created successfully',{_id:event._id}));
      }
    });
});

router.put('/:event_id',H.assertPermission('events','update'),
function(request,response){
  var data = request.body;
  var updateObject = {updated_at:moment()};
  for(i in Event.updatables)
  {
    var field = Event.updatables[i];
    if(data[field])
      updateObject[field] = data[field];
  }
  Event.findByIdAndUpdate(request.params.event_id,{$set:updateObject},function(err, event){
    if(err)
      response.status(400).json(H.response(400,'Error while updating event',null,err));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else
      response.status(200).json(H.response(200,'Event updated successfully',{_id:event._id}));
  });
});

router.post('/:event_id/request_participation',H.assertPermission('events','participate'),
function(request,response){
  Event.findById(request.params.event_id,
  function(err,event){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching event',null,err));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else if(event.participants.id(request.authorisedUser._id))
      response.status(422).json(H.response(422,'You are already a participant'));
    else
    {
      var mandatoryQuestions = _.where(event.questions,{is_mandatory:true});
      var answers = request.body.answers;
      var missingAnswers = [];
      _.each(mandatoryQuestions,function(question){
        var answer = _.findWhere(answers,{question_id:question._id.toString()});
        if( !answer || answer == '')
          missingAnswers.push(question);
      });
      if(missingAnswers.length > 0)
        response.status(422).json(H.response(422,'One or more mandatory questions are unanswered',null,missingAnswers));
      else
      {
        var user = _.pick(request.authorisedUser,'_id','first_name','last_name','email');
        user.participation_state = 'requested';
        user.answers = answers;
        event.participants.addToSet(user);
        event.save(function(err){
          if(err)
            response.status(400).json(H.response(400,'Error while saving event',null,err));
          else
            response.status(200).json(H.response(200,'Participation request saved',user));
        });
      }
    }
  });
});

router.post('/:event_id/accept_participation',H.assertPermission('events','moderate_participants'),
function(request,response){
  Event.findById(request.params.event_id,
  function(err,event){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching event',null,err));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else
    {
      var participant = event.participants.id(request.query._id)
      if(participant && participant.participation_state == 'requested')
      {
        participant.participation_state = 'accepted';
        event.save(function(err,event){
          if(err)
            response.status(400).json(H.response(400,'Error while saving event',null,err));
          else
          {
            response.status(200).json(H.response(200,'Participant accepted',participant)).end();
            var data = {user:participant,config:config,event:event};
            if(config.mail.sendAcceptedEmail)
              mailer.send({
                from : config.mail.from,
                to : participant.email,
                subject : jade.renderFile('emails/events/accepted/subject.jade',data),
                html : jade.renderFile('emails/events/accepted/html.jade',data),
                text : jade.renderFile('emails/events/accepted/text.jade',data)
              },function(err,message){
                if(err)
                  console.log('Error while sending welcome email : \n',err)
              });
          }
        });
      }
      else
        response.status(404).json(H.response(404,'Participant not found'));
    }
  });
});

router.post('/:event_id/confirm_participation',H.assertPermission('events','participate'),
function(request,response){
  Event.findById(request.params.event_id,
  function(err,event){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching event',null,err));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else
    {
      var participant = event.participants.id(request.authorisedUser._id)
      if(participant && participant.participation_state == 'accepted')
      {
        participant.participation_state = 'confirmed';
        event.save(function(err){
          if(err)
            response.status(400).json(H.response(400,'Error while saving event',null,err));
          else
            response.status(200).json(H.response(200,'Participation confirmed',participant));
        });
      }
      else
        response.status(404).json(H.response(404,'Participant not found'));
    }
  });
});
module.exports = router;
