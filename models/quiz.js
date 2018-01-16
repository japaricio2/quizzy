var mongoose = require('mongoose');

// SCHEMA SETUP
var quizSchema = new mongoose.Schema({
	author: {
	  id: {
	    type: mongoose.Schema.Types.ObjectId,
	    ref: "User"
	  },
	  username: String
  },
  name: String,
  date: String,
  attempts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Attempt"
  }],
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question"
  }]
}, {
  usePushEach: true
});

module.exports = mongoose.model("Quiz", quizSchema);