import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Phase 1 cart: in memory only, so the nav badge has something real to count.
 *
 * Deliberately not persisted. Phase 2 moves this to a `cart_items` table for
 * signed-in users with a localStorage fallback for guests, merging the two on
 * login — persisting now in a shape that will not survive that change would
 * only have to be unpicked.
 *
 * Prices are paise, and are read back from the server at checkout. Nothing a
 * cart in the browser says about a price is ever trusted.
 */
export interface CartItem {
  programmeId: string;
  slug: string;
  title: string;
  pricePaise: number;
}

interface CartValue {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  remove: (programmeId: string) => void;
  clear: () => void;
  has: (programmeId: string) => boolean;
}

const CartContext = createContext<CartValue | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // A programme is a single enrolment, so quantity is always one — adding
  // twice is a no-op rather than a second seat.
  const add = useCallback((item: CartItem) => {
    setItems(prev => (prev.some(i => i.programmeId === item.programmeId) ? prev : [...prev, item]));
  }, []);

  const remove = useCallback((programmeId: string) => {
    setItems(prev => prev.filter(i => i.programmeId !== programmeId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => ({
    items,
    count: items.length,
    add,
    remove,
    clear,
    has: (programmeId: string) => items.some(i => i.programmeId === programmeId),
  }), [items, add, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
