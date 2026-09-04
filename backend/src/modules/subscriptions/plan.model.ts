import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  name: 'FREE' | 'PRO' | 'BUSINESS';
  maxUsers: number;
  maxProjects: number;
  maxStorageMB: number;
  maxApiRequestsPerDay: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema: Schema = new Schema(
  {
    name: { type: String, enum: ['FREE', 'PRO', 'BUSINESS'], required: true, unique: true },
    maxUsers: { type: Number, required: true },
    maxProjects: { type: Number, required: true },
    maxStorageMB: { type: Number, required: true },
    maxApiRequestsPerDay: { type: Number, required: true },
    price: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IPlan>('Plan', PlanSchema);
