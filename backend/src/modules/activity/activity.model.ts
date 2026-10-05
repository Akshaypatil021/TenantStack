import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // Optional because system actions might not have a user
  action: string;
  details: string;
  metadata?: any;
  createdAt: Date;
}

const ActivitySchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IActivity>('Activity', ActivitySchema);
