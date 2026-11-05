const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {
  getAssessments,
  getAssessmentById,
  submitAssessment,
  getMyAssessmentHistory
} = require('../controllers/assessmentController');

router.get('/', optionalProtect, getAssessments);
router.get('/history/me', protect, getMyAssessmentHistory);
router.get('/:id', optionalProtect, getAssessmentById);
router.post('/:id/submit', protect, submitAssessment);

module.exports = router;

