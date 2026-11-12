const User = require('../models/User');
const Profile = require('../models/Profile');
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const SavedJob = require('../models/SavedJob');
const MockInterviewSession = require('../models/MockInterviewSession');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const LearningProgress = require('../models/LearningProgress');
const Notification = require('../models/Notification');
const CareerPrediction = require('../models/CareerPrediction');
const { escapeRegex, parsePagination } = require('../utils/securityHelpers');

// @desc    Search candidates for recruiters
// @route   GET /api/users/candidates
// @access  Private (Recruiter / Admin)
const searchCandidates = async (req, res, next) => {
  try {
    const { name, skill, role, location } = req.query;
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit || 12, 50);

    const query = { role: 'student', status: 'active' };

    if (name && name.trim()) {
      query.name = { $regex: escapeRegex(name.trim()), $options: 'i' };
    }

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = users.map((u) => u._id);

    const profileFilter = { user: { $in: userIds } };
    if (skill && skill.trim()) {
      profileFilter['skills.name'] = { $regex: escapeRegex(skill.trim()), $options: 'i' };
    }
    if (role && role.trim()) {
      profileFilter.preferredRole = { $regex: escapeRegex(role.trim()), $options: 'i' };
    }
    if (location && location.trim()) {
      profileFilter.location = { $regex: escapeRegex(location.trim()), $options: 'i' };
    }

    const profiles = await Profile.find(profileFilter).lean();
    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(p.user.toString(), p));

    const candidates = users
      .filter((u) => profileMap.has(u._id.toString()))
      .map((u) => ({
        ...u,
        profile: profileMap.get(u._id.toString()),
      }));

    res.status(200).json({
      success: true,
      page,
      count: candidates.length,
      data: candidates,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user by id (Owner, Recruiter, or Admin only)
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const isSelf = req.user.id === req.params.id;
    const isPrivileged = req.user.role === 'recruiter' || req.user.role === 'admin';
    if (!isSelf && !isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to inspect another user account.',
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const profile = await Profile.findOne({ user: user._id });

    res.status(200).json({
      success: true,
      data: {
        user,
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update basic user details
// @route   PUT /api/users/me
// @access  Private
const updateBasicUser = async (req, res, next) => {
  try {
    const { name, headline, avatar, companyName, phone } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name && name.trim()) user.name = name.trim();
    if (headline !== undefined) user.headline = headline;
    if (avatar !== undefined) user.avatar = avatar;
    if (companyName !== undefined) user.companyName = companyName;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account details updated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Change authenticated user password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update theme, 3D mode, and notification preferences
// @route   PUT /api/users/preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { notificationPreferences, themePreference, preferred3DMode } = req.body;

    if (notificationPreferences && typeof notificationPreferences === 'object') {
      const current = user.notificationPreferences || {};
      user.notificationPreferences = {
        jobAlerts: typeof notificationPreferences.jobAlerts === 'boolean' ? notificationPreferences.jobAlerts : (current.jobAlerts ?? true),
        interviewReminders: typeof notificationPreferences.interviewReminders === 'boolean' ? notificationPreferences.interviewReminders : (current.interviewReminders ?? true),
        applicationUpdates: typeof notificationPreferences.applicationUpdates === 'boolean' ? notificationPreferences.applicationUpdates : (current.applicationUpdates ?? true),
        weeklyDigest: typeof notificationPreferences.weeklyDigest === 'boolean' ? notificationPreferences.weeklyDigest : (current.weeklyDigest ?? false),
      };
    }

    if (['dark', 'light', 'system'].includes(themePreference)) {
      user.themePreference = themePreference;
    }

    if (['auto', 'force-3d', 'force-2d'].includes(preferred3DMode)) {
      user.preferred3DMode = preferred3DMode;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export all personal data for the logged-in user (JSON portability)
// @route   GET /api/users/export-data
// @access  Private
const exportMyData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [
      user,
      profile,
      resumes,
      applications,
      savedJobs,
      mockInterviews,
      assessments,
      learningProgress,
      notifications,
      careerPredictions,
    ] = await Promise.all([
      User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire -verificationToken').lean(),
      Profile.findOne({ user: userId }).lean(),
      Resume.find({ user: userId }).lean(),
      Application.find({ candidate: userId }).lean(),
      SavedJob.find({ user: userId }).lean(),
      MockInterviewSession.find({ user: userId }).lean(),
      AssessmentAttempt.find({ user: userId }).lean(),
      LearningProgress.find({ user: userId }).lean(),
      Notification.find({ user: userId }).lean(),
      CareerPrediction.find({ user: userId }).lean(),
    ]);

    res.status(200).json({
      success: true,
      exportedAt: new Date().toISOString(),
      data: {
        account: user,
        profile,
        resumes,
        applications,
        savedJobs,
        mockInterviews,
        assessmentAttempts: assessments,
        learningProgress,
        notifications,
        careerPredictions,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Permanently delete user account & owned records
// @route   DELETE /api/users/me
// @access  Private
const deleteMyAccount = async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your current password to confirm account deletion.',
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Account deletion cancelled.',
      });
    }

    const userId = user._id;
    await Promise.all([
      Profile.deleteMany({ user: userId }),
      Resume.deleteMany({ user: userId }),
      Application.deleteMany({ candidate: userId }),
      SavedJob.deleteMany({ user: userId }),
      MockInterviewSession.deleteMany({ user: userId }),
      AssessmentAttempt.deleteMany({ user: userId }),
      LearningProgress.deleteMany({ user: userId }),
      Notification.deleteMany({ user: userId }),
      CareerPrediction.deleteMany({ user: userId }),
    ]);

    await User.deleteOne({ _id: userId });

    res.status(200).json({
      success: true,
      message: 'Your account and associated records have been permanently deleted.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  searchCandidates,
  getUserById,
  updateBasicUser,
  updatePassword,
  updatePreferences,
  exportMyData,
  deleteMyAccount,
};
