import { create } from "zustand";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const API = `${API_BASE_URL}/cart`;

// Reads User ID from AsyncStorage
const getCustomerId = async () => {
  return await AsyncStorage.getItem("userId") ?? null;
};

const normalizeProductId = (product: any) => {
  return String(product.productId || product.productCode || product.id || '').trim();
};

interface CartItem {
  id?: string;
  customerId: string;
  productId: string;
  stockId: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  qty: number;
}

interface CartStore {
  items: CartItem[];
  fetchItems: () => Promise<void>;
  addItem: (product: any, delta?: number) => Promise<void>;
  removeItem: (firestoreId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  fetchItems: async () => {
    const customerId = await getCustomerId();
    if (!customerId) return;
    try {
      const res = await fetch(`${API}/${customerId}`);
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      set({ items: data });
    } catch (err) {
      console.error("fetchItems error:", err);
    }
  },

  addItem: async (product: any, delta = 1) => {
    const customerId = await getCustomerId();
    if (!customerId) return console.error("No customerId found");

    const productId = normalizeProductId(product);
    if (!productId) return console.error("Invalid product identifier");

    const existing = get().items.find((i) => String(i.productId) === productId);

    if (existing) {
      const newQty   = existing.qty + delta;
      const stockKey = existing.stockId || product.stockId || product.productCode || product.productId || product.id || "";

      set((state) => ({
        items: state.items
          .map((i) =>
            String(i.productId) === productId
              ? { ...i, qty: Math.max(0, newQty), category: i.category || product.category || '' }
              : i
          )
          .filter((i) => i.qty > 0),
      }));

      try {
        if (newQty <= 0) {
          await fetch(`${API}/${existing.id}`, { method: "DELETE" });
        } else {
          await fetch(`${API}/${existing.id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ qty: newQty }),
          });
        }

        if (delta > 0) {
          await fetch(
            `${API.replace('/cart', '/products')}/${encodeURIComponent(stockKey)}/decrement-stock`,
            {
              method:  'PUT',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ quantity: delta }),
            }
          );
        } else if (delta < 0) {
          await fetch(
            `${API.replace('/cart', '/products')}/${encodeURIComponent(stockKey)}/increment-stock`,
            {
              method:  'PUT',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ quantity: Math.abs(delta) }),
            }
          );
        }
      } catch (err) {
        console.error("updateQty stock error:", err);
        get().fetchItems(); // Retry fetching the latest items
      }

      return;
    }

    const newItem = {
      customerId,
      productId,
      stockId:  product.stockId || product.productCode || product.productId || product.id || "",
      name:     product.name,
      price:    product.retailPrice ?? product.price,
      imageUrl: product.imageUrl ?? "",
      category: product.category || '',
      qty:      1,
    };

    try {
      const res = await fetch(API, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(newItem),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const saved = await res.json();
      set((state) => ({ items: [...state.items, saved] }));
    } catch (err) {
      console.error("addItem error:", err);
    }
  },

  removeItem: async (firestoreId: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== firestoreId),
    }));

    try {
      await fetch(`${API}/${firestoreId}`, { method: "DELETE" });
    } catch (err) {
      console.error("removeItem error:", err);
      get().fetchItems();
    }
  },

  clearCart: async () => {
    const customerId = await getCustomerId();
    if (!customerId) return console.error("No customerId found");

    set({ items: [] });

    try {
      await fetch(`${API}/clear/${customerId}`, { method: "DELETE" });
    } catch (err) {
      console.error("clearCart error:", err);
      get().fetchItems();
    }
  },

  getTotal: () =>
    get().items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.qty || 0),
      0
    ),
}));
