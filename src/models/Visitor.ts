import { createCompatModel } from '../db/compat';

export type IVisitor = any;

export const Visitor: any = createCompatModel({
  name: 'Visitor', delegate: 'visitor',
  fields: ['id', 'ip', 'userAgent', 'page', 'referrer', 'state', 'city', 'country', 'device', 'browser', 'sessionId', 'userId', 'createdAt', 'updatedAt'],
  defaults: { userAgent: '', referrer: null, state: 'Unknown', city: 'Unknown', country: 'India', device: 'desktop', browser: null, userId: null },
});
