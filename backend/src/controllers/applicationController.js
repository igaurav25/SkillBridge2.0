const Application = require('../models/Application');
const Job = require('../models/Job');
const Profile = require('../models/Profile');
const Resume = require('../models/Resume');
const Notification = require('../models/Notification');
const { calculateJobMatch } = require('../services/aiService');

// @desc    Apply for a job
// @route   POST /api/applications/apply/:jobId
// @access  Private (Student)
const applyForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This job posting is no longer accepting applications' });
    }

    // Check existing application
    const existing = await Application.findOne({
      candidate: req.user.id,
      job: job._id,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an application for this position.',
      });
    }

    const { resumeId, resumeUrl, coverLetter } = req.body;

    // Calculate match score
    const profile = await Profile.findOne({ user: req.user.id });
    let matchDetails = { matchedSkills: [], missingSkills: [], recommendation: '' };
    let matchScore = 70;

    if (profile) {
      const matchResult = await calculateJobMatch(profile.skills, job, profile);
      matchScore = matchResult.matchScore;
      matchDetails = matchResult;
    }

    const application = await Application.create({
      job: job._id,
      candidate: req.user.id,
      recruiter: job.recruiter,
      resume: resumeId || null,
      resumeUrl: resumeUrl || profile?.resumeUrl || '',
      coverLetter: coverLetter || '',
      status: 'Applied',
      matchScore,
      matchDetails,
      timeline: [
        {
          status: 'Applied',
          note: 'Application submitted successfully via SkillBridge.',
          changedAt: new Date(),
          changedBy: req.user.id,
        },
      ],
    });

    // Increment applicantsCount on job
    job.applicantsCount = (job.applicantsCount || 0) + 1;
    await job.save();

    // Create notification for recruiter
    await Notification.create({
      recipient: job.recruiter,
      sender: req.user.id,
      type: 'system',
      title: 'New Candidate Application',
      message: `${req.user.name} applied for "${job.title}". Match Score: ${matchScore}%.`,
      link: '/recruiter/applications',
      metadata: { jobId: job._id, applicationId: application._id },
    });

    // Create notification for candidate
    await Notification.create({
      recipient: req.user.id,
      type: 'application_status',
      title: 'Application Submitted',
      message: `Your application for "${job.title}" at ${job.companyName} was received.`,
      link: '/applications',
      metadata: { jobId: job._id, applicationId: application._id },
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get candidate's submitted applications
// @route   GET /api/applications/my
// @access  Private (Student)
const getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ candidate: req.user.id })
      .populate('job', 'title companyName companyLogo location workType jobType salary deadline status')
      .populate('recruiter', 'name email')
      .sort('-createdAt');

    // Calculate status breakdown
    const stats = {
      total: applications.length,
      applied: 0,
      underReview: 0,
      shortlisted: 0,
      interview: 0,
      selected: 0,
      rejected: 0,
      withdrawn: 0,
    };

    applications.forEach((app) => {
      switch (app.status) {
        case 'Applied': stats.applied++; break;
        case 'Under Review': stats.underReview++; break;
        case 'Shortlisted': stats.shortlisted++; break;
        case 'Interview': stats.interview++; break;
        case 'Selected': stats.selected++; break;
        case 'Rejected': stats.rejected++; break;
        case 'Withdrawn': stats.withdrawn++; break;
      }
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      stats,
      data: applications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single application details
// @route   GET /api/applications/:id
// @access  Private
const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job')
      .populate('candidate', 'name email avatar headline')
      .populate('recruiter', 'name email avatar')
      .populate('resume');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Access check: owner candidate, assigned recruiter, or admin (with null safety)
    const candidateId = application.candidate?._id ? application.candidate._id.toString() : application.candidate?.toString();
    const recruiterId = application.recruiter?._id ? application.recruiter._id.toString() : application.recruiter?.toString();
    const isCandidate = candidateId === req.user.id;
    const isRecruiter = recruiterId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isCandidate && !isRecruiter && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this application' });
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Withdraw application
// @route   PUT /api/applications/:id/withdraw
// @access  Private (Student)
const withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id).populate('job', 'title companyName');
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    if (application.candidate.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    application.status = 'Withdrawn';
    application.timeline.push({
      status: 'Withdrawn',
      note: req.body.reason || 'Candidate withdrew application.',
      changedAt: new Date(),
      changedBy: req.user.id,
    });

    await application.save();

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully.',
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all applications received by recruiter
// @route   GET /api/applications/recruiter/all
// @access  Private (Recruiter / Admin)
const getRecruiterApplications = async (req, res, next) => {
  try {
    const { status, jobId } = req.query;
    const query = req.user.role === 'admin' ? {} : { recruiter: req.user.id };

    if (status && status !== 'all') query.status = status;
    if (jobId && jobId !== 'all') query.job = jobId;

    const applications = await Application.find(query)
      .populate('job', 'title location workType jobType')
      .populate('candidate', 'name email avatar headline')
      .populate('resume')
      .sort('-createdAt');

    // Metrics for recruiter dashboard
    const stats = {
      total: applications.length,
      underReview: applications.filter((a) => a.status === 'Under Review').length,
      shortlisted: applications.filter((a) => a.status === 'Shortlisted').length,
      interview: applications.filter((a) => a.status === 'Interview').length,
      hired: applications.filter((a) => a.status === 'Selected').length,
    };

    res.status(200).json({
      success: true,
      count: applications.length,
      stats,
      data: applications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update application status (Shortlist, Interview, Reject, Select)
// @route   PUT /api/applications/:id/status
// @access  Private (Recruiter / Admin)
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, note, recruiterNotes, interviewDetails } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('job', 'title companyName')
      .populate('candidate', 'name email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.recruiter.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this application' });
    }

    const APP_STATUS_MAP = {
      applied: 'Applied',
      under_review: 'Under Review',
      'under review': 'Under Review',
      shortlisted: 'Shortlisted',
      interview: 'Interview',
      selected: 'Selected',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    };

    let normalizedStatus = application.status;
    if (status) {
      normalizedStatus = APP_STATUS_MAP[String(status).trim().toLowerCase()];
      if (!normalizedStatus) {
        return res.status(400).json({
          success: false,
          message: `Invalid application status "${status}". Allowed: Applied, Under Review, Shortlisted, Interview, Selected, Rejected, Withdrawn.`,
        });
      }
      application.status = normalizedStatus;
    }
    if (recruiterNotes !== undefined) application.recruiterNotes = recruiterNotes;
    if (interviewDetails) {
      application.interviewDetails = {
        ...application.interviewDetails,
        ...interviewDetails,
      };
    }

    application.timeline.push({
      status: normalizedStatus,
      note: note || `Status updated to ${normalizedStatus}.`,
      changedAt: new Date(),
      changedBy: req.user.id,
    });

    await application.save();

    // Notify candidate if user still exists
    if (application.candidate?._id) {
      await Notification.create({
        recipient: application.candidate._id,
        sender: req.user.id,
        type: normalizedStatus === 'Interview' ? 'interview' : 'application_status',
        title: `Application Status: ${normalizedStatus}`,
        message: `Your application for "${application.job?.title || 'Role'}" at ${application.job?.companyName || 'Company'} has moved to "${normalizedStatus}".`,
        link: '/applications',
        metadata: { jobId: application.job?._id, applicationId: application._id },
      });
    }

    res.status(200).json({
      success: true,
      message: `Application status updated to ${normalizedStatus}`,
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getApplicationById,
  withdrawApplication,
  getRecruiterApplications,
  updateApplicationStatus,
};
