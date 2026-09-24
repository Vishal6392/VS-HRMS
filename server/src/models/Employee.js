import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    reportingManager: {
      type: String,
      default: '',
      trim: true,
    },
    assignedShift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    employmentStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    attendanceLocationPolicy: {
      type: String,
      enum: ['OFFICE_ONLY', 'WFH_ONLY', 'ASSIGNED_LOCATIONS', 'ANYWHERE'],
      default: 'ASSIGNED_LOCATIONS',
    },
    weeklyOffDays: {
      type: [Number], // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (null = inherit department default)
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Employee', employeeSchema);
