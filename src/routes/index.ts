import express, { Request, Response } from 'express';
import javascriptBarcodeReader from 'javascript-barcode-reader';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Product';
import { InventoryLog } from '../models/InventoryLog';
import { Order, Cart, Wishlist, Banner, Coupon } from '../models/Order';
import { User } from '../models/User';
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
    const { category, search, minPrice, maxPrice, sort, page = 1, limit = 20, featured, trending, newArrival, bestSeller, tag } = req.query as any;
    const query: any = { isActive: true };
    
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category = category;
      } else {
        // Find category by name if it's not a valid ObjectId
        const foundCat = await Category.findOne({ name: new RegExp(`^${category}$`, 'i'), isActive: true });
        if (foundCat) {
          query.category = foundCat._id;
        } else {
          // If category name not found, return empty results early or search for non-existent ID
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
      if (search.match(/^[a-zA-Z0-9]+$/)) {
        // If search looks like a barcode or SKU, prioritize exact match
        query.$or = [
          { barcode: search },
          { sku: search },
          { name: { $regex: search, $options: 'i' } }
        ];
      } else {
        // Otherwise use traditional name search
        query.name = { $regex: search, $options: 'i' };
      }
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

productsRouter.put('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, product });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

productsRouter.delete('/:id', adminProtect, async (req: Request, res: Response) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

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

productsRouter.get('/inventory/logs/:productId', adminProtect, async (req: Request, res: Response) => {
  try {
    const logs = await InventoryLog.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, logs });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
export const categoriesRouter = express.Router();

categoriesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { featured } = req.query as any;
    const query: any = { isActive: true, parent: null };
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
      statusHistory: [{ status: 'placed', note: 'Order placed', updatedAt: new Date() }],
    });
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    // Update user stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalOrders: 1, totalSpent: total } });
    res.status(201).json({ success: true, order });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

ordersRouter.get('/my', protect, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
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
    const { status, note, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    order.orderStatus = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    order.statusHistory.push({ status, note, updatedAt: new Date() });
    await order.save();
    res.json({ success: true, order });
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
    const { type } = req.query as any;
    const query: any = { isActive: true };
    if (type) query.type = type;
    const banners = await Banner.find(query).sort({ sortOrder: 1 });
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

export default adminRouter;
