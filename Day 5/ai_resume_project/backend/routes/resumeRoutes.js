const express = require('express');
const { createResume, getResumes, getResumeById, updateResume, deleteResume, uploadResume } = require('../controllers/resumeController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect); // All resume routes protected

router.post('/upload', uploadResume);
router.route('/').get(getResumes).post(createResume);
router.route('/:id').get(getResumeById).put(updateResume).delete(deleteResume);

module.exports = router;
