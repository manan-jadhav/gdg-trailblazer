var express = require('express');
var moment = require('moment-timezone');
var jade = require('jade');
var _ = require('underscore');
var router = express.Router();

var config  = require('../config');
var H = require('../helpers');

var Event = require('../models/event');

var mailer = require('../mailer');

router.get('/',/*H.assertPermission('events','read'),*/
function(request,response){
  var projection = {
    __v:false
  }
  if( ! H.hasPermission(request.authorisedUser,'events','view_participants'))
    projection["participants"] = false;
  else if( ! H.hasPermission(request.authorisedUser,'events','moderate_participants'))
    projection["participants.answers"] = false;

  var query = {deleted_at:null};
  if( H.hasPermission(request.authorisedUser,'events','read_deleted'))
    query = {};
  Event.find(query,projection,{sort:{start_time:-1}},
    function(err,events){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching events',null,err));
    else
      response.status(200).json(H.response(200,'Success',events));
  });
});

router.get('/:event_id',/*H.assertPermission('events','read'),*/
function(request,response){
  var projection = {
    __v:false
  }
  var query = {deleted_at:null};
  if( H.hasPermission(request.authorisedUser,'events','read_deleted'))
    query = {};
  query._id = request.params.event_id;
  Event.findOne(query,projection,
  function(err,event){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching event',null,err));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found',null,err));
    else{
        var raw = event;
        var event = event.toObject();
        var user = request.authorisedUser;
        if(!user){
            event['participation_state'] = 'not participated';
        } else {
            var participant = raw.participants.id(user._id);
            if(participant) {
                event['participation_state'] = participant.participation_state;
            } else {
                event['participation_state'] = 'not participated';
            }
        }
        if( ! H.hasPermission(request.authorisedUser,'events','view_participants'))
          delete event.participants;
        else if( ! H.hasPermission(request.authorisedUser,'events','moderate_participants'))
            _.each(event.participants, function(p){delete p.answers;});
        response.status(200).json(H.response(200,'Success',event));
    }
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
    location:data.location,
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
  var query = {deleted_at:null};
  if( H.hasPermission(request.authorisedUser,'events','read_deleted'))
    query = {};
  query._id = request.params.event_id;
  Event.findOne(query,function(err, event){
    if(err)
      response.status(400).json(H.response(400,'Error while fetching event'));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else
    {
      var data = request.body;
      event.updated_at = moment();
      for(i in Event.updatables)
      {
        var field = Event.updatables[i];
        if(data[field])
          event[field] = data[field];
      }
      event.save(function(err){
        if(err)
        {
          if(err.name == "ValidationError")
          {
            var errors = [];
            for(key in err.errors)
              errors.push({field:key,message:err.errors[key].message});
            response.status(422).json(H.response(422,'Invalid data',null,errors));
          }
          else
            response.status(400).json(H.response(400,'Error while updating event'));
        }
        else
          response.status(200).json(H.response(200,'Event updated successfully',{_id:event._id}));
      });
    }
  });
});

router.put('/:event_id/cancel',H.assertPermission('events','update'),
function(request,response){
  var query = {deleted_at:null};
  if( H.hasPermission(request.authorisedUser,'events','read_deleted'))
    query = {};
  query._id = request.params.event_id;
  Event.findOne(query,
    function(err, event){
    if(err)
        response.status(400).json(H.response(400,'Error while fetching event'));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else
    {
        event.updated_at = event.cancelled_at = moment();
        event.save(function(err){
          if(err && err.name == "ValidationError")
          {
            var errors = [];
            for(key in err.errors)
              errors.push({field:key,message:err.errors[key].message});
            response.status(422).json(H.response(422,'Invalid data',null,errors));
          }
          else if(err)
            response.status(400).json(H.response(400,'Error while updating event'));
          else
            response.status(200).json(H.response(200,'Event has been cancelled',{_id:event._id}));
        });
    }
  });
});

