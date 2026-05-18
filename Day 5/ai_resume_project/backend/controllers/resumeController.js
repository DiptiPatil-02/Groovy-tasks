const Resume = require('../models/Resume');
const { PDFParse } = require('pdf-parse');
const multer = require('multer');

// Multer config for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
}).single('resume');

const aiService = require('../config/ai');

exports.uploadResume = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) return res.status(400).json({ message: 'Please upload a file' });

    try {
      console.log('Starting PDF parsing for:', req.file.originalname);
      let extractedText = '';
      
      try {
        const parser = new PDFParse({ data: req.file.buffer });
        const result = await parser.getText();
        extractedText = result.text;
      } catch (pdfErr) {
        console.error('PDF Parse Full Error:', pdfErr.message);
        return res.status(422).json({ 
          message: 'Could not extract text from this PDF. It might be a scanned image or encrypted.',
          error: pdfErr.message 
        });
      }

      if (!extractedText || extractedText.trim().length < 10) {
        return res.status(422).json({ message: 'PDF seems empty or contains only images.' });
      }

      // Analyze the resume using AI
      console.log('Sending text to AI for analysis...');
      const aiResult = await aiService.analyzeResume(extractedText);
      
      // Ensure skills is an array
      let skills = aiResult.skills || [];
      if (typeof skills === 'string') {
        skills = skills.split(',').map(s => s.trim());
      }

      const resume = await Resume.create({
        user: req.user._id,
        title: req.file.originalname,
        fullName: aiResult.fullName || '',
        email: aiResult.email || '',
        phone: aiResult.phone || '',
        location: aiResult.location || '',
        summary: aiResult.summary || extractedText.substring(0, 500),
        skills: skills,
        experience: aiResult.experience || [],
        education: aiResult.education || [],
        score: aiResult.score || 0,
        suggestions: aiResult.suggestions || [],
        interviewQuestions: [] // Questions will be generated when the interview starts
      });

      console.log('Resume analyzed and saved successfully.');
      res.status(201).json(resume);
    } catch (error) {
      console.error('Upload Controller Error:', error.message);
      next(error);
    }
  });
};

exports.createResume = async (req, res, next) => {
  // Existing manual creation logic
  try {
    const resume = await Resume.create({
      user: req.user._id,
      ...req.body
    });
    res.status(201).json(resume);
  } catch (error) {
    next(error);
  }
};

exports.getResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(resumes);
  } catch (error) {
    next(error);
  }
};

exports.getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (resume && resume.user.toString() === req.user._id.toString()) {
      res.json(resume);
    } else {
      res.status(404);
      throw new Error('Resume not found');
    }
  } catch (error) {
    next(error);
  }
};

exports.updateResume = async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (resume && resume.user.toString() === req.user._id.toString()) {
      const updatedResume = await Resume.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(updatedResume);
    } else {
      res.status(404);
      throw new Error('Resume not found');
    }
  } catch (error) {
    next(error);
  }
};

exports.deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (resume && resume.user.toString() === req.user._id.toString()) {
      await resume.deleteOne();
      res.json({ message: 'Resume removed' });
    } else {
      res.status(404);
      throw new Error('Resume not found');
    }
  } catch (error) {
    next(error);
  }
};

