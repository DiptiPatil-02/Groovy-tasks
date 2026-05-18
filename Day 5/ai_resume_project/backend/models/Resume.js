const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Please add a resume title'],
  },
  fullName: String,
  email: String,
  phone: String,
  location: String,
  summary: String,
  skills: {
    type: [String],
    required: true,
  },
  experience: [{
    company: String,
    role: String,
    duration: String,
    description: String
  }],
  education: [{
    school: String,
    degree: String,
    year: String
  }],
  projects: [{
    name: String,
    description: String,
    techStack: String
  }],
  certifications: String,
  score: {
    type: Number,
    default: 0,
  },
  suggestions: {
    type: [String],
    default: [],
  },
  theme: {
    type: String,
    default: 'Modern'
  },
  interviewQuestions: [{
    question: String,
    suggestedAnswer: String,
    category: String
  }]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Resume', ResumeSchema);
