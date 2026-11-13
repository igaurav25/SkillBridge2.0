const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminName: {
      type: String,
      default: 'Administrator',
    },
    adminEmail: {
      type: String,
      default: '',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_STATUS_CHANGE',
        'USER_DELETED',
        'COMPANY_VERIFIED',
        'COMPANY_UNVERIFIED',
        'JOB_STATUS_CHANGE',
        'JOB_FEATURED',
        'JOB_UNFEATURED',
        'JOB_DELETED',
        'REPORT_RESOLVED',
        'REPORT_DISMISSED',
        'REPORT_ACTIONED',
        'ADMIN_PROFILE_UPDATE',
        'ADMIN_PASSWORD_UPDATE',
      ],
    },
    targetType: {
      type: String,
      enum: ['User', 'Company', 'Job', 'Report', 'Application', 'System'],
      required: true,
    },
    targetId: {
      type: String,
      default: '',
    },
    targetName: {
      type: String,
      default: '',
    },
    details: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

