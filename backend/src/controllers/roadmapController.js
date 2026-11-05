const LearningRoadmap = require('../models/LearningRoadmap');
const LearningProgress = require('../models/LearningProgress');
const Achievement = require('../models/Achievement');

/**
 * @desc Get all active roadmaps
 * @route GET /api/roadmaps
 * @access Public
 */
exports.getAllRoadmaps = async (req, res, next) => {
  try {
    const roadmaps = await LearningRoadmap.find({ isActive: true }).select('role domain description levels.levelName');
    res.status(200).json({
      success: true,
      count: roadmaps.length,
      data: roadmaps
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get roadmap details by career role
 * @route GET /api/roadmaps/:role
 * @access Public
 */
exports.getRoadmapByRole = async (req, res, next) => {
  try {
    const roleName = decodeURIComponent(req.params.role);
    const roadmap = await LearningRoadmap.findOne({
      role: { $regex: new RegExp(`^${roleName}$`, 'i') },
      isActive: true
    });

    if (!roadmap) {
      return res.status(404).json({ success: false, message: `Roadmap for ${roleName} not found` });
    }

    res.status(200).json({
      success: true,
      data: roadmap
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get user's learning progress for a role
 * @route GET /api/roadmaps/progress/:role
 * @access Private
 */
exports.getMyRoadmapProgress = async (req, res, next) => {
  try {
    const roleName = decodeURIComponent(req.params.role);
    let progress = await LearningProgress.findOne({
      user: req.user._id,
      role: { $regex: new RegExp(`^${roleName}$`, 'i') }
    });

    if (!progress) {
      progress = await LearningProgress.create({
        user: req.user._id,
        role: roleName,
        completedTopics: [],
        currentStreak: 1,
        totalHoursSpent: 0
      });
    }

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Toggle topic completion state
 * @route POST /api/roadmaps/progress/toggle-topic
 * @access Private
 */
exports.toggleTopicCompletion = async (req, res, next) => {
  try {
    const { role, topicId, hoursSpent = 2 } = req.body;
    if (!role || !topicId) {
      return res.status(400).json({ success: false, message: 'Role and topicId are required' });
    }

    let progress = await LearningProgress.findOne({
      user: req.user._id,
      role: { $regex: new RegExp(`^${role}$`, 'i') }
    });

    if (!progress) {
      progress = new LearningProgress({
        user: req.user._id,
        role,
        completedTopics: [],
        currentStreak: 1,
        totalHoursSpent: 0
      });
    }

    const topicIndex = progress.completedTopics.indexOf(topicId);
    let isCompletedNow = false;

    if (topicIndex > -1) {
      progress.completedTopics.splice(topicIndex, 1);
    } else {
      progress.completedTopics.push(topicId);
      progress.totalHoursSpent += Number(hoursSpent);
      isCompletedNow = true;

      // Update streaks
      const now = new Date();
      const last = progress.lastActiveDate ? new Date(progress.lastActiveDate) : null;
      if (last) {
        const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) progress.currentStreak += 1;
        else if (diffDays > 1) progress.currentStreak = 1;
      }
      progress.lastActiveDate = now;
    }

    // Recalculate roadmap completion percentage
    const roadmap = await LearningRoadmap.findOne({ role: { $regex: new RegExp(`^${role}$`, 'i') } });
    if (roadmap) {
      const allTopicIds = [];
      roadmap.levels.forEach(lvl => lvl.topics.forEach(t => allTopicIds.push(t.topicId)));
      const completedCount = allTopicIds.filter(id => progress.completedTopics.includes(id)).length;
      progress.roadmapCompletionPct = Math.round((completedCount / (allTopicIds.length || 1)) * 100);
    }

    await progress.save();

    // Check achievement for milestone completion
    if (progress.completedTopics.length >= 5) {
      await Achievement.findOneAndUpdate(
        { user: req.user._id, badgeId: 'streak_learner_5' },
        {
          user: req.user._id,
          badgeId: 'streak_learner_5',
          title: 'Dedicated Scholar',
          description: 'Completed 5 roadmap curriculum modules!',
          category: 'learning',
          icon: '📚',
          points: 75
        },
        { upsert: true, new: true }
      ).catch(() => {});
    }

    res.status(200).json({
      success: true,
      isCompleted: isCompletedNow,
      data: progress
    });
  } catch (err) {
    next(err);
  }
};

