import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import Coupon from '../models/couponModel.js';
import Category from '../models/categoryModel.js';

/**
 * Optimistic Concurrency Control (OCC) Middleware
 * Validates that the client's expected entity version matches the server's current version.
 * If they do not match, blocks the update and returns a 409 Conflict containing the current server state.
 */
export const validateEntityVersion = (modelName) => {
  return async (req, res, next) => {
    try {
      // OCC is only applicable to mutation operations (PUT/PATCH)
      if (req.method !== 'PUT' && req.method !== 'PATCH') {
        return next();
      }

      const clientVersionHeader = req.headers['x-entity-version'];
      if (!clientVersionHeader) {
        // If no version header is provided (e.g., legacy operations, user-facing client purchases, reviews),
        // let it pass to maintain backward compatibility.
        return next();
      }

      const clientVersion = parseInt(clientVersionHeader, 10);
      if (isNaN(clientVersion)) {
        return res.status(400).json({ message: 'Invalid X-Entity-Version header value' });
      }

      const { id } = req.params;
      if (!id) {
        return next();
      }

      let Model;
      if (modelName === 'Product') Model = Product;
      else if (modelName === 'Order') Model = Order;
      else if (modelName === 'Coupon') Model = Coupon;
      else if (modelName === 'Category') Model = Category;
      else return next();

      const document = await Model.findById(id);
      if (!document) {
        return res.status(404).json({ message: `${modelName} not found` });
      }

      const serverVersion = document.entityVersion?.version || 1;

      if (serverVersion !== clientVersion) {
        console.warn(`[OCC Conflict] Concurrency conflict detected on ${modelName} [${id}]. Client expected: ${clientVersion}, Server has: ${serverVersion}`);
        
        return res.status(409).json({
          conflict: true,
          message: 'Conflict: The entity has been modified by another administrator or session. Please reconcile your changes.',
          entityType: modelName,
          entityId: id,
          serverVersion,
          clientVersion,
          serverState: document
        });
      }

      // Optimisation: place prefetched document in request context
      req.prefetchedDoc = document;
      next();
    } catch (err) {
      console.error('[OCC Middleware ERROR]:', err);
      res.status(500).json({ message: 'Internal server error during concurrency validation' });
    }
  };
};
