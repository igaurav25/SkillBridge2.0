const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {
  recommendCareer,
  predictReadiness,
  recommendJobs,
  analyzeSkillGap,
  matchResume,
  clusterStudent,
  getModelStatus,
  getPredictionHistory
} = require('../controllers/mlController');

router.post('/career/recommend', optionalProtect, recommendCareer);
router.post('/career/readiness', optionalProtect, predictReadiness);
router.post('/jobs/recommend', optionalProtect, recommendJobs);
router.post('/skills/gap-analysis', optionalProtect, analyzeSkillGap);
router.post('/resume/match', optionalProtect, matchResume);
router.post('/students/cluster', optionalProtect, clusterStudent);
router.get('/models/status', getModelStatus);
router.get('/predictions/history', protect, getPredictionHistory);

module.exports = router;

