const mongoose = require('mongoose');

const careerPredictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    predictedRole: { type: String, required: true },
    suitabilityScore: { type: Number, required: true },
    readinessScore: { type: Number, default: 0 },
    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    suggestedNextSteps: [{ type: String }],
    modelVersion: { type: String, default: '2.0.0' },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

careerPredictionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CareerPrediction', careerPredictionSchema);

