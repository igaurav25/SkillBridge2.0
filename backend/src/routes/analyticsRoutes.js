const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPublicPlatformStats, getStudentCareerAnalytics } = require('../controllers/analyticsController');

router.get('/public-stats', getPublicPlatformStats);
router.get('/career', protect, getStudentCareerAnalytics);

module.exports = router;

