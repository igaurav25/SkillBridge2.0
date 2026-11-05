const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  explanation: { type: String, default: '' },
  skill: { type: String, default: 'General' },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' }
});

const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Programming',
        'Web Development',
        'Database Management',
        'Data Structures',
        'Computer Science Fundamentals',
        'Problem Solving',
        'Communication Skills'
      ]
    },
    description: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate'
    },
    durationMinutes: { type: Number, default: 15 },
    totalQuestions: { type: Number, default: 10 },
    passingPercentage: { type: Number, default: 70 },
    questions: [questionSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

assessmentSchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);

