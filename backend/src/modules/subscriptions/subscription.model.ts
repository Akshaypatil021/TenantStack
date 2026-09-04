import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  tenantId: mongoose.Types.ObjectId;
  plan: 'FREE' | 'PRO' | 'BUSINESS';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    plan: { type: String, enum: ['FREE', 'PRO', 'BUSINESS'], default: 'FREE' },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'], default: 'ACTIVE' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
