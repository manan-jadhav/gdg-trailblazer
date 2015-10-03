var mongoose = require('mongoose');
var eventSchema = require('../schemas/event');

module.exports = mongoose.model('Event',eventSchema);
