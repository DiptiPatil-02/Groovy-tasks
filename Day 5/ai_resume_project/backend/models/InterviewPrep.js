const mongoose = require('mongoose');

const interviewPrepSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  role: {
    type: String,
    required: true,
  },
  questions: [{
    category: {
      type: String,
      required: true
    },
    question: {
      type: String,
      required: true
    },
    suggestedAnswer: {
      type: String
    }
  }]
}, {
  timestamps: true,
});

const InterviewPrep = mongoose.model('InterviewPrep', interviewPrepSchema);
module.exports = InterviewPrep;
