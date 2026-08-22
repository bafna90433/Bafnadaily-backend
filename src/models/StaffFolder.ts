import { createCompatModel } from '../db/compat';

export type IStaffFolder = any;

export const StaffFolder: any = createCompatModel({
  name: 'StaffFolder', delegate: 'staffFolder', fields: ['id', 'name', 'parentId', 'staffName', 'createdAt', 'updatedAt'], defaults: { parentId: null, staffName: 'Staff' },
});
