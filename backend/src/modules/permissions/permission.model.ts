import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  tenantId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    action: { type: String, required: true },
  },
  { timestamps: true }
);

// A role should not have duplicate permissions
PermissionSchema.index({ tenantId: 1, roleId: 1, action: 1 }, { unique: true });

export default mongoose.model<IPermission>('Permission', PermissionSchema);
