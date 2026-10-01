import mongoose, { Schema, Document } from 'mongoose';

export type ProjectMemberRole = 'OWNER' | 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER';

export interface IProjectMember {
  user: mongoose.Types.ObjectId;
  role: ProjectMemberRole;
  joinedAt: Date;
}

export interface IProject extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  members: IProjectMember[];
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'CONTRIBUTOR', 'VIEWER'],
      default: 'CONTRIBUTOR',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProjectSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [ProjectMemberSchema], default: [] },
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

// Fast lookup for finding all projects a specific user is a member of
ProjectSchema.index({ 'members.user': 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);
