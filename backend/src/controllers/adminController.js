const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Report = require('../models/Report');
const Profile = require('../models/Profile');
const SavedJob = require('../models/SavedJob');
const AuditLog = require('../models/AuditLog');
const { escapeRegex, parsePagination } = require('../utils/securityHelpers');

// Helper to record administrative actions into AuditLog asynchronously
const recordAuditLog = async ({
  adminId,
  adminName,
  adminEmail,
  action,
  targetType,
  targetId,
  targetName,
  details,
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      admin: adminId,
      adminName: adminName || 'Administrator',
      adminEmail: adminEmail || '',
      action,
      targetType,
      targetId: String(targetId || ''),
      targetName: targetName || '',
      details: details || '',
      metadata,
    });
  } catch (err) {
    console.error('AuditLog Error:', err.message);
  }
};

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
      { name: 'Admins', count: Math.max(0, totalUsers - (totalStudents + totalRecruiters)) },
    ];

    // Recent applications overview
    const recentApplications = await Application.find()
      .populate('job', 'title companyName')
      .populate('candidate', 'name email')
      .sort('-createdAt')
      .limit(5);

    // Application funnel breakdown
    const applicationFunnelAgg = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const funnelStages = {
      Applied: 0,
      'Under Review': 0,
      Shortlisted: 0,
      Interview: 0,
      Selected: 0,
      Rejected: 0,
      Withdrawn: 0,
    };
    applicationFunnelAgg.forEach((item) => {
      if (item._id && Object.prototype.hasOwnProperty.call(funnelStages, item._id)) {
        funnelStages[item._id] = item.count;
      }
    });

    // Work type distribution
    const workTypeAgg = await Job.aggregate([
      { $group: { _id: '$workType', count: { $sum: 1 } } },
    ]);
    const workTypes = { remote: 0, hybrid: 0, onsite: 0 };
    workTypeAgg.forEach((item) => {
      if (item._id && Object.prototype.hasOwnProperty.call(workTypes, item._id)) {
        workTypes[item._id] = item.count;
      }
    });

    // Reports breakdown by reason
    const reportsReasonAgg = await Report.aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } },
    ]);
    const reportsByCategory = {};
    reportsReasonAgg.forEach((item) => {
      if (item._id) reportsByCategory[item._id] = item.count;
    });

    // 7-day user registration trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const userTrendAgg = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build continuous 7-day timeline
    const userTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = userTrendAgg.find((t) => t._id === dateStr);
      userTrend.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count: match ? match.count : 0,
      });
    }

    // Recent audit logs snippet
    const recentAuditLogs = await AuditLog.find()
      .sort('-createdAt')
      .limit(6);

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
        funnelStages,
        workTypes,
        reportsByCategory,
        userTrend,
        recentAuditLogs,
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

    const prevStatus = user.status;
    user.status = status;
    await user.save();

    await recordAuditLog({
      adminId: req.user.id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'USER_STATUS_CHANGE',
      targetType: 'User',
      targetId: user._id,
      targetName: user.name,
      details: `Changed account status from "${prevStatus || 'active'}" to "${status}" for ${user.email} (${user.role})`,
      metadata: { previousStatus: prevStatus, newStatus: status, userRole: user.role },
    });

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

    const userName = user.name;
    const userEmail = user.email;
    const userRole = user.role;

    await user.deleteOne();

    await recordAuditLog({
      adminId: req.user.id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'USER_DELETED',
      targetType: 'User',
      targetId: req.params.id,
      targetName: userName,
      details: `Permanently removed user account: ${userEmail} (${userRole})`,
      metadata: { deletedEmail: userEmail, role: userRole },
    });

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
    const { status, reportedOnly, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit || 20, 100);
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (reportedOnly === 'true') query.isReported = true;
    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { companyName: { $regex: escaped, $options: 'i' } },
        { location: { $regex: escaped, $options: 'i' } },
      ];
    }

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

