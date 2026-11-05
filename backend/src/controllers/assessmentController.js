const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const Achievement = require('../models/Achievement');
const Profile = require('../models/Profile');

/**
 * @desc Get available assessments
 * @route GET /api/assessments
 * @access Public/Private
 */
exports.getAssessments = async (req, res, next) => {
  try {
    const { category, difficulty } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const assessments = await Assessment.find(filter)
      .select('-questions.correctOptionIndex -questions.explanation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assessments.length,
      data: assessments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get assessment by ID for quiz session
 * @route GET /api/assessments/:id
 * @access Public/Private
 */
exports.getAssessmentById = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .select('-questions.correctOptionIndex -questions.explanation');

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Submit assessment answers and evaluate score
 * @route POST /api/assessments/:id/submit
 * @access Private
 */
exports.submitAssessment = async (req, res, next) => {
  try {
    const { answers, timeSpentSeconds } = req.body;
    // answers format: [{ questionIndex: number, selectedOptionIndex: number }]

    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    let correctCount = 0;
    const answerRecords = [];
    const skillStats = {};

    assessment.questions.forEach((q, idx) => {
      const userAns = (answers || []).find(a => a.questionIndex === idx);
      const selectedIndex = userAns !== undefined ? userAns.selectedOptionIndex : -1;
      const isCorrect = selectedIndex === q.correctOptionIndex;

      if (isCorrect) correctCount++;

      answerRecords.push({
        questionIndex: idx,
        selectedOptionIndex: selectedIndex,
        isCorrect,
        skill: q.skill || 'General'
      });

      // Track per-skill breakdown
      const sName = q.skill || 'General';
      if (!skillStats[sName]) {
        skillStats[sName] = { score: 0, total: 0 };
      }
      skillStats[sName].total++;
      if (isCorrect) skillStats[sName].score++;
    });

    const totalQuestions = assessment.questions.length || 1;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const isPassed = percentage >= (assessment.passingPercentage || 70);

    const skillBreakdown = Object.keys(skillStats).map(s => ({
      skill: s,
      score: skillStats[s].score,
      total: skillStats[s].total,
      percentage: Math.round((skillStats[s].score / skillStats[s].total) * 100)
    }));

    const attempt = await AssessmentAttempt.create({
      user: req.user._id,
      assessment: assessment._id,
      assessmentTitle: assessment.title,
      category: assessment.category,
      difficulty: assessment.difficulty,
      answers: answerRecords,
      score: correctCount,
      totalQuestions,
      percentage,
      isPassed,
      timeSpentSeconds: timeSpentSeconds || 0,
      skillBreakdown,
      completedAt: new Date()
    });

    // Check & grant achievements
    if (isPassed) {
      await Achievement.findOneAndUpdate(
        { user: req.user._id, badgeId: `pass_${assessment._id}` },
        {
          user: req.user._id,
          badgeId: `pass_${assessment._id}`,
          title: `${assessment.category} Master`,
          description: `Successfully passed ${assessment.title} with ${percentage}% score!`,
          category: 'assessment',
          icon: '🎓',
          points: 100
        },
        { upsert: true, new: true }
      ).catch(() => {});
    }

    // Award first assessment badge
    await Achievement.findOneAndUpdate(
      { user: req.user._id, badgeId: 'first_assessment' },
      {
        user: req.user._id,
        badgeId: 'first_assessment',
        title: 'Evaluation Pioneer',
        description: 'Completed your first SkillBridge skill assessment!',
        category: 'assessment',
        icon: '⚡',
        points: 50
      },
      { upsert: true, new: true }
    ).catch(() => {});

    // Return result with explanations for feedback
    const questionsWithFeedback = assessment.questions.map((q, idx) => {
      const userAns = (answers || []).find(a => a.questionIndex === idx);
      const selectedIndex = userAns !== undefined ? userAns.selectedOptionIndex : -1;
      return {
        questionText: q.questionText,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        userSelectedOptionIndex: selectedIndex,
        isCorrect: selectedIndex === q.correctOptionIndex,
        explanation: q.explanation,
        skill: q.skill
      };
    });

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        score: correctCount,
        totalQuestions,
        percentage,
        isPassed,
        skillBreakdown,
        questionsWithFeedback
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get logged in user's assessment history
 * @route GET /api/assessments/history/me
 * @access Private
 */
exports.getMyAssessmentHistory = async (req, res, next) => {
  try {
    const attempts = await AssessmentAttempt.find({ user: req.user._id })
      .sort({ completedAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (err) {
    next(err);
  }
};

