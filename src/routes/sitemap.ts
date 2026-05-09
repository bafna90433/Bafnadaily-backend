import express, { Request, Response } from 'express';
import { Product, Category } from '../models/Product';

const router = express.Router();

router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const frontendUrl = (process.env.FRONTEND_URL || 'https://bafnadaily.com').split(',')[0];
    const products = await Product.find({ isActive: true, isDeleted: false }).select('slug updatedAt');
    const categories = await Category.find({ isActive: true }).select('slug updatedAt');

    const urls = [
      { loc: `${frontendUrl}/`, lastmod: new Date().toISOString().split('T')[0], priority: '1.0' },
      { loc: `${frontendUrl}/products`, lastmod: new Date().toISOString().split('T')[0], priority: '0.8' },
      ...categories.map(c => ({
        loc: `${frontendUrl}/category/${c.slug}`,
        lastmod: (c as any).updatedAt.toISOString().split('T')[0],
        priority: '0.7'
      })),
      ...products.map(p => ({
        loc: `${frontendUrl}/product/${p.slug}`,
        lastmod: (p as any).updatedAt.toISOString().split('T')[0],
        priority: '0.6'
      }))
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <priority>${url.priority}</priority>
  </url>`).join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err: any) {
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
