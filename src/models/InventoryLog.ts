import { createCompatModel } from '../db/compat';
import { Product } from './Product';

export type IInventoryLog = any;

export const InventoryLog: any = createCompatModel({
  name: 'InventoryLog', delegate: 'inventoryLog', fields: ['id', 'productId', 'type', 'quantity', 'oldStock', 'newStock', 'note', 'createdAt'],
  defaults: { productId: null, note: null },
  populate: { productId: { model: () => Product, local: 'productId', as: 'productId' } },
});
