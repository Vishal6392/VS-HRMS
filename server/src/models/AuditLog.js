import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: {
      type: String,
      default: 'System',
    },
    action: {
      type: String,
      required: true, // e.g. EMPLOYEE_CREATED, SHIFT_UPDATED, ATTENDANCE_ADJUSTED, ADMIN_LOGIN
    },
    targetRecord: {
      model: { type: String, default: '' },
      id: { type: String, default: '' },
      identifier: { type: String, default: '' }, // e.g. employee code or shift name
    },
    details: {
      type: String,
      default: '',
    },
    beforeValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
