import mongoose from 'mongoose';

const weeklyOffRuleSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    days: {
      type: [Number], // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      default: [0, 6], // Default Saturday + Sunday
      required: true,
    },
    description: {
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

export default mongoose.model('WeeklyOffRule', weeklyOffRuleSchema);
