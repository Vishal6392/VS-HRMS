import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    locationType: {
      type: String,
      enum: ['OFFICE', 'WFH', 'CLIENT_SITE', 'FIELD_SITE', 'OTHER'],
      default: 'OFFICE',
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    allowedRadiusMeters: {
      type: Number,
      required: true,
      default: 100,
      min: 10,
    },
    minimumGpsAccuracyMeters: {
      type: Number,
      default: 50,
      min: 5,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
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

locationSchema.index({ status: 1, locationType: 1 });
locationSchema.index({ locationName: 1 });

export default mongoose.model('Location', locationSchema);
