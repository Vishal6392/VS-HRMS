import mongoose from 'mongoose';

const AttendanceAdjustmentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    originalStatus: {
      type: String,
      required: true, // e.g., 'A', 'WO', 'H', 'MP'
    },
    adjustedStatus: {
      type: String,
      required: true, // e.g., 'P', 'CO', 'WOW', 'HW', 'L'
    },
    adjustmentType: {
      type: String,
      enum: [
        'ABSENT_TO_PRESENT',
        'ABSENT_TO_COMPOFF',
        'WEEKOFF_WORKED',
        'HOLIDAY_WORKED',
        'MISSING_PUNCH_RESOLVED',
        'PAID_LEAVE',
        'CUSTOM',
      ],
      default: 'CUSTOM',
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    referenceDate: {
      type: String, // e.g. Sunday worked date for comp-off, or ticket id
      default: null,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedByName: {
      type: String,
      default: 'HR / Admin',
    },
    status: {
      type: String,
      enum: ['APPROVED', 'PENDING', 'REJECTED'],
      default: 'APPROVED',
    },
  },
  { timestamps: true }
);

// Prevent duplicate active adjustments for same employee on same date
AttendanceAdjustmentSchema.index({ employee: 1, date: 1 }, { unique: true });

const AttendanceAdjustment = mongoose.model('AttendanceAdjustment', AttendanceAdjustmentSchema);
export default AttendanceAdjustment;
