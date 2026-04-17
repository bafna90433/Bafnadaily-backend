import mongoose, { Schema, Document } from 'mongoose';

export interface IDealOfDay extends Document {
  product: mongoose.Types.ObjectId;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  dealPrice: number;
  endTime: Date;
  isActive: boolean;
}

const dealOfDaySchema = new Schema<IDealOfDay>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    dealPrice: { type: Number, required: true, min: 0 },
    endTime: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DealOfDay = mongoose.model<IDealOfDay>('DealOfDay', dealOfDaySchema);
