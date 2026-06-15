import express from 'express';
import Category, { ensureDefaultCategories, slugifyCategory } from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { localCache } from '../utils/cache.js';
import { logAdminActivity } from '../utils/auditLogger.js';
import { validateEntityVersion } from '../middleware/concurrencyMiddleware.js';

const router = express.Router();

const categorySort = { sortOrder: 1, name: 1 };

const normalizeCategory = (body) => {
  const name = String(body.name || '').trim();
  const slug = slugifyCategory(body.slug || name);

  return {
    name,
    slug,
    description: String(body.description || '').trim(),
    icon: String(body.icon || 'AC').trim() || 'AC',
    sortOrder: Number(body.sortOrder || 100),
  };
};

const getProductCountsByCategory = async () => {
  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  return new Map(counts.map((row) => [row._id, row.count]));
};

router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    await ensureDefaultCategories();

    const categories = await Category.find().sort(categorySort);
    const productCounts = await getProductCountsByCategory();

    res.json({
      categories: categories.map((category) => ({
        ...category.toObject(),
        productCount: productCounts.get(category.slug) || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const cacheKey = 'categories:public';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    await ensureDefaultCategories();

    const categories = await Category.find().sort(categorySort);
    const responseData = { categories };

    localCache.set(cacheKey, responseData, 300);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    await ensureDefaultCategories();

    const payload = normalizeCategory(req.body);
    if (!payload.name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    if (!payload.slug) {
      return res.status(400).json({ message: 'Category slug is required' });
    }

    const category = await Category.create(payload);
    await logAdminActivity(req, {
      action: 'ADD_CATEGORY',
      targetType: 'category',
      targetId: category._id.toString(),
      details: `Created product category "${category.name}"`
    });
    localCache.clearByPrefix('categories');

    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A category with this name or slug already exists' });
    }

    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, validateEntityVersion('Category'), async (req, res) => {
  try {
    const payload = normalizeCategory(req.body);
    delete payload.slug;

    if (!payload.name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.set(payload);
    if (category.entityVersion) {
      category.entityVersion.lastModifiedBy = req.user ? req.user._id.toString() : 'system';
    }
    await category.save();

    await logAdminActivity(req, {
      action: 'EDIT_CATEGORY',
      targetType: 'category',
      targetId: category._id.toString(),
      details: `Updated category "${category.name}" details`
    });

    localCache.clearByPrefix('categories');
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const productCount = await Product.countDocuments({ category: category.slug });
    if (productCount > 0) {
      return res.status(409).json({
        message: `Cannot delete "${category.name}" because ${productCount} product(s) still use it. Move those products first.`,
      });
    }

    await category.deleteOne();
    await logAdminActivity(req, {
      action: 'DELETE_CATEGORY',
      targetType: 'category',
      targetId: category._id.toString(),
      details: `Deleted product category "${category.name}"`
    });
    localCache.clearByPrefix('categories');

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
