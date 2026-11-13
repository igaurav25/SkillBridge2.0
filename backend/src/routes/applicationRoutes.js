const express = require('express');
const router = express.Router();
const {
  applyForJob,
  getMyApplications,
  getApplicationById,
  withdrawApplication,
  getRecruiterApplications,
  updateApplicationStatus,
  bulkUpdateApplications,
  updateApplicationTags,
  addInternalNote,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/apply/:jobId', protect, authorize('student'), applyForJob);
router.get('/my', protect, authorize('student'), getMyApplications);
router.get('/recruiter/all', protect, authorize('recruiter', 'admin'), getRecruiterApplications);
router.post('/bulk-status', protect, authorize('recruiter', 'admin'), bulkUpdateApplications);
router.put('/:id/tags', protect, authorize('recruiter', 'admin'), updateApplicationTags);
router.post('/:id/internal-notes', protect, authorize('recruiter', 'admin'), addInternalNote);
router.get('/:id', protect, getApplicationById);
router.put('/:id/withdraw', protect, authorize('student'), withdrawApplication);
router.put('/:id/status', protect, authorize('recruiter', 'admin'), updateApplicationStatus);

module.exports = router;
