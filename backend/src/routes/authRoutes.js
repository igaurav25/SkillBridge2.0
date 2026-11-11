const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updatePassword,
  updateUserDetails,
  uploadAvatar,
  forgotPassword,
  resetPassword,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadAvatar: avatarUploadMiddleware } = require('../middleware/uploadMiddleware');

// Brute-force protection on authentication & password-reset endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/updatedetails', protect, updateUserDetails);
router.post('/avatar', protect, avatarUploadMiddleware.single('avatar'), uploadAvatar);
router.post('/forgotpassword', authLimiter, forgotPassword);
router.post('/resetpassword/:resettoken', authLimiter, resetPassword);
router.post('/logout', protect, logout);

module.exports = router;
