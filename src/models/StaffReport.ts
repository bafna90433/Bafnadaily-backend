import { createCompatModel } from '../db/compat';

export type IStaffReport = any;

export const StaffReport: any = createCompatModel({
  name: 'StaffReport', delegate: 'staffReport', fields: ['id', 'imageUrl', 'fileId', 'staffName', 'productCode', 'folderId', 'createdAt', 'updatedAt'], defaults: { fileId: null, staffName: 'Staff', productCode: null, folderId: null },
});
