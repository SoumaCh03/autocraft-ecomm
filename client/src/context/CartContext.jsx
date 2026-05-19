import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('autocraft-cart')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('autocraft-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, qty = 1, selectedVariant = null) => {
    if (!product || product.isOutOfStock || Number(product.stock || 0) <= 0) return false;

    const safeQty = Math.max(1, Math.min(Number(qty || 1), Number(product.stock || 1)));
    const variantStock = selectedVariant ? Number(selectedVariant.stock || 0) : Number(product.stock || 1);

    if (variantStock <= 0) return false;
    const safeLimitedQty = Math.max(1, Math.min(safeQty, variantStock));

    setCartItems(prev => {
      const cartKey = selectedVariant ? `${product._id}-${selectedVariant._id}` : product._id;
      const exists = prev.find(i => {
        if (selectedVariant) {
          return i._id === product._id && i.selectedVariant?._id === selectedVariant._id;
        }
        return i._id === product._id && !i.selectedVariant;
      });

      if (exists) {
        const nextQty = Math.min(variantStock, exists.qty + safeLimitedQty);
        return prev.map(i =>
          i === exists
            ? { ...i, ...product, qty: nextQty, selectedVariant }
            : i
        );
      }

      return [...prev, { ...product, qty: safeLimitedQty, selectedVariant }];
    });

    return true;
  };

  const removeFromCart = (id, variantId = null) => setCartItems(prev =>
    prev.filter(i => {
      if (variantId) {
        return !(i._id === id && i.selectedVariant?._id === variantId);
      }
      return !(i._id === id && !i.selectedVariant);
    })
  );

  const updateQty = (id, qty, variantId = null) => {
    if (qty < 1) return removeFromCart(id, variantId);

    setCartItems(prev => prev.map(i => {
      const isMatch = variantId
        ? i._id === id && i.selectedVariant?._id === variantId
        : i._id === id && !i.selectedVariant;

      if (!isMatch) return i;
      const maxStock = Number(i.stock || qty);
      return { ...i, qty: Math.min(Number(qty), maxStock) };
    }));
  };

  const clearCart = () => setCartItems([]);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
