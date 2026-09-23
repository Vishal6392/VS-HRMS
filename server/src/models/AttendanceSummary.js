import mongoose from 'mongoose';

const attendanceSummarySchema = new mongoose.Schema(
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
    attendanceDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    scheduledHours: {
      type: Number,
      default: 0, // In decimal hours (e.g. 9.0)
    },
    workingHours: {
      type: Number,
      default: 0, // In decimal hours (e.g. 8.5)
    },
    breakDurationMinutes: {
      type: Number,
      default: 0,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    earlyLeavingMinutes: {
      type: Number,
      default: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    shortHoursMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_BREAK', 'WORKING', 'CHECKED_OUT', 'MISSING_PUNCH', 'WEEKLY_OFF'],
      default: 'ABSENT',
      index: true,
    },
    firstCheckIn: {
      type: Date,
      default: null,
    },
    lastCheckOut: {
      type: Date,
      default: null,
    },
    activeBreakStart: {
      type: Date,
      default: null,
    },
    events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AttendanceEvent',
      },
    ],
    lastEventType: {
      type: String,
      default: null,
    },
    isManualAdjustment: {
      type: Boolean,
      default: false,
    },
    adjustmentReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

attendanceSummarySchema.index({ employee: 1, attendanceDate: 1 }, { unique: true });

export default mongoose.model('AttendanceSummary', attendanceSummarySchema);
