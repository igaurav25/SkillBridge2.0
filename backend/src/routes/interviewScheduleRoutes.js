const express = require('express');
const router = express.Router();
const {
  scheduleInterview,
  getInterviews,
  rescheduleInterview,
  cancelInterview,
  submitFeedback,
  getUpcomingReminders,
} = require('../controllers/interviewScheduleController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/upcoming-reminders', protect, getUpcomingReminders);
router.post('/', protect, authorize('recruiter', 'admin'), scheduleInterview);
router.get('/', protect, getInterviews);
router.patch('/:id/reschedule', protect, authorize('recruiter', 'admin'), rescheduleInterview);
router.patch('/:id/cancel', protect, authorize('recruiter', 'admin'), cancelInterview);
router.post('/:id/feedback', protect, authorize('recruiter', 'admin'), submitFeedback);

module.exports = router;
