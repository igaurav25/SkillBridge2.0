const mongoose = require('mongoose');

const projectRecommendationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    targetRole: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate'
    },
    description: { type: String, required: true },
    requiredTechnologies: [{ type: String }],
    features: [{ type: String }],
    expectedOutcome: { type: String, default: '' },
    learningBenefits: { type: String, default: '' },
    estimatedDuration: { type: String, default: '2-3 weeks' },
    architectureHighlights: [{ type: String }]
  },
  { timestamps: true }
);

projectRecommendationSchema.index({ targetRole: 1, difficulty: 1 });

module.exports = mongoose.model('ProjectRecommendation', projectRecommendationSchema);

