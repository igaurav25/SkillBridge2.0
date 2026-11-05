const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {
  getAllRoadmaps,
  getRoadmapByRole,
  getMyRoadmapProgress,
  toggleTopicCompletion
} = require('../controllers/roadmapController');

router.get('/', optionalProtect, getAllRoadmaps);
router.get('/role/:role', optionalProtect, getRoadmapByRole);
router.get('/progress/:role', protect, getMyRoadmapProgress);
router.post('/progress/toggle-topic', protect, toggleTopicCompletion);

module.exports = router;

