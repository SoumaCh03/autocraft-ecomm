import Product from '../models/productModel.js';
import Coupon from '../models/couponModel.js';
import Order from '../models/orderModel.js';

/**
 * Deducts inventory atomically for a given order.
 * Safe against race conditions using findOneAndUpdate with stock validation.
 * @param {Object} order 
 */
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
    // Rollback any deducted inventory on failure
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

/**
 * Self-cleaning lease logic to release inventory reserved for unpaid, expired pending Razorpay orders.
 * Reverts inventory levels and cancels the order documents.
 */
export const releaseExpiredPendingOrders = async () => {
  try {
    const expirationTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes expiration window
    const expiredOrders = await Order.find({
      paymentMethod: 'razorpay',
      isPaid: false,
      status: 'pending',
      inventoryDeducted: true,
      createdAt: { $lt: expirationTime }
    });

    if (expiredOrders.length === 0) return;

    console.log(`[Inventory Lease] Found ${expiredOrders.length} expired pending orders. Releasing stock...`);

    for (const order of expiredOrders) {
      console.log(`[Inventory Lease] Releasing stock for order ${order._id}`);
      
      for (const item of order.items) {
        const qty = Number(item.qty || 1);
        const product = await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: { stock: qty, soldCount: -qty },
            $pull: { salesHistory: { order: order._id } }
          },
          { new: true }
        );

        if (product && product.stock > 0 && product.isOutOfStock) {
          product.isOutOfStock = false;
          await product.save();
        }
      }

      if (order.coupon?.code && Number(order.discountPrice || 0) > 0) {
        await Coupon.findOneAndUpdate(
          { code: order.coupon.code },
          {
            $inc: {
              usedCount: -1,
              revenueImpact: -Number(order.discountPrice || 0),
            }
          }
        );
      }

      order.status = 'cancelled';
      order.inventoryDeducted = false;
      await order.save();
    }

    console.log('[Inventory Lease] Release cycle complete.');
  } catch (error) {
    console.error('CRITICAL [Inventory Lease] Release failed:', error.message);
  }
};
