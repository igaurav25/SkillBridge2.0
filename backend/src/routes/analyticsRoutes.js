const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getStudentCareerAnalytics } = require('../controllers/analyticsController');

router.get('/career', protect, getStudentCareerAnalytics);

module.exports = router;

