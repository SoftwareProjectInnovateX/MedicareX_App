import { create } from "zustand";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../services/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, increment, query, where, updateDoc } from 'firebase/firestore';

const getCustomerId = async () => {
  return await AsyncStorage.getItem("userId") ?? null;
};

const normalizeProductId = (product: any) => {
  return String(product.productId || product.productCode || product.id || '').trim();
};

const updateProductStock = async (stockId: string, delta: number) => {
  if (!stockId) return;
  try {
    const q = query(collection(db, 'products'), where('productCode', '==', stockId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docId = snap.docs[0].id;
      await updateDoc(doc(db, 'products', docId), { stock: increment(delta) });
    } else {
      await setDoc(doc(db, 'products', stockId), { stock: increment(delta) }, { merge: true });
    }
  } catch (err) {
    console.error("Error updating stock globally", err);
  }
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
        
        // Adjust actual stock
        if (existing.stockId) {
          await updateProductStock(existing.stockId, -delta);
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
      
      // Deduct stock for new item
      if (newItem.stockId) {
        await updateProductStock(newItem.stockId, -initialQty);
      }

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
    const itemToRemove = get().items.find(i => i.id === firestoreId);
    
    set((state) => ({
      items: state.items.filter((i) => i.id !== firestoreId),
    }));

    if (customerId) {
      try {
        await deleteDoc(doc(db, 'users', customerId, 'cart', firestoreId));
        
        // Restore stock when removing from cart
        if (itemToRemove && itemToRemove.stockId) {
          await updateProductStock(itemToRemove.stockId, itemToRemove.qty);
        }
      } catch (err) {
        console.error("removeItem error:", err);
        get().fetchItems();
      }
    }
  },

  clearCart: async (restoreStock: boolean = false) => {
    const customerId = await getCustomerId();
    if (!customerId) return console.error("No customerId found");

    const currentItems = [...get().items];
    set({ items: [] });

    try {
      const cartRef = collection(db, 'users', customerId, 'cart');
      const snap = await getDocs(cartRef);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      
      // If manually clearing cart, restore stock for all items
      if (restoreStock) {
        for (const item of currentItems) {
          if (item.stockId) {
            await updateProductStock(item.stockId, item.qty);
          }
        }
      }
      
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
