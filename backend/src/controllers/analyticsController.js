const Profile = require('../models/Profile');
const Application = require('../models/Application');
const MockInterviewSession = require('../models/MockInterviewSession');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const CareerPrediction = require('../models/CareerPrediction');
const LearningProgress = require('../models/LearningProgress');

/**
 * @desc Get comprehensive student career analytics
 * @route GET /api/analytics/career
 * @access Private
 */
exports.getStudentCareerAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Fetch Profile
    const profile = await Profile.findOne({ user: userId });

    // 2. Fetch Applications Breakdown
    const applications = await Application.find({ candidate: userId });
    const appStats = {
      total: applications.length,
      applied: applications.filter(a => a.status === 'Applied').length,
      underReview: applications.filter(a => a.status === 'Under Review').length,
      shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
      interview: applications.filter(a => a.status === 'Interview').length,
      selected: applications.filter(a => a.status === 'Selected').length,
      rejected: applications.filter(a => a.status === 'Rejected').length
    };

    // 3. Mock Interview Score Trends
    const interviews = await MockInterviewSession.find({ user: userId })
      .sort({ createdAt: 1 })
      .limit(10);
    const interviewTrends = interviews.map(i => ({
      date: i.createdAt,
      targetRole: i.targetRole,
      category: i.category,
      score: i.totalScore || 0
    }));

    // 4. Assessment Attempts Trends
    const assessmentAttempts = await AssessmentAttempt.find({ user: userId })
      .sort({ completedAt: 1 })
      .limit(10);
    const assessmentTrends = assessmentAttempts.map(a => ({
      date: a.completedAt,
      title: a.assessmentTitle,
      category: a.category,
      percentage: a.percentage
    }));

    // 5. Career Predictions History
    const predictions = await CareerPrediction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // 6. Learning Progress across roles
    const learningProgressList = await LearningProgress.find({ user: userId });
    const totalHoursLearned = learningProgressList.reduce((sum, p) => sum + (p.totalHoursSpent || 0), 0);
    const maxStreak = learningProgressList.length > 0
      ? Math.max(...learningProgressList.map((p) => p.currentStreak || 0), 0)
      : 0;

    // 7. Skill Development Distribution
    const skills = profile?.skills || [];
    const skillCategories = {};
    skills.forEach(s => {
      const cat = s.category || 'Other';
      skillCategories[cat] = (skillCategories[cat] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        profileStrength: profile?.profileCompletion || 0,
        resumeScore: profile?.resumeScore || 0,
        atsBreakdown: profile?.atsBreakdown || {},
        applicationStats: appStats,
        interviewScoreTrends: interviewTrends,
        assessmentTrends: assessmentTrends,
        careerPredictionHistory: predictions,
        learningMetrics: {
          totalHours: totalHoursLearned,
          currentStreak: maxStreak,
          activeRoadmaps: learningProgressList.length
        },
        skillDistribution: Object.keys(skillCategories).map(cat => ({
          category: cat,
          count: skillCategories[cat]
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

