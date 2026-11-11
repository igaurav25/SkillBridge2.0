const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Report = require('../models/Report');
const Profile = require('../models/Profile');
const SavedJob = require('../models/SavedJob');
const { escapeRegex, parsePagination } = require('../utils/securityHelpers');

// @desc    Get complete admin platform statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalRecruiters,
      totalCompanies,
      verifiedCompanies,
      totalJobs,
      activeJobs,
      reportedJobs,
      totalApplications,
      pendingReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'recruiter' }),
      Company.countDocuments(),
      Company.countDocuments({ isVerified: true }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Job.countDocuments({ isReported: true }),
      Application.countDocuments(),
      Report.countDocuments({ status: 'Pending' }),
    ]);

    // Role distribution
    const roleStats = [
      { name: 'Students', count: totalStudents },
      { name: 'Recruiters', count: totalRecruiters },
      { name: 'Admins', count: totalUsers - (totalStudents + totalRecruiters) },
    ];

    // Recent applications overview
    const recentApplications = await Application.find()
      .populate('job', 'title companyName')
      .populate('candidate', 'name email')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalRecruiters,
        totalCompanies,
        verifiedCompanies,
        totalJobs,
        activeJobs,
        reportedJobs,
        totalApplications,
        pendingReports,
        roleStats,
        recentApplications,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users with rich profile and job searching details
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit || 50, 100);
    const query = {};

    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;
    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const userObj = u.toObject ? u.toObject() : { ...u };
        delete userObj.password;

        const authDetails = {
          loginEmail: userObj.email,
          loginPhone: userObj.phone || 'Not provided',
          authProvider: 'Email & Password (Bcrypt)',
          passwordProtected: true,
          passwordStatus: 'Bcrypt Salted Hash',
          isVerified: Boolean(userObj.isVerified),
          lastActive: userObj.updatedAt || userObj.createdAt,
        };

        let candidateProfile = null;
        if (userObj.role === 'student') {
          const [profile, appCount, savedCount] = await Promise.all([
            Profile.findOne({ user: userObj._id }).lean(),
            Application.countDocuments({ candidate: userObj._id }),
            SavedJob.countDocuments({ user: userObj._id }),
          ]);

          candidateProfile = {
            phone: profile?.phone || userObj.phone || 'Not provided',
            preferredRole: profile?.preferredRole || profile?.headline || 'Not specified',
            preferredLocation: profile?.preferredLocation || 'Not specified',
            expectedSalary: profile?.expectedSalary || 'Not specified',
            targetSkills: profile?.skills?.map((s) => s.name) || [],
            workTypePreference: profile?.workTypePreference || 'Not specified',
            resumeUrl: profile?.resumeUrl || '',
            resumeScore: profile?.resumeScore ?? 0,
            profileCompletion: profile?.profileCompletion ?? 0,
            education: profile?.education?.[0]
              ? `${profile.education[0].degree} (${profile.education[0].fieldOfStudy || 'General'})`
              : 'Not specified',
            applicationsCount: appCount,
            savedJobsCount: savedCount,
          };

          if (!userObj.phone && profile?.phone) {
            userObj.phone = profile.phone;
            authDetails.loginPhone = profile.phone;
          }
        }

        let recruiterProfile = null;
        if (userObj.role === 'recruiter') {
          const [company, jobCount, activeJobCount] = await Promise.all([
            Company.findOne({ createdBy: userObj._id }).lean(),
            Job.countDocuments({ recruiter: userObj._id }),
            Job.countDocuments({ recruiter: userObj._id, status: 'active' }),
          ]);

          recruiterProfile = {
            companyName: company?.name || userObj.companyName || 'Not specified',
            industry: company?.industry || 'Not specified',
            website: company?.website || '',
            location: company?.location || 'Not specified',
            companySize: company?.companySize || 'Not specified',
            isVerified: Boolean(company?.isVerified),
            totalJobsPosted: jobCount,
            activeVacancies: activeJobCount,
            phone: userObj.phone || 'Not provided',
          };
        }

        return {
          ...userObj,
          phone: userObj.phone || authDetails.loginPhone,
          loginEmail: authDetails.loginEmail,
          loginPhone: authDetails.loginPhone,
          authProvider: authDetails.authProvider,
          passwordStatus: authDetails.passwordStatus,
          preferredRole: candidateProfile?.preferredRole,
          preferredStream: candidateProfile?.education,
          preferredLocation: candidateProfile?.preferredLocation,
          expectedSalary: candidateProfile?.expectedSalary,
          targetSkills: candidateProfile?.targetSkills,
          education: candidateProfile?.education,
          resumeScore: candidateProfile?.resumeScore,
          applicationsCount: candidateProfile?.applicationsCount,
          savedJobsCount: candidateProfile?.savedJobsCount,
          companyName: recruiterProfile?.companyName || userObj.companyName,
          industry: recruiterProfile?.industry,
          website: recruiterProfile?.website,
          companySize: recruiterProfile?.companySize,
          totalJobsPosted: recruiterProfile?.totalJobsPosted,
          authDetails,
          candidateProfile,
          recruiterProfile,
        };
      })
    );

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: enrichedUsers,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user status (suspend / activate)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'admin' && user._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own admin account' });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'User removed from platform' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all jobs for moderation
// @route   GET /api/admin/jobs
// @access  Private (Admin)
const getAllJobsAdmin = async (req, res, next) => {
  try {
    const { status, reportedOnly } = req.query;
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit || 20, 100);
    const query = {};

    if (status) query.status = status;
    if (reportedOnly === 'true') query.isReported = true;

    const total = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .populate('recruiter', 'name email')
      .populate('company', 'name isVerified')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: jobs,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle company verification
// @route   PUT /api/admin/companies/:id/verify
// @access  Private (Admin)
const toggleCompanyVerification = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    company.isVerified = !company.isVerified;
    company.verifiedAt = company.isVerified ? new Date() : null;
    await company.save();

    res.status(200).json({
      success: true,
      message: `Company ${company.isVerified ? 'verified' : 'unverified'} successfully`,
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getReportsAdmin = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('reporter', 'name email avatar')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    next(err);
  }
};

// @desc    Update report status
// @route   PUT /api/admin/reports/:id/status
// @access  Private (Admin)
const updateReportStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const STATUS_MAP = {
      pending: 'Pending',
      'under review': 'Under Review',
      under_review: 'Under Review',
      resolved: 'Resolved',
      rejected: 'Rejected',
    };

    if (status) {
      const normalized = STATUS_MAP[String(status).trim().toLowerCase()];
      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: 'Invalid report status. Allowed: Pending, Under Review, Resolved, Rejected.',
        });
      }
      report.status = normalized;
    }
    if (adminNotes !== undefined) report.adminNotes = adminNotes;
    report.resolvedBy = req.user.id;
    report.resolvedAt = new Date();

    await report.save();

    res.status(200).json({
      success: true,
      message: `Report status updated to ${report.status}`,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get admin personal profile
// @route   GET /api/admin/profile
// @access  Private (Admin)
const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id).select('-password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update admin personal profile (name, email, phone)
// @route   PUT /api/admin/profile
// @access  Private (Admin)
const updateAdminProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const admin = await User.findById(req.user.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (name) admin.name = name.trim();
    if (phone !== undefined) admin.phone = phone.trim();
    if (email) {
      const emailTrim = email.trim().toLowerCase();
      if (emailTrim !== admin.email) {
        const existing = await User.findOne({ email: emailTrim });
        if (existing) {
          return res.status(400).json({ success: false, message: 'This email is already in use by another account.' });
        }
        admin.email = emailTrim;
      }
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully!',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        avatar: admin.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update admin password
// @route   PUT /api/admin/password
// @access  Private (Admin)
const updateAdminPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const admin = await User.findById(req.user.id).select('+password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin password changed successfully!',
    });
  } catch (err) {
    next(err);
  }
};

const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const CareerPrediction = require('../models/CareerPrediction');
const mlService = require('../services/mlService');

// @desc    Get ML models monitoring, performance metrics, and system health
// @route   GET /api/admin/ml-monitoring
// @access  Private (Admin)
const getMLSystemMonitoring = async (req, res, next) => {
  try {
    const [totalAssessments, totalAttempts, totalPredictions, mlStatus] = await Promise.all([
      Assessment.countDocuments(),
      AssessmentAttempt.countDocuments(),
      CareerPrediction.countDocuments(),
      mlService.getModelsStatus()
    ]);

    const recentPredictions = await CareerPrediction.find()
      .populate('user', 'name email')
      .sort('-createdAt')
      .limit(6);

    res.status(200).json({
      success: true,
      data: {
        mlStatus,
        telemetry: {
          totalAssessments,
          totalAttempts,
          totalPredictions,
          systemUptimeSeconds: Math.round(process.uptime()),
          nodeMemoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        recentPredictions
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllJobsAdmin,
  toggleCompanyVerification,
  getReportsAdmin,
  updateReportStatus,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  getMLSystemMonitoring,
};
