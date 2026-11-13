const mongoose = require('mongoose');
const Report = require('../models/Report');
const Job = require('../models/Job');
const { parsePagination } = require('../utils/securityHelpers');

// @desc    Create a content report
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, targetTitle, reason, description } = req.body;

    if (!targetType || !targetId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide targetType, targetId, reason, and a clear description.',
      });
    }

    const report = await Report.create({
      reporter: req.user.id,
      targetType,
      targetId,
      targetTitle: targetTitle || '',
      reason,
      description,
      status: 'Pending',
    });

    // If reporting a job, flag it in DB if it is a persistent database job
    if (targetType === 'Job' && mongoose.Types.ObjectId.isValid(targetId)) {
      await Job.findByIdAndUpdate(targetId, {
        isReported: true,
        $inc: { reportedCount: 1 },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our safety team will review it.',
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's submitted reports
// @route   GET /api/reports/my
// @access  Private
const getMyReports = async (req, res, next) => {
  try {
    const total = await Report.countDocuments({ reporter: req.user.id });
    let reportsQuery = Report.find({ reporter: req.user.id }).sort('-createdAt').lean();

    if (req.query.page !== undefined) {
      const { page, limit, skip } = parsePagination(req.query.page, req.query.limit || 20, 100);
      const reports = await reportsQuery.skip(skip).limit(limit);
      return res.status(200).json({
        success: true,
        count: reports.length,
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        data: reports,
      });
    }

    const reports = await reportsQuery;
    res.status(200).json({ success: true, count: reports.length, total, data: reports });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReport,
  getMyReports,
};
