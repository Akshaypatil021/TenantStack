import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  tenantId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  fileSizeMB: number;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true, unique: true },
    filePath: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    fileSizeMB: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound index for ultra-fast tenant project file queries
FileSchema.index({ tenantId: 1, projectId: 1, createdAt: -1 });

export const FileModel = mongoose.model<IFile>('File', FileSchema);
