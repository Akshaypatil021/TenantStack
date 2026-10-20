import mongoose, { Schema, Document } from 'mongoose';

export interface IStorageConfig extends Document {
  provider: 'AWS_S3' | 'LOCAL';
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  status: 'connected' | 'not_configured' | 'error';
  lastTestedAt?: Date;
  testMessage?: string;
  isDefault: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StorageConfigSchema: Schema = new Schema(
  {
    provider: { type: String, enum: ['AWS_S3', 'LOCAL'], default: 'AWS_S3' },
    bucketName: { type: String, default: 'tenantstack-storage', trim: true },
    region: { type: String, default: 'ap-south-1', trim: true },
    accessKeyId: { type: String, default: '', trim: true },
    secretAccessKey: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['connected', 'not_configured', 'error'],
      default: 'not_configured',
    },
    lastTestedAt: { type: Date },
    testMessage: { type: String, default: '' },
    isDefault: { type: Boolean, default: true },
    notes: { type: String, default: 'Master AWS S3 Cloud Storage configuration managed by Super Admin' },
  },
  { timestamps: true }
);

export default mongoose.model<IStorageConfig>('StorageConfig', StorageConfigSchema);