// @desc    Update job moderation status, feature, or report flag
// @route   PUT /api/admin/jobs/:id/status
// @access  Private (Admin)
const updateJobStatusAdmin = async (req, res, next) => {
  try {
    const { status, isFeatured, isReported } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const changes = [];
    let auditAction = 'JOB_STATUS_CHANGE';

    if (status && ['active', 'closed', 'draft'].includes(status)) {
      changes.push(`status: ${job.status} -> ${status}`);
      job.status = status;
    }
    if (isFeatured !== undefined) {
      const nextFeatured = Boolean(isFeatured);
      changes.push(`featured: ${job.isFeatured} -> ${nextFeatured}`);
      job.isFeatured = nextFeatured;
      auditAction = nextFeatured ? 'JOB_FEATURED' : 'JOB_UNFEATURED';
    }
    if (isReported !== undefined) {
      changes.push(`isReported: ${job.isReported} -> ${Boolean(isReported)}`);
      job.isReported = Boolean(isReported);
      if (!isReported) job.reportedCount = 0;
    }

    await job.save();

    await recordAuditLog({
      adminId: req.user.id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: auditAction,
      targetType: 'Job',
      targetId: job._id,
      targetName: job.title,
      details: `Updated job moderation: ${changes.join(', ')} (${job.companyName})`,
      metadata: { status: job.status, isFeatured: job.isFeatured, isReported: job.isReported },
    });

    res.status(200).json({
      success: true,
      message: 'Job status updated successfully',
      data: job,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete job posting with admin audit
// @route   DELETE /api/admin/jobs/:id
// @access  Private (Admin)
const deleteJobAdmin = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const jobTitle = job.title;
    const compName = job.companyName;
    await job.deleteOne();

    await recordAuditLog({
      adminId: req.user.id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'JOB_DELETED',
      targetType: 'Job',
      targetId: req.params.id,
      targetName: jobTitle,
      details: `Permanently removed job posting: "${jobTitle}" from ${compName}`,
    });

    res.status(200).json({
      success: true,
      message: 'Job posting deleted successfully by administrator',
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

    await recordAuditLog({
      adminId: req.user.id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: company.isVerified ? 'COMPANY_VERIFIED' : 'COMPANY_UNVERIFIED',
      targetType: 'Company',
      targetId: company._id,
      targetName: company.name,
      details: `${company.isVerified ? 'Approved' : 'Revoked'} verified company badge for ${company.name}`,
      metadata: { isVerified: company.isVerified },
    });

    res.status(200).json({
      success: true,
      message: `Company ${company.isVerified ? 'verified' : 'unverified'} successfully`,
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all companies with verification and statistics for admin
// @route   GET /api/admin/companies
// @access  Private (Admin)
const getAllCompaniesAdmin = async (req, res, next) => {
  try {
    const { search, isVerified } = req.query;
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit || 25, 100);
    const query = {};

    if (isVerified !== undefined && isVerified !== 'all') {
      query.isVerified = isVerified === 'true';
    }
    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { industry: { $regex: escaped, $options: 'i' } },
        { location: { $regex: escaped, $options: 'i' } },
      ];
    }

    const total = await Company.countDocuments(query);
    const companies = await Company.find(query)
      .populate('createdBy', 'name email phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    // Enrich with job counts
    const enriched = await Promise.all(
      companies.map(async (comp) => {
        const [totalJobs, activeJobs] = await Promise.all([
          Job.countDocuments({ company: comp._id }),
          Job.countDocuments({ company: comp._id, status: 'active' }),
        ]);
        return {
          ...comp.toObject(),
          totalJobs,
          activeJobs,
        };
      })
    );

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: enriched,
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
    const { status, targetType } = req.query;
    const query = {};
    if (status && status !== 'all') {
      const STATUS_MAP = {
        pending: 'Pending',
        under_review: 'Under Review',
        'under review': 'Under Review',
        resolved: 'Resolved',
        rejected: 'Rejected',
      };
      query.status = STATUS_MAP[status.toLowerCase()] || status;
    }
    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    const reports = await Report.find(query)
      .populate('reporter', 'name email avatar')
      .populate('resolvedBy', 'name email')
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

    await recordAuditLog({
      adminId: req.user.id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: report.status === 'Resolved' ? 'REPORT_RESOLVED' : report.status === 'Rejected' ? 'REPORT_DISMISSED' : 'REPORT_ACTIONED',
      targetType: 'Report',
      targetId: report._id,
      targetName: `${report.reason} on ${report.targetType}`,
      details: `Updated report status to "${report.status}". Notes: ${adminNotes || 'None'}`,
      metadata: { reportStatus: report.status, adminNotes: report.adminNotes },
    });

    res.status(200).json({
      success: true,
      message: `Report status updated to ${report.status}`,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Execute moderation action on a report (resolve, dismiss, remove job, suspend user)
// @route   POST /api/admin/reports/:id/action
// @access  Private (Admin)
const actionReportAdmin = async (req, res, next) => {
  try {
    const { action, adminNotes } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    let actionTakenMessage = '';

    if (action === 'delete_job') {
      if (report.targetType === 'Job') {
        const job = await Job.findById(report.targetId);
        if (job) {
          const title = job.title;
          await job.deleteOne();
          actionTakenMessage = `Report resolved & Job listing "${title}" was permanently removed.`;
        } else {
          actionTakenMessage = 'Report resolved (Job listing was already removed).';
        }
      }
      report.status = 'Resolved';
    } else if (action === 'suspend_user') {
      if (report.targetType === 'User') {
        const user = await User.findById(report.targetId);
        if (user) {
          user.status = 'suspended';
          await user.save();
          actionTakenMessage = `Report resolved & User account ${user.email} was suspended.`;
        }
      }
      report.status = 'Resolved';
    } else if (action === 'resolve') {
      report.status = 'Resolved';
      actionTakenMessage = 'Report marked as resolved with action taken.';
    } else if (action === 'dismiss' || action === 'reject') {
      report.status = 'Rejected';
      actionTakenMessage = 'Report dismissed as non-violating or inaccurate.';
    } else if (action === 'under_review') {
      report.status = 'Under Review';
      actionTakenMessage = 'Report escalated for active investigation.';
    }

    if (adminNotes) {
      report.adminNotes = adminNotes;
    }
    report.resolvedBy = req.user.id;
    report.resolvedAt = new Date();
    await report.save();

    await recordAuditLog({
      adminId: req.user.id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: report.status === 'Resolved' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      targetType: 'Report',
      targetId: report._id,
      targetName: `${report.reason} on ${report.targetType}`,
      details: `${actionTakenMessage} Notes: ${adminNotes || 'None'}`,
      metadata: { reportAction: action, status: report.status },
    });

    res.status(200).json({
      success: true,
      message: actionTakenMessage || `Report status updated to ${report.status}`,
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

    await recordAuditLog({
      adminId: admin._id,
      adminName: admin.name,
      adminEmail: admin.email,
      action: 'ADMIN_PROFILE_UPDATE',
      targetType: 'User',
      targetId: admin._id,
      targetName: admin.name,
      details: `Administrator updated account profile credentials (${admin.email})`,
    });

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

    await recordAuditLog({
      adminId: admin._id,
      adminName: admin.name,
      adminEmail: admin.email,
      action: 'ADMIN_PASSWORD_UPDATE',
      targetType: 'User',
      targetId: admin._id,
      targetName: admin.name,
      details: 'Administrator successfully rotated access password',
    });

    res.status(200).json({
      success: true,
      message: 'Admin password changed successfully!',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all platform applications for admin monitoring
// @route   GET /api/admin/applications
// @access  Private (Admin)
const getAllApplicationsAdmin = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit || 25, 100);
    const query = {};

    if (status && status !== 'all') query.status = status;

    const total = await Application.countDocuments(query);
    let applications = await Application.find(query)
      .populate('job', 'title companyName location workType jobType salary status')
      .populate('candidate', 'name email phone avatar')
      .populate('recruiter', 'name email companyName')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      applications = applications.filter((app) => {
        const candName = app.candidate?.name?.toLowerCase() || '';
        const candEmail = app.candidate?.email?.toLowerCase() || '';
        const jobTitle = app.job?.title?.toLowerCase() || '';
        const compName = app.job?.companyName?.toLowerCase() || '';
        return (
          candName.includes(term) ||
          candEmail.includes(term) ||
          jobTitle.includes(term) ||
          compName.includes(term)
        );
      });
    }

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: applications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get paginated administrative audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, targetType, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit || 25, 100);
    const query = {};

    if (action && action !== 'all') query.action = action;
    if (targetType && targetType !== 'all') query.targetType = targetType;
    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { targetName: { $regex: escaped, $options: 'i' } },
        { details: { $regex: escaped, $options: 'i' } },
        { adminName: { $regex: escaped, $options: 'i' } },
      ];
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: logs,
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
};
