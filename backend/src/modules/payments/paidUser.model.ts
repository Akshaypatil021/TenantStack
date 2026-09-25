import mongoose, { Schema, Document } from 'mongoose';

export interface IPaidUser extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  planName: string;
  category: 'compute' | 'storage';
  billing: 'monthly' | 'yearly';
  amountPaid: number;
  currency: string;
  transactionId: string;
  orderId?: string;
  paymentMethod: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_APPROVAL';
  allocatedResources: any;
  activatedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaidUserSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, index: true },
    planName: { type: String, required: true },
    category: { type: String, enum: ['compute', 'storage'], default: 'compute' },
    billing: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    amountPaid: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    transactionId: { type: String, required: true },
    orderId: { type: String },
    paymentMethod: { type: String, default: 'Razorpay' },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING_APPROVAL'], default: 'ACTIVE' },
    allocatedResources: { type: Schema.Types.Mixed },
    activatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

PaidUserSchema.index({ userId: 1, category: 1 }, { unique: true });

export default mongoose.model<IPaidUser>('PaidUser', PaidUserSchema);
