import express, { Request, Response } from 'express';
import javascriptBarcodeReader from 'javascript-barcode-reader';
import mongoose from 'mongoose';
import axios from 'axios';
import { sendWhatsAppTemplate, sanitizePhone } from '../utils/whatsapp';
import { Product } from '../models/Product';
import { Category } from '../models/Product';
import { InventoryLog } from '../models/InventoryLog';
import { Order, Cart, Wishlist, Banner, Coupon } from '../models/Order';
import { User } from '../models/User';
import { StaffReport } from '../models/StaffReport';
import { StaffFolder } from '../models/StaffFolder';
import { StaffFeedback } from '../models/StaffFeedback';
import { DealOfDay } from '../models/DealOfDay';
import { StaffReport as StaffReportModel } from '../models/StaffReport'; // Just in case of conflicts
import { protect } from '../middleware/auth';
import { adminProtect } from '../middleware/auth';
import { AuthRequest } from '../types';
import slugify from 'slugify';
import multer from 'multer';
import getImageKit from '../config/imagekit';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
export const productsRouter = express.Router();

productsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { category, categoryIds: categoryIdsParam, search, minPrice, maxPrice, sort, page = 1, limit = 20, featured, trending, newArrival, bestSeller, tag, admin } = req.query as any;
    const query: any = admin === 'true' ? {} : { isActive: { $ne: false } };

    if (categoryIdsParam) {
      // Multiple IDs from frontend (parent + all subs already resolved)
      const ids = String(categoryIdsParam).split(',')
        .map(id => id.trim())
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      if (ids.length > 0) query.category = { $in: ids };
    } else if (category) {
      // Single category — also include direct subcategories (1 level deep)
      if (mongoose.Types.ObjectId.isValid(category)) {
        const rootId = new mongoose.Types.ObjectId(category);
        const subs = await Category.find({ parent: rootId }).select('_id');
        const allIds = [rootId, ...subs.map(c => c._id)];
        query.category = { $in: allIds };
      } else {
        const foundCat = await Category.findOne({ name: new RegExp(`^${category}$`, 'i') });
        if (foundCat) {
          const subs = await Category.find({ parent: foundCat._id }).select('_id');
          const allIds = [foundCat._id, ...subs.map(c => c._id)];
          query.category = { $in: allIds };
        } else {
          return res.json({ success: true, products: [], total: 0, page: Number(page), pages: 0 });
        }
      }
    }
    if (featured === 'true') query.isFeatured = true;
    if (trending === 'true') query.isTrending = true;
    if (newArrival === 'true') query.isNewArrival = true;
    if (bestSeller === 'true') query.isBestSeller = true;
    if (tag) query.tags = { $in: [tag] };
    if (search) {
      // Find categories whose name matches the search term
      const matchingCats = await Category.find({
        name: { $regex: search, $options: 'i' },
        isActive: true,
      }).select('_id');

      // Also include subcategories of matched categories
      let catIds = matchingCats.map(c => c._id);
      if (catIds.length > 0) {
        const subCats = await Category.find({ parent: { $in: catIds }, isActive: true }).select('_id');
        catIds = [...catIds, ...subCats.map(c => c._id)];
      }

      const searchOr: any[] = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];

      // Exact barcode match
      if (search.match(/^[a-zA-Z0-9]+$/)) {
        searchOr.push({ barcode: search });
      }

      // Category name match
      if (catIds.length > 0) {
        searchOr.push({ category: { $in: catIds } });
      }

      query.$or = searchOr;
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    let sortObj: any = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'popular') sortObj = { sold: -1 };
    else if (sort === 'rating') sortObj = { averageRating: -1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortObj)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('-reviews');
    res.json({ success: true, products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.get('/by-id/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, product });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.get('/details/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('reviews.user', 'name avatar');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug')
      .populate('reviews.user', 'name avatar');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.post('/:id/review', protect, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    const already = product.reviews.find((r: any) => r.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ success: false, message: 'Already reviewed' });
    product.reviews.push({ user: req.user._id, rating: req.body.rating, comment: req.body.comment, images: req.body.images });
    await product.save();
    res.json({ success: true, message: 'Review added' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.post('/', adminProtect, async (req: Request, res: Response) => {
  try {
    const base = slugify(req.body.name, { lower: true, strict: true });
    const slug = `${base}-${Date.now()}`;
    const product = await Product.create({ ...req.body, slug });
    res.status(201).json({ success: true, product });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Specific routes must come BEFORE wildcard /:id routes ──────────────────

productsRouter.post('/decode-barcode', adminProtect, upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });

    const result = await (javascriptBarcodeReader as any)({
      image: req.file.buffer,
      barcode: 'code-128',
      options: {}
    });

    if (result) {
      res.json({ success: true, barcode: result });
    } else {
      res.status(404).json({ success: false, message: 'No barcode detected in the image' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Decoding failed: ${err.message || 'Unknown error'}` });
  }
});

productsRouter.put('/update-stock/barcode', adminProtect, async (req: Request, res: Response) => {
  try {
    const { barcode, quantity = 1, type = 'inward' } = req.body;
    if (!barcode) return res.status(400).json({ success: false, message: 'Barcode is required' });

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: 'Invalid quantity' });

    const product = await Product.findOne({ barcode });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const oldStock = product.stock;
    if (type === 'outward') {
      if (product.stock < qty) {
        return res.status(400).json({ success: false, message: `Insufficient stock! Current: ${product.stock}, Trying to remove: ${qty}` });
      }
      product.stock -= qty;
    } else {
      product.stock += qty;
    }

    await product.save();

    // Create log
    await InventoryLog.create({
      productId: product._id,
      type,
      quantity: qty,
      oldStock,
      newStock: product.stock,
      note: `Stock ${type} via Mobile Scanner`
    });

    res.json({ success: true, message: `Stock ${type === 'inward' ? 'added' : 'removed'} successfully`, product });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.put('/update-stock/manual', adminProtect, async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1, type = 'inward' } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'Product ID is required' });

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: 'Invalid quantity' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const oldStock = product.stock;
    if (type === 'outward') {
      if (product.stock < qty) {
        return res.status(400).json({ success: false, message: `Insufficient stock! Current: ${product.stock}, Trying to remove: ${qty}` });
      }
      product.stock -= qty;
    } else {
      product.stock += qty;
    }

    await product.save();

    await InventoryLog.create({
      productId: product._id,
      type,
      quantity: qty,
      oldStock,
      newStock: product.stock,
      note: `Manual Stock ${type} update`
    });

    res.json({ success: true, message: `Stock ${type === 'inward' ? 'added' : 'removed'} successfully`, product });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.get('/inventory/logs/:productId', adminProtect, async (req: Request, res: Response) => {
  try {
    const logs = await InventoryLog.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, logs });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.get('/inventory/logs-today', adminProtect, async (req: Request, res: Response) => {
  try {
    const { type } = req.query; // 'inward' or 'outward'
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
    if (type) query.type = type;

    const logs = await InventoryLog.find(query)
      .populate('productId', 'name barcode images sku')
      .sort({ createdAt: -1 });

    res.json({ success: true, logs });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.get('/inventory/stats/today', adminProtect, async (req: Request, res: Response) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await InventoryLog.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    let inward = 0;
    let outward = 0;

    logs.forEach(log => {
      if (log.type === 'inward') inward += log.quantity;
      if (log.type === 'outward') outward += log.quantity;
    });

    res.json({ success: true, inward, outward });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.put('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    // Use $set so arrays (colors, images, variants) are properly replaced
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: false }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.delete('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
export const categoriesRouter = express.Router();

categoriesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { featured } = req.query as any;
    const query: any = {
      isActive: true,
      $or: [
        { parent: null },
        { isDashboardMain: true }
      ]
    };
    if (featured === 'true') query.featured = true;
    const categories = await Category.find(query).sort({ sortOrder: 1 });
    res.json({ success: true, categories });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

categoriesRouter.get('/all', async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true }).populate('parent', 'name').sort({ sortOrder: 1 });
    res.json({ success: true, categories });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

categoriesRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) return res.status(404).json({ success: false, message: 'Not found' });
    const subcategories = await Category.find({ parent: category._id, isActive: true });
    res.json({ success: true, category, subcategories });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

categoriesRouter.post('/', adminProtect, async (req: Request, res: Response) => {
  try {
    const slug = slugify(req.body.name, { lower: true, strict: true });
    const category = await Category.create({ ...req.body, slug });
    res.status(201).json({ success: true, category });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Category image upload
categoriesRouter.post('/:id/upload-image', adminProtect, upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    const result = await getImageKit().upload({
      file: req.file.buffer,
      fileName: `cat_${Date.now()}_${req.file.originalname}`,
      folder: `/reteiler/categories`,
    });
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { image: result.url, imageFileId: result.fileId },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, url: result.url, fileId: result.fileId, category });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

categoriesRouter.post('/:id/upload-banner', adminProtect, upload.single('banner'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await getImageKit().upload({
      file: req.file.buffer,
      fileName: `banner_${Date.now()}_${req.file.originalname}`,
      folder: `/reteiler/categories`,
    });
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { banner: result.url },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, url: result.url, category });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

categoriesRouter.put('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, category });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

categoriesRouter.delete('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── CART ─────────────────────────────────────────────────────────────────────
export const cartRouter = express.Router();

cartRouter.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name images price mrp stock isActive slug');
    if (!cart) cart = { items: [] } as any;
    res.json({ success: true, cart });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

cartRouter.post('/add', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity = 1, variant } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });
    const existing = (cart as any).items.find((i: any) => i.product?.toString() === productId && i.variant === variant);
    if (existing) { existing.quantity += quantity; }
    else { (cart as any).items.push({ product: productId, quantity, variant, price: product.price }); }
    await (cart as any).save();
    await (cart as any).populate('items.product', 'name images price mrp stock slug');
    res.json({ success: true, cart });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

cartRouter.put('/update', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id }) as any;
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (quantity <= 0) { cart.items.pull(itemId); } else { item.quantity = quantity; }
    await cart.save();
    await cart.populate('items.product', 'name images price mrp stock slug');
    res.json({ success: true, cart });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

cartRouter.delete('/remove/:itemId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }) as any;
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    cart.items.pull(req.params.itemId);
    await cart.save();
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

cartRouter.delete('/clear', protect, async (req: AuthRequest, res: Response) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const ordersRouter = express.Router();

ordersRouter.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { items, shippingAddress, paymentMethod, couponCode, giftWrapping, giftMessage, notes, paymentId, paymentStatus } = req.body;
    let subtotal = 0;
    const orderItems: any[] = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) continue;
      orderItems.push({ product: product._id, name: product.name, image: product.images[0]?.url, price: product.price, quantity: item.quantity, variant: item.variant });
      subtotal += product.price * item.quantity;
      product.stock = Math.max(0, product.stock - item.quantity);
      product.sold += item.quantity;
      await product.save();
    }
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true }) as any;
      if (coupon && subtotal >= coupon.minOrderAmount) {
        discount = coupon.discountType === 'percent' ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity) : coupon.discountValue;
        coupon.usedCount++;
        await coupon.save();
      }
    }
    const shippingCharge = subtotal > 499 ? 0 : 49;
    const total = subtotal - discount + shippingCharge + (giftWrapping ? 29 : 0);
    const order = await Order.create({
      user: req.user._id, items: orderItems, shippingAddress, paymentMethod, couponCode,
      giftWrapping, giftMessage, notes, subtotal, discount, shippingCharge, total,
      paymentId, paymentStatus: paymentId ? 'paid' : 'pending',
      orderStatus: 'confirmed',
      statusHistory: [{ status: 'confirmed', note: 'Order placed', updatedAt: new Date() }],
    });
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalOrders: 1, totalSpent: total } });

    // ── WhatsApp: Order Confirmed ──
    const fullUser = await User.findById(req.user._id).select('phone whatsapp').lean() as any;
    const waTo = sanitizePhone(fullUser?.whatsapp || fullUser?.phone || shippingAddress?.phone);
    if (waTo) {
      try {
        await sendWhatsAppTemplate({
          to: waTo,
          templateName: process.env.WA_ORDER_TEMPLATE || 'order_confirmed_new',
          languageCode: 'en_US',
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: String(fullUser?.name || 'Customer') },
              { type: 'text', text: String(order.orderNumber || '') },
              { type: 'text', text: String(total) },
            ],
          }],
        });
        await Order.findByIdAndUpdate(order._id, { 'wa.orderConfirmedSent': true, 'wa.lastSentAt': new Date() });
      } catch (waErr: any) {
        await Order.findByIdAndUpdate(order._id, { 'wa.lastError': waErr?.message || 'WA failed' });
      }
    }

    res.status(201).json({ success: true, order });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

ordersRouter.get('/my', protect, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

ordersRouter.get('/pending-reviews', protect, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ user: req.user._id, orderStatus: 'delivered' }).select('items');
    const productMap: Record<string, { name: string; image: string }> = {};
    for (const order of orders) {
      for (const item of (order.items as any[])) {
        const pid = item.product?.toString() || item.productId?.toString();
        if (pid && !productMap[pid]) productMap[pid] = { name: item.name, image: item.image || '' };
      }
    }
    const ids = Object.keys(productMap);
    if (!ids.length) return res.json({ success: true, pendingReviews: [] });
    const reviewed = await Product.find({ _id: { $in: ids }, 'reviews.user': req.user._id }).select('_id');
    const reviewedSet = new Set(reviewed.map((p: any) => p._id.toString()));
    const pending = ids.filter(id => !reviewedSet.has(id)).map(id => ({ productId: id, ...productMap[id] }));
    res.json({ success: true, pendingReviews: pending });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

ordersRouter.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    res.json({ success: true, order });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

ordersRouter.put('/:id/cancel', protect, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['placed', 'confirmed'].includes(order.orderStatus)) return res.status(400).json({ success: false, message: 'Cannot cancel at this stage' });
    order.orderStatus = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', note: req.body.reason || 'Cancelled by user', updatedAt: new Date() });
    await order.save();
    res.json({ success: true, order });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

ordersRouter.get('/', adminProtect, async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query as any;
    const query: any = {};
    if (status) query.orderStatus = status;
    if (search) query.orderNumber = new RegExp(search, 'i');
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query).sort({ createdAt: -1 }).populate('user', 'name phone').limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    res.json({ success: true, orders, total });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

ordersRouter.put('/:id/status', adminProtect, async (req: Request, res: Response) => {
  try {
    const { status, note, trackingNumber, courierName, packingDetails, shipProvider } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'name phone whatsapp') as any;
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });

    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || `Updated to ${status}`, updatedAt: new Date() });

    // ── SHIPPING: Auto AWB generation ──
    if (status === 'shipped') {
      const provider = shipProvider || 'manual';

      // ── Delhivery auto AWB ──
      if (provider === 'delhivery' && packingDetails?.length > 0 && !order.trackingNumber) {
        try {
          const BOX_DIMS: Record<string, { l: number; b: number; h: number }> = {
            A28: { l: 47, b: 36, h: 25 }, A06: { l: 44.5, b: 35, h: 34.5 },
            A08: { l: 47, b: 35.5, h: 47 }, A31: { l: 89, b: 48, h: 40 },
            A18: { l: 44, b: 20, h: 45 },
          };
          let totalWeightGrams = 0;
          let dims = BOX_DIMS['A28'];
          packingDetails.forEach((box: any) => {
            totalWeightGrams += (Number(box.totalWeight) || 0) * 1000;
            if (BOX_DIMS[box.boxType]) dims = BOX_DIMS[box.boxType];
          });

          const addr = order.shippingAddress;
          const delvPayload = {
            shipments: [{
              name: addr.name || 'Customer',
              add: addr.addressLine1 + (addr.addressLine2 ? ', ' + addr.addressLine2 : ''),
              pin: addr.pincode, city: addr.city, state: addr.state,
              country: 'India',
              phone: addr.phone || order.user?.phone || '9999999999',
              order: order.orderNumber,
              payment_mode: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
              cod_amount: order.paymentMethod === 'cod' ? order.total : 0,
              products_desc: 'Products',
              seller_name: process.env.SELLER_NAME || 'Bafnadaily',
              total_amount: order.total,
              weight: totalWeightGrams,
              shipping_mode: 'Surface',
              length: dims.l, breadth: dims.b, height: dims.h,
            }],
            pickup_location: { name: process.env.DELHIVERY_PICKUP_LOCATION_NAME || 'PRIMARY' },
          };

          const delvResp = await axios.post(
            'https://track.delhivery.com/api/cmu/create.json',
            `format=json&data=${encodeURIComponent(JSON.stringify(delvPayload))}`,
            { headers: { Authorization: `Token ${process.env.DELHIVERY_API_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
          );

          if (delvResp.data?.success) {
            order.trackingNumber = delvResp.data.packages[0].waybill;
            order.courierName = 'Delhivery';
            order.packingDetails = packingDetails;
          } else {
            return res.status(400).json({ success: false, message: 'Delhivery Error: ' + JSON.stringify(delvResp.data?.rmk || delvResp.data) });
          }
        } catch (apiErr: any) {
          return res.status(500).json({ success: false, message: 'Delhivery API failed: ' + apiErr.message });
        }
      }

      // ── Shiprocket manual tracking ──
      if (provider === 'shiprocket' && trackingNumber) {
        order.trackingNumber = trackingNumber;
        order.courierName = courierName || 'Shiprocket';
        order.packingDetails = packingDetails || [];
      }

      // ── Manual tracking fallback ──
      if (provider === 'manual' && trackingNumber) {
        order.trackingNumber = trackingNumber;
        order.courierName = courierName || '';
      }
    }

    if (!order.wa) order.wa = { orderConfirmedSent: false, trackingSent: false, lastError: '', lastSentAt: null };
    await order.save();

    // ── WhatsApp: Shipped ──
    if (status === 'shipped' && order.trackingNumber && !order.wa.trackingSent) {
      const waTo = sanitizePhone(order.user?.whatsapp || order.user?.phone || order.shippingAddress?.phone);
      if (waTo) {
        try {
          const courier = order.courierName || 'Courier';
          const trackLink = courier.toLowerCase().includes('delhivery')
            ? `https://www.delhivery.com/track-v2/package/${order.trackingNumber}`
            : `https://www.google.com/search?q=${encodeURIComponent(order.trackingNumber + ' tracking')}`;

          await sendWhatsAppTemplate({
            to: waTo,
            templateName: process.env.WA_TRACKING_TEMPLATE || 'order_shipped_neya_hai',
            languageCode: 'en_US',
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: String(order.user?.name || 'Customer') },
                  { type: 'text', text: String(order.orderNumber) },
                  { type: 'text', text: courier },
                  { type: 'text', text: String(order.trackingNumber) },
                  { type: 'text', text: trackLink },
                ],
              },
              { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(order._id) }] },
            ],
          });
          order.wa.trackingSent = true;
          order.wa.lastSentAt = new Date();
          order.wa.lastError = '';
          await order.save();
        } catch (waErr: any) {
          order.wa.lastError = waErr?.response?.data ? JSON.stringify(waErr.response.data) : waErr.message;
          await order.save();
        }
      }
    }

    const updated = await Order.findById(order._id).populate('user', 'name phone');
    res.json({ success: true, order: updated });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── WISHLIST ─────────────────────────────────────────────────────────────────
export const wishlistRouter = express.Router();

wishlistRouter.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    let wl = await Wishlist.findOne({ user: req.user._id }).populate('products', 'name images price mrp discount slug isTrending');
    if (!wl) wl = { products: [] } as any;
    res.json({ success: true, wishlist: wl });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

wishlistRouter.post('/toggle/:productId', protect, async (req: AuthRequest, res: Response) => {
  try {
    let wl = await Wishlist.findOne({ user: req.user._id }) as any;
    if (!wl) wl = await Wishlist.create({ user: req.user._id, products: [] });
    const idx = wl.products.indexOf(req.params.productId);
    if (idx > -1) { wl.products.splice(idx, 1); } else { wl.products.push(req.params.productId); }
    await wl.save();
    res.json({ success: true, wishlisted: idx === -1 });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── UPLOAD (ImageKit — lazy init) ───────────────────────────────────────────
export const uploadRouter = express.Router();

uploadRouter.post('/image', adminProtect, upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    const folder = req.body.folder || 'products';
    const result = await getImageKit().upload({
      file: req.file.buffer,
      fileName: `${Date.now()}_${req.file.originalname}`,
      folder: `/reteiler/${folder}`,
    });
    res.json({ success: true, url: result.url, fileId: result.fileId });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

uploadRouter.post('/images', adminProtect, upload.array('images', 10), async (req: any, res: Response) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files' });
    const folder = req.body.folder || 'products';
    const uploads = await Promise.all(req.files.map((f: any) =>
      getImageKit().upload({ file: f.buffer, fileName: `${Date.now()}_${f.originalname}`, folder: `/reteiler/${folder}` })
    ));
    res.json({ success: true, images: uploads.map(u => ({ url: u.url, fileId: u.fileId })) });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

uploadRouter.delete('/image/:fileId', adminProtect, async (req: Request, res: Response) => {
  try {
    await getImageKit().deleteFile(req.params.fileId);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── BANNERS ──────────────────────────────────────────────────────────────────
export const bannersRouter = express.Router();

bannersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { type, category, all } = req.query as any;
    const query: any = { isActive: true };
    if (type) query.type = type;

    // If `all=true`, return every banner (admin view — no category filter)
    if (all !== 'true') {
      if (category) {
        // Return banners for this category OR global banners
        query.category = { $in: [category, null] };
      } else {
        query.category = null;              // global banners (homepage)
      }
    }

    const banners = await Banner.find(query).populate('category', 'name slug').sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, banners });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

bannersRouter.post('/', adminProtect, async (req: Request, res: Response) => { try { const b = await Banner.create(req.body); res.status(201).json({ success: true, banner: b }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });
bannersRouter.put('/:id', adminProtect, async (req: Request, res: Response) => { try { const b = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, banner: b }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });
bannersRouter.delete('/:id', adminProtect, async (req: Request, res: Response) => { try { await Banner.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });

// ─── COUPONS ──────────────────────────────────────────────────────────────────
export const couponsRouter = express.Router();

couponsRouter.post('/validate', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { code, amount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true }) as any;
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon' });
    if (coupon.validTill && new Date() > coupon.validTill) return res.status(400).json({ success: false, message: 'Coupon expired' });
    if (amount < coupon.minOrderAmount) return res.status(400).json({ success: false, message: `Min order ₹${coupon.minOrderAmount}` });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: 'Limit reached' });
    const discount = coupon.discountType === 'percent' ? Math.min((amount * coupon.discountValue) / 100, coupon.maxDiscount || Infinity) : coupon.discountValue;
    res.json({ success: true, coupon, discount: Math.floor(discount) });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});
couponsRouter.get('/', adminProtect, async (req: Request, res: Response) => { try { const c = await Coupon.find().sort({ createdAt: -1 }); res.json({ success: true, coupons: c }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });
couponsRouter.post('/', adminProtect, async (req: Request, res: Response) => { try { const c = await Coupon.create(req.body); res.status(201).json({ success: true, coupon: c }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });
couponsRouter.put('/:id', adminProtect, async (req: Request, res: Response) => { try { const c = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, coupon: c }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });
couponsRouter.delete('/:id', adminProtect, async (req: Request, res: Response) => { try { await Coupon.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err: any) { res.status(500).json({ success: false, message: err.message }); } });

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
export const adminRouter = express.Router();

adminRouter.get('/dashboard', adminProtect, async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalProducts, totalOrders, orders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.find().select('total orderStatus createdAt'),
    ]);
    const totalRevenue = orders.filter(o => o.orderStatus !== 'cancelled').reduce((a, b) => a + (b.total || 0), 0);
    const pendingOrders = orders.filter(o => o.orderStatus === 'placed').length;
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const mo = orders.filter(o => { const dt = new Date(o.createdAt as any); return dt >= start && dt <= end && o.orderStatus !== 'cancelled'; });
      monthlyRevenue.push({ month: d.toLocaleString('default', { month: 'short' }), revenue: mo.reduce((a, b) => a + (b.total || 0), 0), orders: mo.length });
    }
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name phone');
    const lowStockProducts = await Product.find({ stock: { $lt: 10 }, isActive: true }).select('name stock images').limit(10);
    res.json({ success: true, stats: { totalUsers, totalProducts, totalOrders, totalRevenue, pendingOrders }, monthlyRevenue, recentOrders, lowStockProducts });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

adminRouter.get('/users', adminProtect, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query as any;
    const query: any = {};
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    res.json({ success: true, users, total });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── STAFF REPORTS ────────────────────────────────────────────────────────────
export const staffReportsRouter = express.Router();

staffReportsRouter.get('/', adminProtect, async (req: Request, res: Response) => {
  try {
    const { folderId } = req.query;
    const query: any = {};

    if (folderId === 'root' || !folderId) {
      query.folderId = { $in: [null, undefined] };
    } else {
      query.folderId = folderId;
    }

    const reports = await StaffReport.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, reports });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.get('/folders', adminProtect, async (req: Request, res: Response) => {
  try {
    const { parentId, all } = req.query;
    let query: any = {};

    if (all === 'true') {
      // Return all folders for picker
      const folders = await StaffFolder.find().sort({ name: 1 }).lean();
      res.json({ success: true, folders });
      return;
    }

    if (parentId === 'root' || !parentId) {
      query.parentId = null;
    } else {
      query.parentId = parentId;
    }

    const folders = await StaffFolder.find(query).sort({ name: 1 });
    res.json({ success: true, folders });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.post('/folders', adminProtect, async (req: Request, res: Response) => {
  try {
    const { name, parentId, staffName } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Folder name is required' });

    const folder = await StaffFolder.create({
      name,
      parentId: (parentId === 'root' || !parentId) ? null : parentId,
      staffName: staffName || 'Staff'
    });

    res.status(201).json({ success: true, folder });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.patch('/folders/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name required' });
    const folder = await StaffFolder.findByIdAndUpdate(req.params.id, { name: name.trim() }, { new: true });
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    res.json({ success: true, folder });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.delete('/folders/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const folderId = req.params.id;
    // Delete all reports inside this folder (and their ImageKit files)
    const reportsInFolder = await StaffReport.find({ folderId });
    await Promise.allSettled(reportsInFolder.map(r => r.fileId ? getImageKit().deleteFile(r.fileId) : Promise.resolve()));
    await StaffReport.deleteMany({ folderId });
    // Delete sub-folders recursively (shallow — one level deep)
    const subFolders = await StaffFolder.find({ parentId: folderId });
    for (const sub of subFolders) {
      const subReports = await StaffReport.find({ folderId: sub._id });
      await Promise.allSettled(subReports.map(r => r.fileId ? getImageKit().deleteFile(r.fileId) : Promise.resolve()));
      await StaffReport.deleteMany({ folderId: sub._id });
      await StaffFolder.deleteOne({ _id: sub._id });
    }
    await StaffFolder.findByIdAndDelete(folderId);
    res.json({ success: true, message: 'Folder deleted' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.patch('/move', adminProtect, async (req: Request, res: Response) => {
  try {
    const { reportIds, folderIds, targetFolderId } = req.body;
    const actualTarget = (targetFolderId === 'root' || !targetFolderId) ? null : targetFolderId;

    if (reportIds && Array.isArray(reportIds)) {
      await StaffReport.updateMany({ _id: { $in: reportIds } }, { $set: { folderId: actualTarget } });
    }

    if (folderIds && Array.isArray(folderIds)) {
      // Prevent moving a folder into itself
      const moveFolders = folderIds.filter(id => id !== targetFolderId);
      await StaffFolder.updateMany({ _id: { $in: moveFolders } }, { $set: { parentId: actualTarget } });
    }

    res.json({ success: true, message: 'Items moved successfully' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.post('/copy', adminProtect, async (req: Request, res: Response) => {
  try {
    const { reportIds, targetFolderId } = req.body;
    const actualTarget = (targetFolderId === 'root' || !targetFolderId) ? null : targetFolderId;

    if (!reportIds || !Array.isArray(reportIds)) {
      return res.status(400).json({ success: false, message: 'Invalid report IDs' });
    }

    const sourceReports = await StaffReport.find({ _id: { $in: reportIds } });

    const copies = sourceReports.map(r => {
      const obj = r.toObject();
      delete obj._id;
      delete obj.createdAt;
      delete obj.updatedAt;
      return {
        ...obj,
        folderId: actualTarget,
        note: `Copy of ${r._id}`
      };
    });

    await StaffReport.insertMany(copies);

    res.json({ success: true, message: 'Reports copied successfully' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.post('/', adminProtect, upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image' });

    // Upload to ImageKit
    const result = await getImageKit().upload({
      file: req.file.buffer,
      fileName: `staff_${Date.now()}_${req.file.originalname}`,
      folder: '/reteiler/staff-reports',
    });

    const report = await StaffReport.create({
      imageUrl: result.url,
      fileId: result.fileId,
      staffName: req.body.staffName || 'Staff',
      productCode: req.body.productCode,
      folderId: (req.body.folderId === 'root' || !req.body.folderId) ? null : req.body.folderId
    });

    res.status(201).json({ success: true, report });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.patch('/:id', adminProtect, upload.single('image'), async (req: any, res: Response) => {
  try {
    const report = await StaffReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (req.body.productCode !== undefined) {
      report.productCode = req.body.productCode;
    }

    if (req.file) {
      // 1. Delete old image from ImageKit
      if (report.fileId) {
        try {
          await getImageKit().deleteFile(report.fileId);
        } catch (err) {
          console.error('Failed to delete old image:', err);
        }
      }

      // 2. Upload new image
      const result = await getImageKit().upload({
        file: req.file.buffer,
        fileName: `staff_${Date.now()}_${req.file.originalname}`,
        folder: '/reteiler/staff-reports',
      });

      report.imageUrl = result.url;
      report.fileId = result.fileId;
    }

    await report.save();
    res.json({ success: true, report });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.delete('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const report = await StaffReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (report.fileId) {
      try {
        await getImageKit().deleteFile(report.fileId);
      } catch (err) {
        console.error('Failed to delete image from ImageKit:', err);
      }
    }

    await report.deleteOne();
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── STAFF FEEDBACK / CHAT ───
staffReportsRouter.get('/feedback/:folderId', adminProtect, async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const actualFolderId = folderId === 'root' ? null : folderId;
    
    // Fetch messages for this folder, populate report if reference exists
    const messages = await StaffFeedback.find({ folderId: actualFolderId })
      .populate('reportId', 'imageUrl productCode')
      .sort({ createdAt: 1 });
      
    res.json({ success: true, messages });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

staffReportsRouter.post('/feedback', adminProtect, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const { folderId, reportId, message, sender, staffName, audioDuration } = req.body;
    let actualFolderId = folderId;
    if (folderId === 'root' || !folderId || folderId === 'null') actualFolderId = null;
    
    let actualReportId = reportId;
    if (!reportId || reportId === 'null') actualReportId = null;

    let audioUrl = null;
    if (req.file) {
      const uploadRes = await getImageKit().upload({
        file: req.file.buffer,
        fileName: `voice_${Date.now()}.m4a`,
        folder: '/staff-feedback'
      });
      audioUrl = uploadRes.url;
    }

    const feedback = await StaffFeedback.create({
      folderId: actualFolderId,
      reportId: actualReportId,
      message: message || '',
      sender,
      staffName: staffName || 'Staff',
      isRead: false,
      audioUrl,
      audioDuration: audioDuration ? Number(audioDuration) : 0
    });
    
    const populated = await feedback.populate('reportId', 'imageUrl productCode');
    res.status(201).json({ success: true, feedback: populated });
  } catch (err: any) { 
    console.error('Feedback Error:', err);
    res.status(500).json({ success: false, message: `Server Error: ${err.message}` }); 
  }
});

staffReportsRouter.patch('/feedback/read/:folderId', adminProtect, async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const actualFolderId = folderId === 'root' ? null : folderId;
    
    await StaffFeedback.updateMany(
      { folderId: actualFolderId, isRead: false },
      { $set: { isRead: true } }
    );
    
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// DEALS OF THE DAY ROUTER
// ══════════════════════════════════════════════════════════════════════════════
export const dealsRouter = express.Router();

// Public: get active deals (endTime in future, isActive true)
dealsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const deals = await DealOfDay.find({ isActive: true, endTime: { $gt: new Date() } })
      .populate('product', 'name slug images price mrp discount')
      .sort({ endTime: 1 });
    res.json({ success: true, deals });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: get all deals (including expired)
dealsRouter.get('/all', adminProtect, async (req: Request, res: Response) => {
  try {
    const deals = await DealOfDay.find()
      .populate('product', 'name slug images price mrp')
      .sort({ createdAt: -1 });
    res.json({ success: true, deals });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: create deal
dealsRouter.post('/', adminProtect, async (req: Request, res: Response) => {
  try {
    const { productId, discountType, discountValue, endTime } = req.body;
    if (!productId || !discountType || discountValue == null || !endTime)
      return res.status(400).json({ success: false, message: 'Missing required fields' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    let dealPrice: number;
    if (discountType === 'percentage') {
      dealPrice = Math.round(product.price * (1 - discountValue / 100));
    } else {
      dealPrice = Math.round(product.price - discountValue);
    }
    if (dealPrice < 0) dealPrice = 0;

    const deal = await DealOfDay.create({ product: productId, discountType, discountValue, dealPrice, endTime, isActive: true });
    const populated = await deal.populate('product', 'name slug images price mrp');
    res.status(201).json({ success: true, deal: populated });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: update deal
dealsRouter.put('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const { discountType, discountValue, endTime, isActive } = req.body;
    const deal = await DealOfDay.findById(req.params.id).populate('product');
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    if (discountType) deal.discountType = discountType;
    if (discountValue != null) deal.discountValue = discountValue;
    if (endTime) deal.endTime = endTime;
    if (isActive != null) deal.isActive = isActive;

    // Recalculate deal price
    const prod = deal.product as any;
    if (discountType || discountValue != null) {
      const type = deal.discountType;
      const val = deal.discountValue;
      deal.dealPrice = type === 'percentage'
        ? Math.round(prod.price * (1 - val / 100))
        : Math.round(prod.price - val);
      if (deal.dealPrice < 0) deal.dealPrice = 0;
    }

    await deal.save();
    res.json({ success: true, deal });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin: delete deal
dealsRouter.delete('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    await DealOfDay.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deal deleted' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

export default adminRouter;
