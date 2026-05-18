const express = require('express');
const { generateQuestions, saveInterviewSession, getInterviewSessions } = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect); // All interview routes protected

router.get('/', getInterviewSessions);
router.post('/', saveInterviewSession);
router.post('/generate', generateQuestions);

module.exports = router;
