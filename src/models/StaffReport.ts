import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffReport extends Document {
  imageUrl: string;
  fileId?: string;
  staffName?: string;
  productCode?: string;
  createdAt: Date;
}

const staffReportSchema = new Schema<IStaffReport>(
  {
    imageUrl: { type: String, required: true },
    fileId: String,
    staffName: { type: String, default: 'Staff' },
    productCode: String,
  },
  { timestamps: true }
);

export const StaffReport = mongoose.model<IStaffReport>('StaffReport', staffReportSchema);
