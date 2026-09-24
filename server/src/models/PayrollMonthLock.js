import mongoose from 'mongoose';

const PayrollMonthLockSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      index: true,
    },
    month: {
      type: Number, // 1 to 12
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'FINALIZED'],
      default: 'OPEN',
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalizedByName: {
      type: String,
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    exceptionsSummary: {
      type: Object,
      default: () => ({
        missingPunches: 0,
        unexplainedAbsence: 0,
        pendingAdjustments: 0,
        totalEmployees: 0,
      }),
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

PayrollMonthLockSchema.index({ year: 1, month: 1 }, { unique: true });

const PayrollMonthLock = mongoose.model('PayrollMonthLock', PayrollMonthLockSchema);
export default PayrollMonthLock;
