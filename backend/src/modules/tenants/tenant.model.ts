import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  domain?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'PENDING';
  subscriptionPlan: string;
  computePlan?: string;
  storagePlan?: string;
  planCategory?: 'compute' | 'storage';
  planBilling?: 'monthly' | 'yearly';
  allocatedResources?: any;
  storageUsed: number;
  apiRequests: number;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    domain: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING'], default: 'ACTIVE' },
    subscriptionPlan: { type: String, default: 'FREE' },
    computePlan: { type: String },
    storagePlan: { type: String },
    planCategory: { type: String, default: 'compute' },
    planBilling: { type: String, default: 'monthly' },
    allocatedResources: { type: Schema.Types.Mixed },
    storageUsed: { type: Number, default: 0 },
    apiRequests: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>('Tenant', TenantSchema);
