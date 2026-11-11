const User = require('../models/User');
const Profile = require('../models/Profile');
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
    const { name, headline, avatar, companyName } = req.body;
    const user = await User.findById(req.user.id);

    if (name && name.trim()) user.name = name.trim();
    if (headline !== undefined) user.headline = headline;
    if (avatar !== undefined) user.avatar = avatar;
    if (companyName !== undefined) user.companyName = companyName;

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

module.exports = {
  searchCandidates,
  getUserById,
  updateBasicUser,
};
