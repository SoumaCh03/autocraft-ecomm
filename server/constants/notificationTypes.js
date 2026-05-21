export const NOTIFICATION_TYPES = {
  // Customer notifications
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  RETURN_APPROVED: 'return_approved',
  RETURN_REJECTED: 'return_rejected',
  REFUNDED: 'refunded',
  BACK_IN_STOCK: 'back_in_stock',

  // Admin notifications
  NEW_ORDER: 'new_order',
  LOW_STOCK: 'low_stock',
  RETURN_REQUEST: 'return_request',
  COUPON_EXPIRY: 'coupon_expiry'
};

export const NOTIFICATION_ROUTES = {
  [NOTIFICATION_TYPES.NEW_ORDER]: { room: 'admin', roles: ['admin'] },
  [NOTIFICATION_TYPES.LOW_STOCK]: { room: 'admin', roles: ['admin'] },
  [NOTIFICATION_TYPES.RETURN_REQUEST]: { room: 'admin', roles: ['admin'] },
  [NOTIFICATION_TYPES.COUPON_EXPIRY]: { room: 'admin', roles: ['admin'] },
  [NOTIFICATION_TYPES.ORDER_SHIPPED]: { room: 'customer', roles: ['customer'] },
  [NOTIFICATION_TYPES.ORDER_DELIVERED]: { room: 'customer', roles: ['customer'] },
  [NOTIFICATION_TYPES.RETURN_APPROVED]: { room: 'customer', roles: ['customer'] },
  [NOTIFICATION_TYPES.RETURN_REJECTED]: { room: 'customer', roles: ['customer'] },
  [NOTIFICATION_TYPES.REFUNDED]: { room: 'customer', roles: ['customer'] },
  [NOTIFICATION_TYPES.BACK_IN_STOCK]: { room: 'customer', roles: ['customer'] }
};
