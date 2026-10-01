import mongoose, { Schema, Document } from 'mongoose';
import { ProjectMemberRole } from './project.model';

export interface IProjectInvitation extends Document {
  projectId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  email: string;
  role: ProjectMemberRole;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectInvitationSchema: Schema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'CONTRIBUTOR', 'VIEWER'],
      default: 'CONTRIBUTOR',
    },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'EXPIRED'],
      default: 'PENDING',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// An email can only have one PENDING invite per project
ProjectInvitationSchema.index(
  { projectId: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

// Fast token lookup for accept/get invite endpoints
ProjectInvitationSchema.index({ token: 1 });

export default mongoose.model<IProjectInvitation>('ProjectInvitation', ProjectInvitationSchema);
