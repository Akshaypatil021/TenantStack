import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export type InstanceStatus = "starting" | "running" | "stopping" | "stopped" | "restarting" | "error" | "terminated";
export type InstanceTemplate = "nodejs" | "python" | "go" | "nginx" | "ubuntu" | "alpine" | "postgres" | "redis" | "nextjs" | "react" | "static" | "docker";

export interface IEnvVar {
  key: string;
  value: string;
}

export interface IBuildLog {
  step: string;
  message: string;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
}

export interface IWebhookDeployEvent {
  commitHash: string;
  commitMessage: string;
  branch: string;
  pusher: string;
  triggeredAt: Date;
  status: 'success' | 'failed' | 'in_progress';
  error?: string;
  deploymentDurationMs?: number;
}

export interface IComputeInstance extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  template: InstanceTemplate;
  sourceType: 'template' | 'github';
  githubRepoUrl?: string;
  githubBranch?: string;
  buildCommand?: string;
  startCommand?: string;
  rootDirectory?: string;
  buildLogs?: IBuildLog[];
  lastCommitHash?: string;
  lastCommitMessage?: string;
  webhookSecret?: string;
  autoDeployEnabled?: boolean;
  lastWebhookTriggeredAt?: Date;
  webhookDeployHistory?: IWebhookDeployEvent[];
  status: InstanceStatus;
  port: number;
  publicIp: string;
  publicEndpoint: string;
  vCpu: number;
  ramGb: number;
  planName: string;
  envVars: IEnvVar[];
  region: string;
  uptimeStart?: Date;
  lastActionAt?: Date;
  cpuUsagePercent?: number;
  ramUsedMb?: number;
  networkInKb?: number;
  networkOutKb?: number;
  createdAt: Date;
  updatedAt: Date;
}

const EnvVarSchema = new Schema<IEnvVar>(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const ComputeInstanceSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    template: {
      type: String,
      enum: ["nodejs", "python", "go", "nginx", "ubuntu", "alpine", "postgres", "redis", "nextjs", "react", "static", "docker"],
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["template", "github"],
      default: "template",
    },
    githubRepoUrl: { type: String, trim: true },
    githubBranch: { type: String, default: "main", trim: true },
    buildCommand: { type: String, default: "npm run build" },
    startCommand: { type: String, default: "npm start" },
    rootDirectory: { type: String, trim: true },
    buildLogs: [
      {
        step: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        status: { type: String, enum: ["pending", "in_progress", "success", "failed"], default: "pending" },
      },
    ],
    lastCommitHash: { type: String },
    lastCommitMessage: { type: String },
    webhookSecret: {
      type: String,
      default: () => `whsec_${crypto.randomBytes(16).toString('hex')}`,
    },
    autoDeployEnabled: { type: Boolean, default: true },
    lastWebhookTriggeredAt: { type: Date },
    webhookDeployHistory: [
      {
        commitHash: { type: String, default: '' },
        commitMessage: { type: String, default: '' },
        branch: { type: String, default: 'main' },
        pusher: { type: String, default: 'github' },
        triggeredAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['success', 'failed', 'in_progress'], default: 'in_progress' },
        error: { type: String },
        deploymentDurationMs: { type: Number },
      },
    ],
    status: {
      type: String,
      enum: ["starting", "running", "stopping", "stopped", "restarting", "error", "terminated"],
      default: "starting",
    },
    port: { type: Number, required: true, default: 3000 },
    publicIp: { type: String, default: "" },
    publicEndpoint: { type: String, default: "" },
    vCpu: { type: Number, required: true },
    ramGb: { type: Number, required: true },
    planName: { type: String, required: true },
    envVars: { type: [EnvVarSchema], default: [] },
    region: { type: String, default: "ap-south-1" },
    uptimeStart: { type: Date },
    lastActionAt: { type: Date },
    cpuUsagePercent: { type: Number, default: 0 },
    ramUsedMb: { type: Number, default: 0 },
    networkInKb: { type: Number, default: 0 },
    networkOutKb: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IComputeInstance>("ComputeInstance", ComputeInstanceSchema);
