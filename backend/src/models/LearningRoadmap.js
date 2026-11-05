const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, default: '#' },
  type: { type: String, enum: ['documentation', 'video', 'course', 'article', 'practice'], default: 'documentation' }
});

const topicSchema = new mongoose.Schema({
  topicId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  estimatedHours: { type: Number, default: 8 },
  resources: [resourceSchema],
  milestoneBadge: { type: String, default: '' }
});

const levelSchema = new mongoose.Schema({
  levelName: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  description: { type: String, default: '' },
  topics: [topicSchema],
  projectMilestone: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    skills: [{ type: String }]
  }
});

const learningRoadmapSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, unique: true, trim: true },
    domain: { type: String, required: true },
    description: { type: String, default: '' },
    levels: [levelSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

learningRoadmapSchema.index({ domain: 1 });

module.exports = mongoose.model('LearningRoadmap', learningRoadmapSchema);
