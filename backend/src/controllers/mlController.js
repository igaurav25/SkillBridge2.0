const mlService = require('../services/mlService');
const Profile = require('../models/Profile');
const CareerPrediction = require('../models/CareerPrediction');

/**
 * @desc Recommend career options based on ML model
 * @route POST /api/ml/career/recommend
 * @access Private/Public
 */
exports.recommendCareer = async (req, res, next) => {
  try {
    let { skills, education, yearsExperience, projectsCount, assessmentScore, preferredDomain } = req.body;

    // If logged in student and body is empty or partial, enrich from their real profile
    if (req.user && (!skills || skills.length === 0)) {
      const profile = await Profile.findOne({ user: req.user._id });
      if (profile) {
        skills = profile.skills.map(s => s.name);
        education = profile.education?.[0]?.degree || education;
        projectsCount = profile.projects?.length || projectsCount;
        preferredDomain = profile.preferredRole || preferredDomain;
      }
    }

    const result = await mlService.recommendCareers({
      skills: skills || [],
      education,
      yearsExperience,
      projectsCount,
      assessmentScore,
      preferredDomain
    });

    // Save prediction history if user is authenticated
    if (req.user && result.top_recommendations?.[0]) {
      const top = result.top_recommendations[0];
      await CareerPrediction.create({
        user: req.user._id,
        predictedRole: top.career_role,
        suitabilityScore: top.suitability_score,
        matchedSkills: top.required_skills?.filter(s => (skills || []).includes(s)) || [],
        missingSkills: top.missing_skills || [],
        suggestedNextSteps: top.suggested_next_steps || [],
        modelVersion: result.model_version || '2.0.0'
      }).catch(err => console.error('Failed to save prediction record:', err.message));
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Predict student career readiness
 * @route POST /api/ml/career/readiness
 * @access Private/Public
 */
exports.predictReadiness = async (req, res, next) => {
  try {
    let {
      technicalSkills,
      projectsCount,
      resumeScore,
      interviewScore,
      assessmentScore,
      problemSolvingScore,
      communicationScore,
      yearsExperience,
      targetRole
    } = req.body;

    // Enrich from student profile if logged in
    if (req.user && (!technicalSkills || technicalSkills.length === 0)) {
      const profile = await Profile.findOne({ user: req.user._id });
      if (profile) {
        technicalSkills = profile.skills.map(s => s.name);
        projectsCount = profile.projects?.length || 0;
        resumeScore = profile.resumeScore || 0;
        targetRole = profile.preferredRole || targetRole;
      }
    }

    const result = await mlService.predictCareerReadiness({
      technicalSkills,
      projectsCount,
      resumeScore,
      interviewScore,
      assessmentScore,
      problemSolvingScore,
      communicationScore,
      yearsExperience,
      targetRole
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Recommend matching jobs using KNN + TF-IDF
 * @route POST /api/ml/jobs/recommend
 * @access Public
 */
exports.recommendJobs = async (req, res, next) => {
  try {
    const { studentSkills, targetRole, preferredJobType, topK } = req.body;
    const result = await mlService.recommendJobs({
      studentSkills,
      targetRole,
      preferredJobType,
      topK
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Analyze skill gap against target role
 * @route POST /api/ml/skills/gap-analysis
 * @access Public
 */
exports.analyzeSkillGap = async (req, res, next) => {
  try {
    const { currentSkills, targetRole } = req.body;
    const result = await mlService.analyzeSkillGap({ currentSkills, targetRole });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Match resume content with job/role
 * @route POST /api/ml/resume/match
 * @access Public
 */
exports.matchResume = async (req, res, next) => {
  try {
    const { resumeText, jobDescription, targetRole } = req.body;
    const result = await mlService.matchResume({ resumeText, jobDescription, targetRole });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Cluster student profile using K-Means
 * @route POST /api/ml/students/cluster
 * @access Public
 */
exports.clusterStudent = async (req, res, next) => {
  try {
    const { skills, experienceYears, assessmentScore } = req.body;
    const result = await mlService.clusterStudent({ skills, experienceYears, assessmentScore });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get ML models status & evaluation metrics
 * @route GET /api/ml/models/status
 * @access Public
 */
exports.getModelStatus = async (req, res, next) => {
  try {
    const status = await mlService.getModelsStatus();
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get user's career prediction history
 * @route GET /api/ml/predictions/history
 * @access Private
 */
exports.getPredictionHistory = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const history = await CareerPrediction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (err) {
    next(err);
  }
};

