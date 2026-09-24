import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    holidayName: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['NATIONAL', 'PUBLIC', 'COMPANY', 'OPTIONAL'],
      default: 'PUBLIC',
      required: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
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

holidaySchema.index({ date: 1, status: 1 });

export default mongoose.model('Holiday', holidaySchema);
