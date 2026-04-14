import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffReport extends Document {
  imageUrl: string;
  fileId?: string;
  staffName?: string;
  productCode?: string;
  folderId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const staffReportSchema = new Schema<IStaffReport>(
  {
    imageUrl: { type: String, required: true },
    fileId: String,
    staffName: { type: String, default: 'Staff' },
    productCode: String,
    folderId: { type: Schema.Types.ObjectId, ref: 'StaffFolder', default: null, index: true },
  },
  { timestamps: true }
);

export const StaffReport = mongoose.model<IStaffReport>('StaffReport', staffReportSchema);
