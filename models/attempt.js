var mongoose = require('mongoose');

// SCHEMA SETUP
var attemptSchema = new mongoose.Schema({
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    username: String
  },
  answers: [{
    type: String
  }],
  score: String
}, {
  usePushEach: true
});

module.exports = mongoose.model("Attempt", attemptSchema);