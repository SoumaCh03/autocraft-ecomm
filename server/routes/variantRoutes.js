import express from 'express';
import Product from '../models/productModel.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, sku, stock, price, mrp, discount, images } = req.body;

    if (!productId || !name || stock === undefined) {
      return res.status(400).json({ message: 'Missing required variant fields' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!product.variants) product.variants = [];

    const newVariant = {
      name: name.trim(),
      sku: sku ? sku.trim() : '',
      stock: Math.max(0, Number(stock)),
      price: price ? Number(price) : product.price,
      mrp: mrp ? Number(mrp) : product.mrp,
      discount: discount ? Math.max(0, Math.min(100, Number(discount))) : 0,
      images: images && Array.isArray(images) ? images : [],
      available: true,
    };

    product.variants.push(newVariant);
    await product.save();

    res.status(201).json({
      message: 'Variant added successfully',
      variant: product.variants[product.variants.length - 1],
      product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:variantId', protect, adminOnly, async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { name, sku, stock, price, mrp, discount, images } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: 'Variant not found' });

    if (name) variant.name = name.trim();
    if (sku) variant.sku = sku.trim();
    if (stock !== undefined) variant.stock = Math.max(0, Number(stock));
    if (price !== undefined) variant.price = Number(price);
    if (mrp !== undefined) variant.mrp = Number(mrp);
    if (discount !== undefined) variant.discount = Math.max(0, Math.min(100, Number(discount)));
    if (images && Array.isArray(images)) variant.images = images;

    await product.save();

    res.json({
      message: 'Variant updated successfully',
      variant,
      product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:variantId', protect, adminOnly, async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: 'Variant not found' });

    variant.deleteOne();
    await product.save();

    res.json({
      message: 'Variant deleted successfully',
      product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
