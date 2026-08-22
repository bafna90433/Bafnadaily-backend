import { createCompatModel } from '../db/compat';
import { StaffReport } from './StaffReport';

export type IStaffFeedback = any;

export const StaffFeedback: any = createCompatModel({
  name: 'StaffFeedback', delegate: 'staffFeedback',
  fields: ['id', 'folderId', 'reportId', 'message', 'sender', 'staffName', 'isRead', 'audioUrl', 'audioDuration', 'createdAt'],
  defaults: { folderId: null, reportId: null, message: '', staffName: 'Staff', isRead: false, audioUrl: null, audioDuration: 0 },
  populate: { reportId: { model: () => StaffReport, local: 'reportId', as: 'reportId' } },
});
