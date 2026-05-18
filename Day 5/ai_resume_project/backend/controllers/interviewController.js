const Interview = require('../models/InterviewPrep');

const questionBank = {
  Technical: [
    { question: 'Based on your resume, how did you handle technical debt in your last role?', keyword: 'experience' },
    { question: 'Can you explain the architecture of the most complex project listed on your resume?', keyword: 'project' },
    { question: 'Your resume mentions [SKILL]. Can you describe a time you used it to solve a critical issue?', keyword: 'skills' },
    { question: 'What was the most challenging technical hurdle in your work at [COMPANY]?', keyword: 'company' }
  ],
  General: [
    { category: 'Technical', question: 'Explain the difference between Virtual DOM and Shadow DOM.', suggestedAnswer: 'Virtual DOM is a React concept; Shadow DOM is a browser API.' },
    { category: 'Technical', question: 'How do closures work in JavaScript?', suggestedAnswer: 'Functions that remember their lexical environment.' },
    { category: 'HR', question: 'Describe a difficult technical challenge you solved.', suggestedAnswer: 'Use STAR method.' }
  ]
};

const aiService = require('../config/ai');

exports.generateQuestions = async (req, res, next) => {
  try {
    const { role, resumeData, language } = req.body;
    let selectedQuestions = [];

    if (resumeData) {
      // Use AI to generate questions based on the full resume data
      selectedQuestions = await aiService.generateInterviewQuestions(resumeData);
    } else if (language) {
      // Use AI to generate questions based on the selected language
      selectedQuestions = await aiService.generateLanguageQuestions(language);
    } else {
      // Fallback/Generic logic
      selectedQuestions = questionBank.General.sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    res.json({ questions: selectedQuestions });
  } catch (error) {
    next(error);
  }
};

exports.saveInterviewSession = async (req, res, next) => {
  try {
    const interview = await Interview.create({
      user: req.user._id,
      ...req.body
    });
    res.status(201).json(interview);
  } catch (error) {
    next(error);
  }
};

exports.getInterviewSessions = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(interviews);
  } catch (error) {
    next(error);
  }
};

exports.getInterviewById = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (interview && interview.user.toString() === req.user._id.toString()) {
      res.json(interview);
    } else {
      res.status(404);
      throw new Error('Interview not found');
    }
  } catch (error) {
    next(error);
  }
};
