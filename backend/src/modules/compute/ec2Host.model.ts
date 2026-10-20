import mongoose, { Schema, Document } from "mongoose";

export interface IEc2Host extends Document {
  label: string;
  hostIp: string;
  sshUsername: string;
  sshKey?: string;
  region: string;
  status: 'active' | 'configuring' | 'unreachable';
  basePort: number;
  totalAppsHosted: number;
  lastCheckedAt: Date;
  isDefault: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const Ec2HostSchema: Schema = new Schema(
  {
    label: { type: String, default: "Primary AWS EC2 Host Node", trim: true },
    hostIp: { type: String, required: true, trim: true, default: "13.233.94.120" },
    sshUsername: { type: String, required: true, default: "ubuntu", trim: true },
    sshKey: { type: String, default: "" },
    region: { type: String, default: "ap-south-1", trim: true },
    status: {
      type: String,
      enum: ["active", "configuring", "unreachable"],
      default: "active",
    },
    basePort: { type: Number, default: 3001 },
    totalAppsHosted: { type: Number, default: 0 },
    lastCheckedAt: { type: Date, default: Date.now },
    isDefault: { type: Boolean, default: true },
    notes: { type: String, default: "Super Admin Master Host Node for multi-tenant deployments" },
  },
  { timestamps: true }
);

export default mongoose.model<IEc2Host>("Ec2Host", Ec2HostSchema);
