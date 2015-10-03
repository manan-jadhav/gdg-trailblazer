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
  event_state : {
    type:String,
    default:'upcoming'
  },
  participants : [userSchema],
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

eventSchema.statics.updatables = ['title','description','start_time','end_time','address','location','event_state','participants'];

module.exports = eventSchema;
