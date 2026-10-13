import mongoose, { Schema, Document } from 'mongoose';

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ITaskAttachment {
  url: string;
  originalName: string;
  uploadedBy?: string;
  uploadedAt: Date;
}

export interface ITaskComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  sprint: string;
  storyPoints: number;
  assignedTo?: {
    userId: mongoose.Types.ObjectId;
    name: string;
    email?: string;
  };
  photoUrl?: string;
  photoName?: string;
  attachments: ITaskAttachment[];
  comments: ITaskComment[];
  createdBy: {
    userId: mongoose.Types.ObjectId;
    name: string;
  };
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
      default: 'TODO',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    sprint: { type: String, default: 'Backlog' },
    storyPoints: { type: Number, default: 3 },
    assignedTo: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      email: { type: String },
    },
    photoUrl: { type: String },
    photoName: { type: String },
    attachments: [
      {
        url: { type: String, required: true },
        originalName: { type: String, required: true },
        uploadedBy: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        id: { type: String, required: true },
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

TaskSchema.index({ projectId: 1, sprint: 1 });
TaskSchema.index({ projectId: 1, status: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);
