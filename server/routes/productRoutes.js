import express from 'express';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import sendEmail from '../utils/sendEmail.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { notifyAllAdmins } from '../utils/notificationEmitter.js';
import variantRoutes from './variantRoutes.js';
import { localCache } from '../utils/cache.js';
import Category, { ensureDefaultCategories, slugifyCategory } from '../models/categoryModel.js';

const router = express.Router();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const validateCategoryPayload = async (body, { required = true } = {}) => {
  if (body.category === undefined && !required) {
    return {};
  }

  const categorySlug = slugifyCategory(body.category);

  if (!categorySlug) {
    return { error: 'Category is required' };
  }

  await ensureDefaultCategories();

  const category = await Category.findOne({ slug: categorySlug });
  if (!category) {
    return { error: 'Please choose a valid product category' };
  }

  body.category = category.slug;
  return { category };
};

const notifyBackInStockSubscribers = async (product) => {
  const waitingList = product.notifyList?.filter((n) => n.status === 'waiting') || [];
  if (!waitingList.length) return;

  for (const entry of waitingList) {
    try {
      await sendEmail({
        to: entry.email,
        subject: `${product.name} is back in stock — AUTOCRAFT`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">Back in Stock</h2>
            <p>The product you asked about is available again.</p>
            <p><strong>${product.name}</strong></p>
            <p><strong>Available stock:</strong> ${product.stock}</p>
            <p style="color:#6b7590;font-size:12px;margin-top:24px;">Visit AUTOCRAFT to place your order before it sells out again.</p>
          </div>
        `,
      });

      entry.status = 'notified';
      entry.notifiedAt = new Date();
    } catch (error) {
      console.log('Back-in-stock email failed:', error.message);
    }
  }

  await product.save();
};

// GET all products with filters + sorting (Cached for 2 minutes)
router.get('/', async (req, res) => {
  try {
    const { category, brand, model, search, sort, page = 1, limit = 12, priceMin, priceMax, ratingMin, inStock } = req.query;

    const cacheKey = `products:list:${JSON.stringify(req.query)}`;
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const query = {};

    if (category) query.category = category;
    if (brand) query.carBrands = { $in: [brand] };
    if (model) query.carModels = { $in: [model] };
    
    if (search) {
      // Use Mongo compound Text index for high-relevance full-text search
      query.$text = { $search: search };
    }

    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin) query.price.$gte = Number(priceMin);
      if (priceMax) query.price.$lte = Number(priceMax);
    }

    if (ratingMin) {
      query.rating = { $gte: Number(ratingMin) };
    }

    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };
    if (sort === 'relevance') {
      if (search) {
        sortOption = { score: { $meta: 'textScore' } };
      } else {
        sortOption = { numReviews: -1 };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    
    let productsQuery = Product.find(query);
    if (search && sort === 'relevance') {
      productsQuery = productsQuery.select({ score: { $meta: 'textScore' } });
    }

    const products = await productsQuery
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const responseData = {
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    };

    localCache.set(cacheKey, responseData, 120); // 2 minutes list cache

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET featured products (Cached for 1 hour)
router.get('/featured', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 12);
    const cacheKey = `products:featured:${limit}`;
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weeklySales = await Order.aggregate([
      {
        $match: {
          status: { $in: ['shipped', 'delivered'] },
          $or: [
            { shippedAt: { $gte: weekAgo } },
            { deliveredAt: { $gte: weekAgo } },
            { updatedAt: { $gte: weekAgo } },
          ],
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          weeklySold: { $sum: '$items.qty' },
        },
      },
      { $sort: { weeklySold: -1 } },
      { $limit: limit },
    ]);

    const soldIds = weeklySales.map((item) => item._id);
    const weeklySoldMap = new Map(weeklySales.map((item) => [String(item._id), item.weeklySold]));

    const soldProducts = soldIds.length
      ? await Product.find({ _id: { $in: soldIds } })
      : [];

    const productMap = new Map(soldProducts.map((p) => [String(p._id), p]));
    let products = soldIds
      .map((id) => productMap.get(String(id)))
      .filter(Boolean)
      .map((product) => ({
        ...product.toObject(),
        weeklySold: weeklySoldMap.get(String(product._id)) || 0,
      }));

    if (products.length < limit) {
      const fallbackProducts = await Product.find({
        _id: { $nin: soldIds },
        stock: { $gt: 0 },
        isFeatured: true,
      })
        .sort({ createdAt: -1 })
        .limit(limit - products.length);

      products = [
        ...products,
        ...fallbackProducts.map((product) => ({
          ...product.toObject(),
          weeklySold: 0,
        })),
      ];
    }

    const responseData = { products };
    localCache.set(cacheKey, responseData, 3600); // 1 hour cache

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single product (Cached for 5 minutes)
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `products:detail:${req.params.id}`;
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const responseData = { product };
    localCache.set(cacheKey, responseData, 300); // 5 minutes cache

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create product (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { error } = await validateCategoryPayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const product = await Product.create(req.body);
    localCache.clearByPrefix('products'); // Invalidate product caches
    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update product (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { error } = await validateCategoryPayload(req.body, { required: false });
    if (error) return res.status(400).json({ message: error });

    const previousProduct = await Product.findById(req.params.id);
    if (!previousProduct) return res.status(404).json({ message: 'Product not found' });

    const previousStock = Number(previousProduct.stock || 0);

    previousProduct.set(req.body);
    const product = await previousProduct.save();

    if (previousStock <= 0 && product.stock > 0) {
      await notifyBackInStockSubscribers(product);
      await notifyAllAdmins({
        type: 'back_in_stock',
        title: `${product.name} Back in Stock`,
        message: `${product.name} is back in stock with ${product.stock} units`,
        relatedData: { productId: product._id },
      });
    }

    const LOW_STOCK_THRESHOLD = 5;
    if (product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD && previousStock > LOW_STOCK_THRESHOLD) {
      await notifyAllAdmins({
        type: 'low_stock',
        title: `Low Stock Alert: ${product.name}`,
        message: `${product.name} stock is low (${product.stock} left)`,
        relatedData: { productId: product._id },
      });
    }

    localCache.clearByPrefix('products'); // Invalidate product caches
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE product (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    localCache.clearByPrefix('products'); // Invalidate product caches
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST notify me
router.post('/:id/notify', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.stock > 0 && !product.isOutOfStock) {
      return res.status(400).json({ message: 'This product is already in stock' });
    }

    const alreadyWaiting = product.notifyList.some(
      (entry) => entry.email === email && entry.status === 'waiting'
    );

    if (alreadyWaiting) {
      return res.json({ message: 'You are already on the notify list for this product' });
    }

    product.notifyList.push({ email, requestedAt: new Date(), status: 'waiting' });
    await product.save();

    try {
      await sendEmail({
        to: email,
        subject: `Notify request received — AUTOCRAFT`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">Notify Request Received</h2>
            <p>We will email you when this product is back in stock.</p>
            <p><strong>${product.name}</strong></p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.log('Notify confirmation email failed:', emailErr.message);
    }

    res.status(201).json({ message: 'We will notify you when this product is back in stock' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST add review (logged in customers)
router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      status: 'delivered',
      'items.product': product._id,
    }).sort({ deliveredAt: -1, updatedAt: -1 });

    if (!deliveredOrder) {
      return res.status(403).json({ message: 'Only delivered verified purchases can be reviewed' });
    }

    product.reviews.push({
      user:             req.user._id,
      name:             req.user.name,
      rating:           Number(rating),
      comment,
      verifiedPurchase: true,
      order:            deliveredOrder._id,
    });

    product.numReviews = product.reviews.length;
    product.rating     = product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length;

    await product.save();
    localCache.clearByPrefix('products'); // Invalidate product caches on new reviews
    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.use('/:productId/variants', variantRoutes);

export default router;
