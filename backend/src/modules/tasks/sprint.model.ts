import mongoose, { Schema, Document } from 'mongoose';

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export interface ISprint extends Document {
  projectId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  goal?: string;
  durationWeeks: number;
  startDate?: Date;
  endDate?: Date;
  status: SprintStatus;
  createdBy: {
    userId: mongoose.Types.ObjectId;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SprintSchema: Schema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    goal: { type: String, default: '' },
    durationWeeks: { type: Number, default: 2 },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['PLANNING', 'ACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
    },
    createdBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
  },
  { timestamps: true }
);

SprintSchema.index({ projectId: 1, status: 1 });

export default mongoose.model<ISprint>('Sprint', SprintSchema);
