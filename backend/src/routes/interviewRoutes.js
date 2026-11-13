const express = require('express');
const router = express.Router();
const {
  getQuestions,
  getCategories,
  startMockSession,
  submitMockAnswer,
  getMyMockSessions,
  getMockSessionById,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const interviewScheduleRoutes = require('./interviewScheduleRoutes');

// Live recruiter-candidate interview scheduling & calendar
router.use('/schedules', interviewScheduleRoutes);

router.get('/questions', getQuestions);
router.get('/categories', getCategories);
router.post('/mock/start', protect, startMockSession);
router.post('/mock/:sessionId/answer', protect, submitMockAnswer);
router.get('/mock/my', protect, getMyMockSessions);
router.get('/mock/:sessionId', protect, getMockSessionById);

module.exports = router;
