const mongoose = require('mongoose');

const interviewScheduleSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Technical Interview',
    },
    round: {
      type: String,
      enum: ['Screening', 'Technical', 'System Design', 'Managerial', 'HR / Culture Fit', 'Final'],
      default: 'Technical',
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 45, // minutes
      min: 15,
      max: 240,
    },
    mode: {
      type: String,
      enum: ['Google Meet', 'Zoom', 'Microsoft Teams', 'In-Person', 'Phone'],
      default: 'Google Meet',
    },
    meetingLink: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'],
      default: 'Scheduled',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      recommendation: { type: String, enum: ['Strong Yes', 'Yes', 'Neutral', 'No', 'Strong No'] },
      strengths: { type: String, default: '' },
      areasToImprove: { type: String, default: '' },
      notes: { type: String, default: '' },
      submittedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

interviewScheduleSchema.index({ recruiter: 1, scheduledAt: 1 });
interviewScheduleSchema.index({ candidate: 1, scheduledAt: 1 });
interviewScheduleSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('InterviewSchedule', interviewScheduleSchema);
