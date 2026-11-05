const ProjectRecommendation = require('../models/ProjectRecommendation');
const Profile = require('../models/Profile');

/**
 * @desc Get recommended portfolio projects tailored to candidate skills or target role
 * @route GET /api/projects/recommendations
 * @access Public/Private
 */
exports.getRecommendedProjects = async (req, res, next) => {
  try {
    const { targetRole, difficulty } = req.query;
    let queryRole = targetRole;

    if (!queryRole && req.user) {
      const profile = await Profile.findOne({ user: req.user._id });
      if (profile && profile.preferredRole) {
        queryRole = profile.preferredRole;
      }
    }

    const filter = {};
    if (queryRole) {
      filter.targetRole = { $regex: new RegExp(queryRole, 'i') };
    }
    if (difficulty) {
      filter.difficulty = difficulty;
    }

    let projects = await ProjectRecommendation.find(filter).limit(10);

    // If none found for exact query, return top curated projects
    if (projects.length === 0) {
      projects = await ProjectRecommendation.find({}).limit(8);
    }

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get project details by ID
 * @route GET /api/projects/:id
 * @access Public
 */
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await ProjectRecommendation.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project recommendation not found' });
    }
    res.status(200).json({
      success: true,
      data: project
    });
  } catch (err) {
    next(err);
  }
};

