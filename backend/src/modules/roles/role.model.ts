import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Role names should be unique per tenant
RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model<IRole>('Role', RoleSchema);
