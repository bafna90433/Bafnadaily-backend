import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryLog extends Document {
  productId: mongoose.Types.ObjectId;
  type: 'inward' | 'outward';
  quantity: number;
  oldStock: number;
  newStock: number;
  note?: string;
  createdAt: Date;
}

const inventoryLogSchema = new Schema<IInventoryLog>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: ['inward', 'outward'], required: true },
    quantity: { type: Number, required: true },
    oldStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    note: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const InventoryLog = mongoose.model<IInventoryLog>('InventoryLog', inventoryLogSchema);
