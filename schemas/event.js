var mongoose = require('mongoose');
var config = require('../config');

var moment = require('moment-timezone');
var validators = require('mongoose-validators');

var userSchema = require('./user');

function dateFormatter(date)
{
  if(date)
    return moment(date).format();
  else
    return null;
}

// Event schema definition
var eventSchema = new mongoose.Schema({
  title : {
    type:String,
    required:'Title is required.'
  },
  description : String,
  cancelled_at : {
    type:Date,
    get:dateFormatter,
    validate:validators.isBefore({message:'Event cannot be cancelled after it has started'},this.start_time)
  },
  deleted_at : {
    type:Date,
    get:dateFormatter
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
      question:{
        type:String,
        required:'Question is required'
      },
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
    required:'Start time is required',
    get:dateFormatter,
    validate:validators.isAfter({message:'Start time must be after the current time'},moment())
  },
  end_time : {
    type:Date,
    required:'End time is required',
    get:dateFormatter,
    validate:validators.isAfter({message:'Start time must be after the start time'},this.start_time)
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
  if(this.cancelled_at)
    return 'cancelled';
  else if( moment().isBefore(this.start_time) )
    return 'upcoming';
  else if( moment().isAfter(this.start_time) && moment().isBefore(this.end_time) )
    return 'started';
  else
    return 'completed';
});

eventSchema.statics.updatables = ['title','event_url','description','questions','start_time','end_time','address','location','event_state','participants'];

module.exports = eventSchema;
