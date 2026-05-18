const express = require('express');
const { registerUser, loginUser, getUserProfile, resetData } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.delete('/reset-data', protect, resetData);

module.exports = router;
