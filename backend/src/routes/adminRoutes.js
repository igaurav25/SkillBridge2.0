const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllJobsAdmin,
  updateJobStatusAdmin,
  deleteJobAdmin,
  getAllCompaniesAdmin,
  toggleCompanyVerification,
  getReportsAdmin,
  updateReportStatus,
  actionReportAdmin,
  getAllApplicationsAdmin,
  getAuditLogs,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  getMLSystemMonitoring,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All admin routes require admin role
router.use(protect, authorize('admin'));

router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);
router.put('/password', updateAdminPassword);

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/jobs', getAllJobsAdmin);
router.put('/jobs/:id/status', updateJobStatusAdmin);
router.delete('/jobs/:id', deleteJobAdmin);

router.get('/companies', getAllCompaniesAdmin);
router.put('/companies/:id/verify', toggleCompanyVerification);

router.get('/reports', getReportsAdmin);
router.put('/reports/:id/status', updateReportStatus);
router.post('/reports/:id/action', actionReportAdmin);

router.get('/applications', getAllApplicationsAdmin);
router.get('/audit-logs', getAuditLogs);
router.get('/ml-monitoring', getMLSystemMonitoring);

module.exports = router;

