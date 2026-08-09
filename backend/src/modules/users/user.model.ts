import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  roleId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure email is unique per tenant
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export default mongoose.model<IUser>('User', UserSchema);
