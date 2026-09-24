import mongoose from 'mongoose';

const attendanceEventSchema = new mongoose.Schema(
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
    eventType: {
      type: String,
      enum: ['CHECK_IN', 'BREAK_START', 'BREAK_END', 'CHECK_OUT'],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number, // Accuracy in meters
      default: 0,
    },
    photoUrl: {
      type: String, // Base64 data URL or relative URL
      default: '',
    },
    breakType: {
      type: String,
      default: 'LUNCH', // e.g. LUNCH, TEA, PERSONAL
    },
    segmentIndex: {
      type: Number,
      default: 0, // For split shifts (0 = segment 1, 1 = segment 2)
    },
    deviceMetadata: {
      userAgent: { type: String, default: '' },
      platform: { type: String, default: '' },
      ip: { type: String, default: '' },
    },
    notes: {
      type: String,
      default: '',
    },
    matchedLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    matchedLocationName: {
      type: String,
      default: '',
    },
    distanceFromLocation: {
      type: Number,
      default: 0,
    },
    geofenceStatus: {
      type: String,
      enum: ['ALLOWED', 'BLOCKED', 'EXEMPT', 'NOT_APPLICABLE'],
      default: 'ALLOWED',
    },
  },
  {
    timestamps: true,
  }
);

attendanceEventSchema.index({ employee: 1, attendanceDate: 1, eventType: 1, timestamp: 1 });

export default mongoose.model('AttendanceEvent', attendanceEventSchema);
