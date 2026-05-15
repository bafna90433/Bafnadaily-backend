import { Router } from 'express';
import { Product } from '../models/Product';

const router = Router();

const IK_BASE = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/rishii';
const SITE_URL = 'https://bafnadaily.com';

function ikUrl(path: string, tr = 'w-800,q-80') {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${IK_BASE}/${path.replace(/^\//, '')}?tr=${tr}`;
}

function escCsv(val: any): string {
  const s = String(val ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

// ── GET /api/feed/facebook  (also /facebook.csv) → CSV feed for Facebook Commerce Manager ──
router.get(['/facebook', '/facebook.csv'], async (_req: any, res: any) => {
  try {
    const products = await Product.find({ isActive: true, isDeleted: false, stock: { $gt: 0 } })
      .populate('category', 'name')
      .lean();

    const headers = [
      'id', 'title', 'description', 'availability', 'condition',
      'price', 'link', 'image_link',
      'additional_image_link[0]', 'additional_image_link[1]', 'additional_image_link[2]',
      'brand', 'google_product_category', 'product_type',
      'sale_price', 'quantity_to_sell_on_facebook',
      'gtin', 'mpn'
    ];

    const rows = products.map((p: any) => {
      const mainImage = ikUrl(p.images?.[0]?.url || '');
      const img1 = ikUrl(p.images?.[1]?.url || '');
      const img2 = ikUrl(p.images?.[2]?.url || '');
      const img3 = ikUrl(p.images?.[3]?.url || '');

      const categoryName: string = p.category?.name || 'Accessories';
      const productUrl = `${SITE_URL}/product/${p.slug}`;

      // Map to approximate Google category
      const gcatMap: Record<string, string> = {
        'keychains': 'Apparel & Accessories > Jewelry > Charms & Charm Bracelets',
        'jewellery': 'Apparel & Accessories > Jewelry',
        'accessories': 'Apparel & Accessories',
        'gifts': 'Arts & Entertainment > Party & Celebration',
        'fashion': 'Apparel & Accessories',
        'beauty': 'Health & Beauty',
        'men': 'Apparel & Accessories > Clothing',
        'women': 'Apparel & Accessories > Clothing',
        'toys': 'Toys & Games',
        'plush': 'Toys & Games > Stuffed Animals',
        'kids': 'Toys & Games',
        'home': 'Home & Garden',
        'bags': 'Apparel & Accessories > Handbags, Wallets & Cases',
        'wallet': 'Apparel & Accessories > Handbags, Wallets & Cases',
      };
      const catLower = categoryName.toLowerCase();
      const gcat = Object.entries(gcatMap).find(([k]) => catLower.includes(k))?.[1]
        || 'Apparel & Accessories';

      const cols = [
        p._id.toString(),                          // id
        p.name,                                    // title
        p.shortDescription || p.description?.substring(0, 200) || p.name, // description
        'in stock',                                // availability
        'new',                                     // condition
        `${Number(p.mrp).toFixed(2)} INR`,             // price (original/MRP)
        productUrl,                                  // link
        mainImage,                                   // image_link
        img1, img2, img3,                            // additional_image_link[0..2]
        'Bafnadaily',                                // brand
        gcat,                                        // google_product_category
        categoryName,                                // product_type
        `${Number(p.price).toFixed(2)} INR`,         // sale_price
        Math.min(p.stock, 9999),                     // quantity_to_sell_on_facebook
        p.barcode || '',                             // gtin
        p.sku || '',                                 // mpn
      ];

      return cols.map(escCsv).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Facebook will cache hourly
    res.send(csv);
  } catch (err: any) {
    console.error('[Feed] Error generating Facebook feed:', err);
    res.status(500).json({ success: false, message: 'Feed generation failed' });
  }
});

// ── GET /api/feed/info  → returns the public feed URL (for frontend "Copy" btn) ─
router.get('/info', (_req: any, res: any) => {
  const backendUrl = process.env.BACKEND_URL || 'https://api.bafnadaily.com';
  res.json({
    success: true,
    feedUrl: `${backendUrl}/api/feed/facebook.csv`,
    instructions: 'Paste this URL in Facebook Commerce Manager → Catalogue → Add Products → Use a URL or Google Sheets',
  });
});

export default router;
