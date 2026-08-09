import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  domain?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  subscriptionPlan: 'FREE' | 'PRO' | 'BUSINESS';
  storageUsed: number;
  apiRequests: number;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    domain: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
    subscriptionPlan: { type: String, enum: ['FREE', 'PRO', 'BUSINESS'], default: 'FREE' },
    storageUsed: { type: Number, default: 0 },
    apiRequests: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>('Tenant', TenantSchema);
