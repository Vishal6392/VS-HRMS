import mongoose from 'mongoose';

const shiftRosterSchema = new mongoose.Schema(
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
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      default: null,
    },
    rosterStatus: {
      type: String,
      enum: ['WORKING', 'WEEK_OFF', 'HOLIDAY', 'COMP_OFF', 'LEAVE'],
      default: 'WORKING',
      required: true,
      index: true,
    },
    weekOffType: {
      type: String,
      enum: ['REGULAR', 'COMPENSATORY', 'OVERRIDE', 'NONE'],
      default: 'NONE',
    },
    holiday: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Holiday',
      default: null,
    },
    compOffForDate: {
      type: String, // "YYYY-MM-DD" of the worked off-duty day that generated this comp-off
      default: null,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique roster entry per employee per calendar date
shiftRosterSchema.index({ employee: 1, date: 1 }, { unique: true });
shiftRosterSchema.index({ date: 1, rosterStatus: 1 });
shiftRosterSchema.index({ employeeId: 1, date: 1 });

export default mongoose.model('ShiftRoster', shiftRosterSchema);
