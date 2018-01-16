var mongoose = require('mongoose');

// SCHEMA SETUP
var questionSchema = new mongoose.Schema({
  type: {type: String},
  answer: String,
  options: [{
    type: String
  }],
  text: String
}, {
  usePushEach: true
});

module.exports = mongoose.model("Question", questionSchema);
