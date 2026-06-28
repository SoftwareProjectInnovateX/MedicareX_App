import { create } from "zustand";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../services/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

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
      const cartRef = collection(db, 'users', customerId, 'cart');
      const snap = await getDocs(cartRef);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CartItem));
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
      const newQty = existing.qty + delta;
      
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
        const itemRef = doc(db, 'users', customerId, 'cart', existing.id!);
        if (newQty <= 0) {
          await deleteDoc(itemRef);
        } else {
          await setDoc(itemRef, { qty: newQty }, { merge: true });
        }
      } catch (err) {
        console.error("updateQty error:", err);
        get().fetchItems();
      }
      return;
    }

    const initialQty = delta > 0 ? delta : 1;
    const tempId = "temp-" + Date.now();

    const newItem = {
      id: tempId,
      customerId,
      productId,
      stockId: product.stockId || product.productCode || product.productId || product.id || "",
      name: product.name || product.productName || 'Unknown Product',
      price: product.retailPrice ?? product.price ?? 0,
      imageUrl: product.imageUrl ?? "",
      category: product.category || '',
      qty: initialQty,
    };

    set((state) => ({ items: [...state.items, newItem] }));

    try {
      const itemRef = doc(db, 'users', customerId, 'cart', productId);
      const finalItem = { ...newItem, id: productId };
      await setDoc(itemRef, finalItem);
      set((state) => ({ 
        items: state.items.map(i => i.id === tempId ? finalItem : i) 
      }));
    } catch (err) {
      console.error("addItem error:", err);
      set((state) => ({ items: state.items.filter(i => i.id !== tempId) }));
    }
  },

  removeItem: async (firestoreId: string) => {
    const customerId = await getCustomerId();
    set((state) => ({
      items: state.items.filter((i) => i.id !== firestoreId),
    }));

    if (customerId) {
      try {
        await deleteDoc(doc(db, 'users', customerId, 'cart', firestoreId));
      } catch (err) {
        console.error("removeItem error:", err);
        get().fetchItems();
      }
    }
  },

  clearCart: async () => {
    const customerId = await getCustomerId();
    if (!customerId) return console.error("No customerId found");

    set({ items: [] });

    try {
      const cartRef = collection(db, 'users', customerId, 'cart');
      const snap = await getDocs(cartRef);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
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
