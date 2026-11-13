const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getPublicPlatformStats,
  getStudentCareerAnalytics,
  getRecruiterAnalytics,
} = require('../controllers/analyticsController');

router.get('/public-stats', getPublicPlatformStats);
router.get('/career', protect, getStudentCareerAnalytics);
router.get('/recruiter', protect, authorize('recruiter', 'admin'), getRecruiterAnalytics);

module.exports = router;

