import express from 'express';
import Product from '../models/productModel.js';

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
  try {
    // We assume the frontend URL is the base domain
    const baseUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : 'https://autocraft.in';

    // Get all products to include in the sitemap
    // Only select the necessary fields to optimize DB query
    const products = await Product.find({}).select('_id updatedAt').lean();

    // Static Routes
    const staticRoutes = [
      '/',
      '/shop',
      '/login',
      '/register',
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add Static Routes
    staticRoutes.forEach((route) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}${route}</loc>\n`;
      sitemap += `    <changefreq>daily</changefreq>\n`;
      sitemap += `    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n`;
      sitemap += `  </url>\n`;
    });

    // Add Product Routes
    products.forEach((product) => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/product/${product._id}</loc>\n`;
      // Use the product's updatedAt if available, else current date
      const lastMod = product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString();
      sitemap += `    <lastmod>${lastMod}</lastmod>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `    <priority>0.7</priority>\n`;
      sitemap += `  </url>\n`;
    });

    sitemap += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ message: 'Internal server error while generating sitemap' });
  }
});

export default router;
