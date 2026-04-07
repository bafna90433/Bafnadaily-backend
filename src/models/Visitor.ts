import mongoose, { Schema, Document } from 'mongoose';

export interface IVisitor extends Document {
  ip: string;
  userAgent: string;
  page: string;
  referrer?: string;
  state?: string;
  city?: string;
  country?: string;
  device: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  sessionId: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const visitorSchema = new Schema<IVisitor>(
  {
    ip: { type: String, required: true },
    userAgent: { type: String, default: '' },
    page: { type: String, required: true },
    referrer: String,
    state: { type: String, default: 'Unknown' },
    city: { type: String, default: 'Unknown' },
    country: { type: String, default: 'India' },
    device: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'desktop' },
    browser: String,
    sessionId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

visitorSchema.index({ createdAt: -1 });
visitorSchema.index({ state: 1 });
visitorSchema.index({ ip: 1, createdAt: -1 });

export const Visitor = mongoose.model<IVisitor>('Visitor', visitorSchema);
