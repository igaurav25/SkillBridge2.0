const Achievement = require('../models/Achievement');

/**
 * @desc Get user's earned badges and available achievements
 * @route GET /api/achievements/me
 * @access Private
 */
exports.getMyAchievements = async (req, res, next) => {
  try {
    const earned = await Achievement.find({ user: req.user._id }).sort({ earnedAt: -1 });

    const totalPoints = earned.reduce((sum, a) => sum + (a.points || 0), 0);

    // Master list of platform badges
    const allCatalogBadges = [
      { badgeId: 'first_login', title: 'Welcome Aboard', description: 'Joined the SkillBridge career community', category: 'learning', icon: '🚀', points: 25 },
      { badgeId: 'first_assessment', title: 'Evaluation Pioneer', description: 'Completed your first skill assessment', category: 'assessment', icon: '⚡', points: 50 },
      { badgeId: 'github_connected', title: 'Code Provenance', description: 'Analyzed public GitHub repository portfolio', category: 'project', icon: '🐙', points: 60 },
      { badgeId: 'streak_learner_5', title: 'Dedicated Scholar', description: 'Completed 5 roadmap curriculum modules', category: 'learning', icon: '📚', points: 75 },
      { badgeId: 'ats_optimized', title: 'ATS Champion', description: 'Achieved an ATS Resume Score of 80+ points', category: 'skill', icon: '📄', points: 100 },
      { badgeId: 'interview_ready', title: 'Interview Ace', description: 'Achieved 80%+ score in AI Mock Interview', category: 'interview', icon: '🎯', points: 100 },
      { badgeId: 'first_application', title: 'Go-Getter', description: 'Submitted your first job or internship application', category: 'project', icon: '💼', points: 50 }
    ];

    const earnedBadgeIds = new Set(earned.map(e => e.badgeId));
    const badgesWithStatus = allCatalogBadges.map(b => ({
      ...b,
      isEarned: earnedBadgeIds.has(b.badgeId),
      earnedAt: earned.find(e => e.badgeId === b.badgeId)?.earnedAt || null
    }));

    res.status(200).json({
      success: true,
      data: {
        totalPoints,
        earnedCount: earned.length,
        totalAvailable: allCatalogBadges.length,
        badges: badgesWithStatus
      }
    });
  } catch (err) {
    next(err);
  }
};

