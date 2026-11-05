const mongoose = require('mongoose');

const learningProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: { type: String, required: true },
    completedTopics: [{ type: String }],
    currentStreak: { type: Number, default: 1 },
    lastActiveDate: { type: Date, default: Date.now },
    totalHoursSpent: { type: Number, default: 0 },
    weeklyProgress: [
      {
        weekStart: { type: Date },
        hours: { type: Number, default: 0 },
        topicsCompleted: { type: Number, default: 0 }
      }
    ],
    completedProjects: [{ type: String }],
    roadmapCompletionPct: { type: Number, default: 0, min: 0, max: 100 }
  },
  { timestamps: true }
);

learningProgressSchema.index({ user: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('LearningProgress', learningProgressSchema);

