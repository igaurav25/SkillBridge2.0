const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    badgeId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['learning', 'skill', 'assessment', 'project', 'interview'],
      default: 'learning'
    },
    icon: { type: String, default: '🏆' },
    points: { type: Number, default: 50 },
    earnedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

achievementSchema.index({ user: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);

