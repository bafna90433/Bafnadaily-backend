import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffFeedback extends Document {
  folderId?: mongoose.Types.ObjectId | null;
  reportId?: mongoose.Types.ObjectId; // Reference to the image being discussed
  message?: string;
  sender: 'admin' | 'staff';
  staffName?: string;
  isRead: boolean;
  audioUrl?: string;
  audioDuration?: number;
  createdAt: Date;
}

const staffFeedbackSchema = new Schema<IStaffFeedback>(
  {
    folderId: { type: Schema.Types.ObjectId, ref: 'StaffFolder', default: null, index: true },
    reportId: { type: Schema.Types.ObjectId, ref: 'StaffReport', default: null },
    message: { type: String, default: '' },
    sender: { type: String, enum: ['admin', 'staff'], required: true },
    staffName: { type: String, default: 'Staff' },
    isRead: { type: Boolean, default: false },
    audioUrl: { type: String, default: null },
    audioDuration: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const StaffFeedback = mongoose.model<IStaffFeedback>('StaffFeedback', staffFeedbackSchema);
