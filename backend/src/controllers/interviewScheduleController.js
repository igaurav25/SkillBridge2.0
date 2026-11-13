const InterviewSchedule = require('../models/InterviewSchedule');
const Application = require('../models/Application');
const Notification = require('../models/Notification');

// @desc    Schedule a new candidate interview
// @route   POST /api/interviews/schedules
// @access  Private (Recruiter / Admin)
const scheduleInterview = async (req, res, next) => {
  try {
    const {
      applicationId,
      title,
      scheduledAt,
      duration,
      round,
      mode,
      meetingLink,
      notes,
    } = req.body;

    if (!applicationId || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'Application ID and scheduled date/time are required.' });
    }

    const application = await Application.findById(applicationId)
      .populate('job', 'title companyName')
      .populate('candidate', 'name email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (application.recruiter.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to schedule interview for this application.' });
    }

    const schedule = await InterviewSchedule.create({
      application: application._id,
      job: application.job._id,
      candidate: application.candidate._id,
      recruiter: req.user.id,
      title: title || `${round || 'Technical'} Interview: ${application.job?.title || 'Role'}`,
      round: round || 'Technical',
      scheduledAt: new Date(scheduledAt),
      duration: Number(duration) || 45,
      mode: mode || 'Google Meet',
      meetingLink: meetingLink || '',
      notes: notes || '',
      status: 'Scheduled',
    });

    // Update application stage & interviewDetails
    application.status = 'Interview';
    application.interviewDetails = {
      scheduledDate: new Date(scheduledAt),
      mode: mode || 'Google Meet',
      link: meetingLink || '',
      notes: notes || '',
    };
    application.timeline.push({
      status: 'Interview',
      note: `Interview scheduled for ${new Date(scheduledAt).toLocaleString()} (${mode || 'Google Meet'}).`,
      changedAt: new Date(),
      changedBy: req.user.id,
    });
    await application.save();

    // Notify candidate
    await Notification.create({
      recipient: application.candidate._id,
      sender: req.user.id,
      type: 'interview',
      title: `Interview Scheduled: ${application.job?.title || 'Position'}`,
      message: `Your interview for ${application.job?.title || 'Position'} with ${application.job?.companyName || 'Recruiter'} has been scheduled for ${new Date(scheduledAt).toLocaleDateString()} at ${new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${mode || 'Google Meet'}).`,
      link: '/applications',
      metadata: { interviewId: schedule._id, applicationId: application._id },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Interview successfully scheduled!',
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get scheduled interviews (Recruiter or Candidate)
// @route   GET /api/interviews/schedules
// @access  Private
const getInterviews = async (req, res, next) => {
  try {
    const { status, month, year, jobId } = req.query;

    const query = {};
    if (req.user.role === 'recruiter') {
      query.recruiter = req.user.id;
    } else if (req.user.role === 'student') {
      query.candidate = req.user.id;
    } // admin sees all

    if (status && status !== 'all') {
      query.status = status;
    }

    if (jobId && jobId !== 'all') {
      query.job = jobId;
    }

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      query.scheduledAt = { $gte: start, $lte: end };
    }

    const interviews = await InterviewSchedule.find(query)
      .populate('job', 'title companyName location workType')
      .populate('candidate', 'name email avatar headline')
      .populate('recruiter', 'name email companyName')
      .populate({
        path: 'application',
        select: 'status matchScore tags recruiterNotes',
      })
      .sort('scheduledAt');

    res.status(200).json({
      success: true,
      count: interviews.length,
      data: interviews,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reschedule interview
// @route   PATCH /api/interviews/schedules/:id/reschedule
// @access  Private (Recruiter / Admin)
const rescheduleInterview = async (req, res, next) => {
  try {
    const { scheduledAt, duration, meetingLink, notes } = req.body;

    const interview = await InterviewSchedule.findById(req.params.id)
      .populate('job', 'title companyName')
      .populate('candidate', 'name email');

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview schedule not found.' });
    }

    if (interview.recruiter.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to reschedule this interview.' });
    }

    if (scheduledAt) interview.scheduledAt = new Date(scheduledAt);
    if (duration) interview.duration = Number(duration);
    if (meetingLink !== undefined) interview.meetingLink = meetingLink;
    if (notes !== undefined) interview.notes = notes;
    interview.status = 'Rescheduled';

    await interview.save();

    // Update Application details
    const application = await Application.findById(interview.application);
    if (application) {
      application.interviewDetails.scheduledDate = interview.scheduledAt;
      if (meetingLink) application.interviewDetails.link = meetingLink;
      application.timeline.push({
        status: 'Interview',
        note: `Interview rescheduled to ${interview.scheduledAt.toLocaleString()}.`,
        changedAt: new Date(),
        changedBy: req.user.id,
      });
      await application.save();
    }

    // Notify candidate
    await Notification.create({
      recipient: interview.candidate._id,
      sender: req.user.id,
      type: 'interview',
      title: 'Interview Rescheduled',
      message: `Your interview for ${interview.job?.title || 'Position'} has been rescheduled to ${interview.scheduledAt.toLocaleDateString()} at ${interview.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      link: '/applications',
      metadata: { interviewId: interview._id },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Interview rescheduled successfully.',
      data: interview,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel interview
// @route   PATCH /api/interviews/schedules/:id/cancel
// @access  Private (Recruiter / Admin)
const cancelInterview = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const interview = await InterviewSchedule.findById(req.params.id)
      .populate('job', 'title')
      .populate('candidate', 'name email');

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview schedule not found.' });
    }

    if (interview.recruiter.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this interview.' });
    }

    interview.status = 'Cancelled';
    if (reason) interview.notes = `${interview.notes ? interview.notes + '\n' : ''}[Cancelled reason]: ${reason}`;
    await interview.save();

    // Update Application timeline
    const application = await Application.findById(interview.application);
    if (application) {
      application.timeline.push({
        status: application.status,
        note: `Interview on ${interview.scheduledAt.toLocaleDateString()} cancelled: ${reason || 'No reason specified'}.`,
        changedAt: new Date(),
        changedBy: req.user.id,
      });
      await application.save();
    }

    // Notify candidate
    await Notification.create({
      recipient: interview.candidate._id,
      sender: req.user.id,
      type: 'interview',
      title: 'Interview Cancelled',
      message: `The interview for ${interview.job?.title || 'Position'} scheduled on ${interview.scheduledAt.toLocaleDateString()} has been cancelled. ${reason ? 'Reason: ' + reason : ''}`,
      link: '/applications',
      metadata: { interviewId: interview._id },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Interview cancelled.',
      data: interview,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit candidate interview feedback
// @route   POST /api/interviews/schedules/:id/feedback
// @access  Private (Recruiter / Admin)
const submitFeedback = async (req, res, next) => {
  try {
    const { rating, recommendation, strengths, areasToImprove, notes } = req.body;

    const interview = await InterviewSchedule.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview schedule not found.' });
    }

    if (interview.recruiter.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to record feedback.' });
    }

    interview.feedback = {
      rating: Number(rating) || 3,
      recommendation: recommendation || 'Neutral',
      strengths: strengths || '',
      areasToImprove: areasToImprove || '',
      notes: notes || '',
      submittedAt: new Date(),
    };
    interview.status = 'Completed';
    await interview.save();

    res.status(200).json({
      success: true,
      message: 'Interview feedback recorded successfully.',
      data: interview,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get upcoming interview reminders (next 48h)
// @route   GET /api/interviews/schedules/upcoming-reminders
// @access  Private
const getUpcomingReminders = async (req, res, next) => {
  try {
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 3600 * 1000);

    const query = {
      status: 'Scheduled',
      scheduledAt: { $gte: now, $lte: in48Hours },
    };

    if (req.user.role === 'recruiter') {
      query.recruiter = req.user.id;
    } else if (req.user.role === 'student') {
      query.candidate = req.user.id;
    }

    const upcoming = await InterviewSchedule.find(query)
      .populate('job', 'title companyName location workType')
      .populate('candidate', 'name email avatar headline')
      .populate('recruiter', 'name email companyName')
      .sort('scheduledAt')
      .lean();

    const reminders = upcoming.map((inv) => {
      const diffMs = new Date(inv.scheduledAt) - now;
      const diffHours = Math.round(diffMs / (3600 * 1000));
      return {
        ...inv,
        hoursRemaining: Math.max(1, diffHours),
        urgency: diffHours <= 6 ? 'high' : diffHours <= 24 ? 'medium' : 'normal',
      };
    });

    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  scheduleInterview,
  getInterviews,
  rescheduleInterview,
  cancelInterview,
  submitFeedback,
  getUpcomingReminders,
};
