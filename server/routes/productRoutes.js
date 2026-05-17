import express from 'express';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import sendEmail from '../utils/sendEmail.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

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

// GET all products with filters + sorting
router.get('/', async (req, res) => {
  try {
    const { category, brand, model, search, sort, page = 1, limit = 12 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (brand)    query.carBrands = { $in: [brand] };
    if (model)    query.carModels = { $in: [model] };
    if (search)   query.name = { $regex: search, $options: 'i' };

    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc')  sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'rating')     sortOption = { rating: -1 };
    if (sort === 'relevance')  sortOption = { numReviews: -1 };

    const skip     = (Number(page) - 1) * Number(limit);
    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      products,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET featured products by weekly sales first, then admin-curated featured fallback
router.get('/featured', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 12);
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

    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create product (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update product (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const previousProduct = await Product.findById(req.params.id);
    if (!previousProduct) return res.status(404).json({ message: 'Product not found' });

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (previousProduct.stock <= 0 && product.stock > 0) {
      await notifyBackInStockSubscribers(product);
    }

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

    product.reviews.push({
      user:    req.user._id,
      name:    req.user.name,
      rating:  Number(rating),
      comment,
    });

    product.numReviews = product.reviews.length;
    product.rating     = product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
