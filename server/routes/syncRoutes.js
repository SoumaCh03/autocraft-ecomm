import express from 'express';
import mongoose from 'mongoose';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Coupon from '../models/couponModel.js';
import Category, { ensureDefaultCategories, slugifyCategory } from '../models/categoryModel.js';
import { logAdminActivity } from '../utils/auditLogger.js';

const router = express.Router();

router.post('/replay', protect, adminOnly, async (req, res) => {
  try {
    const { operations } = req.body;
    if (!Array.isArray(operations)) {
      return res.status(400).json({ message: 'Operations must be an array' });
    }

    const results = [];

    // Process operations sequentially to maintain chronological integrity
    for (const op of operations) {
      const { id, entity, entityId, operationType, payload, expectedVersion, timestamp } = op;
      
      try {
        let Model;
        if (entity === 'Product') Model = Product;
        else if (entity === 'Order') Model = Order;
        else if (entity === 'Coupon') Model = Coupon;
        else if (entity === 'Category') Model = Category;
        else {
          results.push({ id, status: 'failed', errorMessage: `Unknown entity type: ${entity}` });
          continue;
        }

        // 1. CREATE Operation
        if (operationType === 'CREATE') {
          if (entity === 'Category') {
            const slug = slugifyCategory(payload.slug || payload.name);
            const exists = await Category.findOne({ slug });
            if (exists) {
              results.push({ id, status: 'failed', errorMessage: 'Category already exists' });
              continue;
            }
          } else if (entity === 'Coupon') {
            const code = String(payload.code || '').trim().toUpperCase();
            const exists = await Coupon.findOne({ code });
            if (exists) {
              results.push({ id, status: 'failed', errorMessage: 'Coupon already exists' });
              continue;
            }
          }

          // Create new document
          const doc = new Model(payload);
          doc.entityVersion = {
            version: 1,
            lastModifiedTime: new Date(timestamp || Date.now()),
            lastModifiedBy: req.user._id.toString(),
            updateToken: new mongoose.Types.ObjectId().toString()
          };
          await doc.save();

          await logAdminActivity(req, {
            action: `SYNC_CREATE_${entity.toUpperCase()}`,
            targetType: entity.toLowerCase(),
            targetId: doc._id.toString(),
            details: `Synchronized creation of ${entity} "${doc.name || doc.code || doc._id}" via offline sync queue`
          });

          results.push({ id, status: 'synced', entityId: doc._id.toString(), version: doc.entityVersion.version, serverState: doc });
          continue;
        }

        // For UPDATE and DELETE, entityId is mandatory
        if (!entityId) {
          results.push({ id, status: 'failed', errorMessage: 'Entity ID is required for mutations' });
          continue;
        }

        const doc = await Model.findById(entityId);
        if (!doc) {
          results.push({ id, status: 'failed', errorMessage: `${entity} not found` });
          continue;
        }

        // 2. Optimistic Concurrency Control (OCC) Check
        const serverVersion = doc.entityVersion?.version || 1;
        if (expectedVersion !== undefined && serverVersion !== expectedVersion) {
          results.push({
            id,
            status: 'conflict',
            serverVersion,
            clientVersion: expectedVersion,
            serverState: doc,
            errorMessage: 'OCC Conflict: Entity has been modified on server by another user'
          });
          continue;
        }

        // 3. DELETE Operation
        if (operationType === 'DELETE') {
          if (entity === 'Category') {
            const productCount = await Product.countDocuments({ category: doc.slug });
            if (productCount > 0) {
              results.push({ id, status: 'failed', errorMessage: `Category contains ${productCount} products and cannot be deleted.` });
              continue;
            }
          }

          await doc.deleteOne();

          await logAdminActivity(req, {
            action: `SYNC_DELETE_${entity.toUpperCase()}`,
            targetType: entity.toLowerCase(),
            targetId: entityId,
            details: `Synchronized deletion of ${entity} "${doc.name || doc.code || entityId}" via offline sync queue`
          });

          results.push({ id, status: 'synced', entityId, deleted: true });
          continue;
        }

        // 4. UPDATE Operation
        if (operationType === 'UPDATE') {
          doc.set(payload);

          if (doc.entityVersion) {
            doc.entityVersion.lastModifiedBy = req.user._id.toString();
          }

          await doc.save();

          await logAdminActivity(req, {
            action: `SYNC_UPDATE_${entity.toUpperCase()}`,
            targetType: entity.toLowerCase(),
            targetId: doc._id.toString(),
            details: `Synchronized update of ${entity} "${doc.name || doc.code || doc._id}" via offline sync queue`
          });

          results.push({ id, status: 'synced', entityId: doc._id.toString(), version: doc.entityVersion.version, serverState: doc });
        }

      } catch (err) {
        console.error(`Error replaying operation ${id}:`, err);
        results.push({ id, status: 'failed', errorMessage: err.message || 'Server error' });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Sync replay failed' });
  }
});

export default router;
