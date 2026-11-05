const mongoose = require('mongoose');

const answerRecordSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  selectedOptionIndex: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  skill: { type: String, default: 'General' }
});

const skillScoreSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 }
});

const assessmentAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true
    },
    assessmentTitle: { type: String, default: '' },
    category: { type: String, default: '' },
    difficulty: { type: String, default: 'Intermediate' },
    answers: [answerRecordSchema],
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    isPassed: { type: Boolean, default: false },
    timeSpentSeconds: { type: Number, default: 0 },
    skillBreakdown: [skillScoreSchema],
    completedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

assessmentAttemptSchema.index({ user: 1, completedAt: -1 });
assessmentAttemptSchema.index({ assessment: 1 });

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);