router.put('/:event_id/revert_cancel',H.assertPermission('events','update'),
function(request,response){
  var query = {deleted_at:null};
  if( H.hasPermission(request.authorisedUser,'events','read_deleted'))
    query = {};
  query._id = request.params.event_id;
  Event.findOne(query,
    function(err, event){
    if(err)
        response.status(400).json(H.response(400,'Error while fetching event'));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else if(!event.cancelled_at)
      response.status(200).json(H.response(200,'Event was not cancelled'));
    else
    {
        event.updated_at = moment();
        event.cancelled_at = undefined;
        event.save(function(err){
          if(err && err.name == "ValidationError")
          {
            var errors = [];
            for(key in err.errors)
              errors.push({field:key,message:err.errors[key].message});
            response.status(422).json(H.response(422,'Invalid data',null,errors));
          }
          else if(err)
            response.status(400).json(H.response(400,'Error while updating event'));
          else
            response.status(200).json(H.response(200,'Event has been restored',{_id:event._id}));
        });
    }
  });
});


router.delete('/:event_id',H.assertPermission('events','update'),
function(request,response){
  var query = {deleted_at:null};
  if( H.hasPermission(request.authorisedUser,'events','read_deleted'))
    query = {};
  query._id = request.params.event_id;
  Event.findOne(query,
    function(err, event){
    if(err)
        response.status(400).json(H.response(400,'Error while fetching event'));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else
    {
        event.deleted_at = moment();
        event.save(function(err){
          if(err)
            response.status(400).json(H.response(400,'Error while deleting event'));
          else
            response.status(200).json(H.response(200,'Event has been deleted',{_id:event._id}));
        });
    }
  });
});

router.put('/:event_id/restore',H.assertPermission('events','restore'),
function(request,response){
  Event.findById(request.params.event_id,
    function(err, event){
    if(err)
        response.status(400).json(H.response(400,'Error while fetching event'));
    else if(event == null)
      response.status(404).json(H.response(404,'Event not found'));
    else if(!event.deleted_at)
      response.status(200).json(H.response(200,'Event is not deleted'));
    else
    {
        event.deleted_at = null;
        event.save(function(err){
          if(err)
            response.status(400).json(H.response(400,'Error while updating event'));
          else
            response.status(200).json(H.response(200,'Event has been restored',{_id:event._id}));
        });
    }
  });
});

router.post('/:event_id/request_participation',H.assertPermission('events','read'),
function(request,response){
  var query = {
    deleted_at:null,
    _id:request.params.event_id
  };
  Event.findOne(query,
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
        if( !answer || answer.answer == '')
          missingAnswers.push(question);
      });
      console.log(missingAnswers);
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
  var query = {
    deleted_at:null,
    _id:request.params.event_id
  };
  Event.findOne(query,
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

router.post('/:event_id/decline_participation',H.assertPermission('events','moderate_participants'),
function(request,response){
  var query = {
    deleted_at:null,
    _id:request.params.event_id
  };
  Event.findOne(query,
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
        participant.participation_state = 'declined';
        event.save(function(err,event){
          if(err)
            response.status(400).json(H.response(400,'Error while saving event',null,err));
          else
          {
            response.status(200).json(H.response(200,'Participant declined',participant)).end();
            var data = {user:participant,config:config,event:event};
            if(config.mail.sendAcceptedEmail)
              mailer.send({
                from : config.mail.from,
                to : participant.email,
                subject : jade.renderFile('emails/events/declined/subject.jade',data),
                html : jade.renderFile('emails/events/declined/html.jade',data),
                text : jade.renderFile('emails/events/declined/text.jade',data)
              },function(err,message){
                if(err)
                  console.log('Error while sending decline email : \n',err)
              });
          }
        });
      }
      else
        response.status(404).json(H.response(404,'Participant not found'));
    }
  });
});


router.post('/:event_id/confirm_participation',H.assertAuthorised(),
function(request,response){
  var query = {
    deleted_at:null,
    _id:request.params.event_id
  };
  Event.findOne(query,
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
