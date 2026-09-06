import mongoose, { Schema, Document } from 'mongoose';

export interface IInvitation extends Document {
  tenantId: mongoose.Types.ObjectId;
  email: string;
  roleId: mongoose.Types.ObjectId;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'EXPIRED'], default: 'PENDING' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Optional: unique index so an email can only have one pending invite per tenant
InvitationSchema.index({ tenantId: 1, email: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' } });

export default mongoose.model<IInvitation>('Invitation', InvitationSchema);
