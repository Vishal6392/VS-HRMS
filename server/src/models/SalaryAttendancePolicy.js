import mongoose from 'mongoose';

const SalaryAttendancePolicySchema = new mongoose.Schema(
  {
    policyName: {
      type: String,
      default: 'Default Company Salary Policy',
      trim: true,
    },
    countWeekOffAsPaid: {
      type: Boolean,
      default: true,
      description: 'Count default weekly offs as paid days',
    },
    countCompOffAsPaid: {
      type: Boolean,
      default: true,
      description: 'Count approved compensatory offs as paid days',
    },
    countHolidayAsPaid: {
      type: Boolean,
      default: true,
      description: 'Count company/public holidays as paid days',
    },
    countPaidLeaveAsPaid: {
      type: Boolean,
      default: true,
      description: 'Count approved paid leaves as paid days',
    },
    countHolidayWorkedAsExtra: {
      type: Boolean,
      default: false,
      description: 'Mark holiday worked days as extra incentive over normal present',
    },
    countWeekOffWorkedAsExtra: {
      type: Boolean,
      default: false,
      description: 'Mark week-off worked days as extra incentive over normal present',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const SalaryAttendancePolicy = mongoose.model('SalaryAttendancePolicy', SalaryAttendancePolicySchema);
export default SalaryAttendancePolicy;
