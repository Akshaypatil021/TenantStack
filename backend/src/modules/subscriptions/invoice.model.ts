import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  plan: 'FREE' | 'PRO' | 'BUSINESS';
  amount: number;
  currency: string;
  transactionId: string;
  status: 'PAID' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    plan: { type: String, enum: ['FREE', 'PRO', 'BUSINESS'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    transactionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['PAID', 'FAILED'], default: 'PAID' },
  },
  { timestamps: true }
);

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
