import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
      type: String, 
      enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'], 
      default: 'TODO' 
    },
  },
  { timestamps: true }
);

// Ensure project names are unique within a single tenant
ProjectSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model<IProject>('Project', ProjectSchema);
