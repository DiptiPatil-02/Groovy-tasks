const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({ name, email, password });
    if (user) {
      res.status(201).json({
        user: { _id: user._id, name: user.name, email: user.email },
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        user: { _id: user._id, name: user.name, email: user.email },
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

exports.getUserProfile = async (req, res) => {
  res.json(req.user);
};

const Resume = require('../models/Resume');
const Interview = require('../models/InterviewPrep');

exports.resetData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Promise.all([
      Resume.deleteMany({ user: userId }),
      Interview.deleteMany({ user: userId })
    ]);
    res.json({ message: 'All data has been reset successfully.' });
  } catch (error) {
    next(error);
  }
};
