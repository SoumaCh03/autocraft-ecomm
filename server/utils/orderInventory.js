import Product from '../models/productModel.js';
import Coupon from '../models/couponModel.js';

export const deductInventoryForOrder = async (order) => {
  if (order.inventoryDeducted) return;

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error(`Product not found: ${item.name}`);
    if (product.stock < item.qty) {
      throw new Error(`Only ${product.stock} units available for ${item.name}`);
    }
  }

  const deducted = [];

  try {
    for (const item of order.items) {
      const qty = Number(item.qty || 1);
      const product = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: qty } },
        {
          $inc: { stock: -qty, soldCount: qty },
          $push: {
            salesHistory: {
              order: order._id,
              qty,
              soldAt: new Date(),
            },
          },
        },
        { new: true, runValidators: true }
      );

      if (!product) {
        const latest = await Product.findById(item.product);
        throw new Error(`Only ${latest?.stock ?? 0} units available for ${item.name}`);
      }

      if (product.stock <= 0 && !product.isOutOfStock) {
        product.isOutOfStock = true;
        await product.save();
      }

      deducted.push({ productId: item.product, qty });
    }
  } catch (error) {
    for (const item of deducted) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.qty, soldCount: -item.qty },
        $pull: { salesHistory: { order: order._id } },
      });
    }
    throw error;
  }

  order.inventoryDeducted = true;
  order.inventoryDeductedAt = new Date();

  if (order.coupon?.code && Number(order.discountPrice || 0) > 0) {
    await Coupon.findOneAndUpdate(
      { code: order.coupon.code },
      {
        $inc: {
          usedCount: 1,
          revenueImpact: Number(order.discountPrice || 0),
        },
      }
    );
  }
};
