import { createCompatModel } from '../db/compat';
import { Product } from './Product';

export type IDealOfDay = any;

export const DealOfDay: any = createCompatModel({
  name: 'DealOfDay', delegate: 'dealOfDay',
  fields: ['id', 'productId', 'discountType', 'discountValue', 'dealPrice', 'endTime', 'isActive', 'createdAt', 'updatedAt'],
  aliases: { product: 'productId' }, defaults: { isActive: true },
  populate: { product: { model: () => Product, local: 'product', as: 'product' } },
});
