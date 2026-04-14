import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffFolder extends Document {
  name: string;
  parentId: mongoose.Types.ObjectId | null;
  staffName?: string;
  createdAt: Date;
}

const staffFolderSchema = new Schema<IStaffFolder>(
  {
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'StaffFolder', default: null },
    staffName: { type: String, default: 'Staff' },
  },
  { timestamps: true }
);

export const StaffFolder = mongoose.model<IStaffFolder>('StaffFolder', staffFolderSchema);
