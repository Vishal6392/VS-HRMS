import mongoose from 'mongoose';

const splitSegmentSchema = new mongoose.Schema({
  segmentName: {
    type: String,
    required: true,
  },
  startTime: {
    type: String, // "HH:mm" (24h)
    required: true,
  },
  endTime: {
    type: String, // "HH:mm" (24h)
    required: true,
  },
}, { _id: false });

const shiftSchema = new mongoose.Schema(
  {
    shiftName: {
      type: String,
      required: true,
      trim: true,
    },
    shiftCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    shiftType: {
      type: String,
      enum: ['GENERAL', 'NIGHT', 'SPLIT'],
      default: 'GENERAL',
      required: true,
    },
    startTime: {
      type: String, // "09:30"
      required: true,
    },
    endTime: {
      type: String, // "18:30"
      required: true,
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    minWorkingHours: {
      type: Number,
      default: 8,
      min: 1,
    },
    breakPolicy: {
      allowedBreaks: {
        type: Number,
        default: 1,
      },
      maxBreakMinutes: {
        type: Number,
        default: 60,
      },
    },
    splitSegments: [splitSegmentSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Shift', shiftSchema);
