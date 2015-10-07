var mongoose = require('mongoose');
var config = require('../config');

var moment = require('moment-timezone');
var validators = require('mongoose-validators');

var userSchema = require('./user');

function dateFormatter(date)
{
  return moment(date).format();
}

// Event schema definition
var eventSchema = new mongoose.Schema({
  title : {
    type:String,
    required:'Title is required.'
  },
  description : String,
  is_cancelled : {
    type:Boolean,
    default:false
  },
  event_url : {
    type:String,
    validate:validators.isURL({
      message:"URL should be properly formatted",
      protocols:["http","https"],
      require_protocol:true
    })
  },
  questions : {
    type:[{
      question:String,
      is_mandatory:{
        type:Boolean,
        default:false
      }
    }]
  },
  participants : [
    {
      first_name:String,
      last_name:String,
      email:String,
      answers:{
        type:[
          {
            _id:false,
            question_id:mongoose.Schema.Types.ObjectId,
            answer:{
              type:String,
              required:'Answer is required'
            }
          }],
        default:[]
      },
      participation_state:String
    }],
  start_time : {
    type:Date,
    required:'Start time is required.',
    get:dateFormatter
  },
  end_time : {
    type:Date,
    required:'Start time is required.',
    get:dateFormatter
  },
  address: String,
  location : {
    latitude : Number,
    longitude : Number
  },
  created_at : {
    type:Date,
    default:Date.now,
    get:dateFormatter
  },
  updated_at : {
    type:Date,
    default:Date.now,
    get:dateFormatter
  }
});

eventSchema.set('toJSON', { virtuals: true, getters:true });
eventSchema.set('toObject', { virtuals: true, getters:true });

eventSchema.virtual('event_state').get(function(){
  if(this.is_cancelled)
    return 'cancelled';
  else if( moment().isBefore(this.start_time) )
    return 'upcoming';
  else
    return 'completed';
});

eventSchema.statics.updatables = ['title','event_url','description','questions','start_time','end_time','address','location','event_state','participants'];

module.exports = eventSchema;
