var mongoose = require('mongoose');
var config = require('../config');

var moment = require('moment-timezone')

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
  participants : [
    {
      first_name:String,
      last_name:String,
      email:String,
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

eventSchema.statics.updatables = ['title','description','start_time','end_time','address','location','event_state','participants'];

module.exports = eventSchema;
