var mongoose = require('mongoose');
var appConfig = require('../config').app;

var uniqueValidator = require('mongoose-unique-validator');
var validators = require('mongoose-validators');

var moment = require('moment-timezone')

// User schema definition
var userSchema = new mongoose.Schema({
  first_name : {
    type:String,
    required:'First name is required.',
    validate:validators.isAlpha({message:"First name should consist of alphabets only."})
  },
  last_name : {
    type:String,
    required:'Last name is required.',
    validate:validators.isAlpha({message:"Last name should consist of alphabets only."})
  },
  email : {
    type:String,
    unique:true,
    required:'Email is required.',
    validate:validators.isEmail({message:"Improper email format."})
  },
  mobile : Number,
  password : String,// Password is a hash of the password provided by the user
  city : {
    type:String,
    lowercase:true, // All cities should be in lowercase
    validate:validators.isAlpha({message:"City name should consist of alphabets only."})
  },
  technologies : {
    type:[String],
    lowercase:true, // All technologies should be in lowercase
  },
  permissions : {
    type: {
      String:[String]
    },
    default : {
      'self': ['view','update'],
      'users' : ['view'],
      'events' : ['view','participate']
    }
  },
  created_at : {
    type:Date,
    default:Date.now,
    get:function(date)
    {
      return moment(date).format();
    }
  },
  updated_at : {
    type:Date,
    default:Date.now,
    get:function(date)
    {
      return moment(date).format();
    }
  },
  email_verification_code:{
    type:String,
    required:true
  },
  email_verified_at:{ // The time at which email was verified
    type:Date,
    default:null,
    get:function(date)
    {
      if(date)
        return moment(date).format();
    }
  },
  timezone: { // Timezone of the user, to provide correct time representation
    type:String,
    default: appConfig.timezone,
    validate:validators.isIn({message:'Invalid timezone.'},moment.tz.names())
  }
});
userSchema.plugin(uniqueValidator, { message: 'Error, this {PATH} already exists.' });

userSchema.set('toJSON', { virtuals: true, getters:true });
userSchema.set('toObject', { virtuals: true, getters:true });

userSchema.statics.userUpdatables = ['first_name','last_name','city','technologies','mobile','timezone'];

module.exports = userSchema;
