import mongoose, { Schema, Document } from 'mongoose';
import { StorageCategory, StorageProvider } from '../../services/s3.service';

export interface IAiMetric {
  label: string;
  value: string;
}

export interface IAiAnalysis {
  summary?: string;
  keyMetrics?: IAiMetric[];
  insights?: string[];
  recommendations?: string[];
  dataColumns?: string[];
  rowCount?: number;
  analyzedAt?: Date;
  modelUsed?: string;
}

export interface IStorageObject extends Document {
  tenantId: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSizeMB: number;
  category: StorageCategory;
  s3Key: string;
  s3Bucket: string;
  storageProvider: StorageProvider;
  localPath?: string;
  aiAnalysis?: IAiAnalysis;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AiMetricSchema = new Schema<IAiMetric>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const AiAnalysisSchema = new Schema<IAiAnalysis>(
  {
    summary: { type: String },
    keyMetrics: { type: [AiMetricSchema], default: [] },
    insights: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    dataColumns: { type: [String], default: [] },
    rowCount: { type: Number },
    analyzedAt: { type: Date },
    modelUsed: { type: String },
  },
  { _id: false }
);

const StorageObjectSchema = new Schema<IStorageObject>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fileName: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    fileSizeMB: { type: Number, required: true },
    category: {
      type: String,
      enum: ['DOCUMENT', 'DATASET', 'IMAGE', 'CODE', 'ARCHIVE', 'OTHER'],
      default: 'OTHER',
      index: true,
    },
    s3Key: { type: String, required: true },
    s3Bucket: { type: String, required: true },
    storageProvider: {
      type: String,
      enum: ['AWS_S3', 'LOCAL'],
      default: 'AWS_S3',
    },
    localPath: { type: String },
    aiAnalysis: { type: AiAnalysisSchema },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound indexes for ultra-fast tenant queries and category filters
StorageObjectSchema.index({ tenantId: 1, createdAt: -1 });
StorageObjectSchema.index({ tenantId: 1, category: 1, createdAt: -1 });

export const StorageModel = mongoose.model<IStorageObject>('StorageObject', StorageObjectSchema);
export default StorageModel;
