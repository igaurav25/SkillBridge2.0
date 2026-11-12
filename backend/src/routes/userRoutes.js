const express = require('express');
const router = express.Router();
const {
  searchCandidates,
  getUserById,
  updateBasicUser,
  updatePassword,
  updatePreferences,
  exportMyData,
  deleteMyAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/candidates', protect, authorize('recruiter', 'admin'), searchCandidates);
router.get('/export-data', protect, exportMyData);
router.put('/me', protect, updateBasicUser);
router.put('/password', protect, updatePassword);
router.put('/preferences', protect, updatePreferences);
router.delete('/me', protect, deleteMyAccount);
router.get('/:id', protect, getUserById);

module.exports = router;
