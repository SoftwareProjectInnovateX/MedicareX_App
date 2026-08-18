import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface NotificationStore {
  notifications: any[];
  unreadCount: number;
  lastViewedTime: number;
  clearedAt: number;
  setNotifications: (notifs: any[]) => void;
  updateNotifications: (prefix: string, notifs: any[]) => void;
  markAsRead: () => void;
  clearNotifications: (userId?: string) => Promise<void>;
  initLastViewed: (userId?: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  lastViewedTime: 0,
  clearedAt: 0,
  setNotifications: (notifs) => {
    const validNotifs = notifs.filter(n => n.time > get().clearedAt);
    const unread = validNotifs.filter(n => n.time > get().lastViewedTime).length;
    set({ notifications: validNotifs, unreadCount: unread });
  },
  updateNotifications: (prefix, notifs) => {
    const prev = get().notifications;
    const filtered = prev.filter(n => !n.id.startsWith(prefix));
    
    // Filter out notifications older than clearedAt
    const validNotifs = notifs.filter(n => n.time > get().clearedAt);
    const combined = [...filtered, ...validNotifs].sort((a, b) => b.time - a.time);
    
    const unread = combined.filter(n => n.time > get().lastViewedTime).length;
    set({ notifications: combined, unreadCount: unread });
  },
  markAsRead: async () => {
    const now = Date.now();
    await AsyncStorage.setItem('lastViewedNotifs', now.toString());
    set({ lastViewedTime: now, unreadCount: 0 });
  },
  clearNotifications: async (userId?: string) => {
    const now = Date.now();
    const key = userId ? `notificationsClearedAt_${userId}` : 'notificationsClearedAt';
    await AsyncStorage.setItem(key, now.toString());
    set({ notifications: [], unreadCount: 0, clearedAt: now });
  },
  initLastViewed: async (userId?: string) => {
    try {
      const time = await AsyncStorage.getItem('lastViewedNotifs');
      if (time) set({ lastViewedTime: parseInt(time) });
      
      const key = userId ? `notificationsClearedAt_${userId}` : 'notificationsClearedAt';
      const cleared = await AsyncStorage.getItem(key);
      if (cleared) set({ clearedAt: parseInt(cleared) });
      else set({ clearedAt: 0 }); // reset if no key found for this user
    } catch (err) {
      console.log('Failed to get notification state from storage:', err);
    }
  }
}));

export function useNotificationListener() {
  const { user } = useAuth();
  const updateNotifications = useNotificationStore(s => s.updateNotifications);
  const setNotifications = useNotificationStore(s => s.setNotifications);
  const initLastViewed = useNotificationStore(s => s.initLastViewed);

  useEffect(() => {
    initLastViewed(user?.uid);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const qPres = query(collection(db, 'prescriptions'), where('userId', '==', user.uid));
    const unsubPres = onSnapshot(qPres, (snap) => {
      let notifs: any[] = [];
      snap.docs.forEach(d => {
        const p = d.data();
        if (p.status === 'Approved') {
          notifs.push({
            id: `rx-app-${d.id}`,
            orderId: d.id,
            title: 'Prescription Approved',
            message: `Your prescription #${d.id.slice(-6)} has been reviewed. Total Bill: Rs. ${(p.totalAmount || 0).toFixed(2)}`,
            type: 'prescription_approved',
            time: p.processedAt?.seconds * 1000 || p.createdAt?.seconds * 1000 || Date.now(),
            icon: 'check-circle',
            color: 'bg-emerald-100',
            iconColor: '#10b981'
          });
        } else if (p.status === 'Delivered') {
          notifs.push({
            id: `rx-del-${d.id}`,
            orderId: d.id,
            title: 'Prescription Delivered',
            message: `Your medications for Rx #${d.id.slice(-6)} have been delivered.`,
            type: 'prescription_delivered',
            time: p.processedAt?.seconds * 1000 || p.createdAt?.seconds * 1000 || Date.now(),
            icon: 'package',
            color: 'bg-blue-100',
            iconColor: '#3b82f6'
          });
        }
      });
      updateNotifications('rx-', notifs);
    });

    const qOrders = query(collection(db, 'CustomerOrders'), where('userId', '==', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      let notifs: any[] = [];
      snap.docs.forEach(d => {
        const o = d.data();
        if (o.orderStatus?.toLowerCase() === 'delivered') {
          notifs.push({
            id: `ord-del-${d.id}`,
            orderId: d.id,
            title: 'Order Delivered',
            message: `Your order #${d.id.slice(-6)} has been successfully delivered.`,
            type: 'order_delivered',
            time: o.createdAt?.seconds * 1000 || Date.now(),
            icon: 'package',
            color: 'bg-blue-100',
            iconColor: '#3b82f6'
          });
        } else if (o.orderStatus?.toLowerCase() === 'out for delivery') {
          notifs.push({
            id: `ord-out-${d.id}`,
            orderId: d.id,
            title: 'Order Out for Delivery',
            message: `Your order #${d.id.slice(-6)} is on the way to your location.`,
            type: 'order_out',
            time: o.createdAt?.seconds * 1000 || Date.now(),
            icon: 'truck',
            color: 'bg-amber-100',
            iconColor: '#f59e0b'
          });
        } else if (o.orderStatus?.toLowerCase() === 'completed') {
          notifs.push({
            id: `ord-comp-${d.id}`,
            orderId: d.id,
            title: 'Order Completed',
            message: `Your order #${d.id.slice(-6)} is completed and ready for delivery.`,
            type: 'order_completed',
            time: o.createdAt?.seconds * 1000 || Date.now(),
            icon: 'check-circle',
            color: 'bg-emerald-100',
            iconColor: '#10b981'
          });
        } else if (o.orderStatus?.toLowerCase() === 'approved' || o.orderStatus?.toLowerCase() === 'processing') {
          notifs.push({
            id: `ord-app-${d.id}`,
            orderId: d.id,
            title: 'Order Approved',
            message: `Your order #${d.id.slice(-6)} has been approved by the pharmacist.`,
            type: 'order_approved',
            time: o.createdAt?.seconds * 1000 || Date.now(),
            icon: 'check-square',
            color: 'bg-green-100',
            iconColor: '#22c55e'
          });
        }
      });
      updateNotifications('ord-', notifs);
    });

    const qReturns = query(collection(db, 'CustomerReturns'), where('userEmail', '==', user.email || user.uid));
    const unsubReturns = onSnapshot(qReturns, (snap) => {
      let notifs: any[] = [];
      snap.docs.forEach(d => {
        const r = d.data();
        if (r.returnStatus === 'approved') {
          notifs.push({
            id: `ret-app-${d.id}`,
            orderId: r.orderId,
            title: 'Return Successful',
            message: `Your return request for Order #${(r.orderId || '').slice(-6)} has been approved and processed.`,
            type: 'return_approved',
            time: r.createdAt?.seconds * 1000 || Date.now(),
            icon: 'refresh-ccw',
            color: 'bg-emerald-100',
            iconColor: '#10b981'
          });
        }
      });
      updateNotifications('ret-', notifs);
    });

    let unsubChat = () => {};
    if (user.email) {
      const qChat = query(collection(db, 'contactMessages'), where('email', '==', user.email));
      unsubChat = onSnapshot(qChat, (snap) => {
        let notifs: any[] = [];
        snap.docs.forEach(d => {
          const msg = d.data();
          if (msg.reply) {
            notifs.push({
              id: `chat-rep-${d.id}`,
              orderId: d.id,
              title: 'Customer Support Reply',
              message: `Pharmacist replied: "${(msg.reply || '').slice(0, 30)}..."`,
              type: 'support_reply',
              time: msg.createdAt?.seconds * 1000 || Date.now(),
              icon: 'message-square',
              color: 'bg-purple-100',
              iconColor: '#a855f7'
            });
          }
        });
        updateNotifications('chat-', notifs);
      });
    }

    const qNewArrivals = query(
      collection(db, 'pharmacistProducts'), 
      where('tags', 'array-contains', 'newArrival'),
      where('deleted', '==', false)
    );
    const qBlogs = query(
      collection(db, 'blogs'), 
      where('status', '==', 'PUBLISHED')
    );
    const unsubBlogs = onSnapshot(qBlogs, (snap) => {
      let notifs: any[] = [];
      snap.docs.forEach(d => {
        const b = d.data();
        // Use a generic ID if ID is missing
        const blogId = d.id || Math.random().toString();
        // Ensure title exists
        const titleText = (b.title || 'New Health Article').replace(/\*\*/g, '');
        notifs.push({
          id: `blog-${blogId}`,
          orderId: blogId, // Used by routing potentially
          title: 'New Health Article',
          message: `Read our latest article: ${titleText}`,
          type: 'new_blog',
          time: b.createdAt ? new Date(b.createdAt).getTime() : Date.now(),
          icon: 'file-text',
          color: 'bg-blue-100',
          iconColor: '#3b82f6'
        });
      });
      updateNotifications('blog-', notifs);
    });

    const unsubNewArrivals = onSnapshot(qNewArrivals, (snap) => {
      let notifs: any[] = [];
      snap.docs.forEach(d => {
        const p = d.data();
        notifs.push({
          id: `new-arr-${d.id}`,
          orderId: d.id,
          title: 'New Arrival!',
          message: `${p.name || p.productName} is now available in stock. Check it out!`,
          type: 'new_arrival',
          time: p.createdAt?.seconds * 1000 || Date.now(),
          icon: 'star',
          color: 'bg-amber-100',
          iconColor: '#f59e0b'
        });
      });
      updateNotifications('new-arr-', notifs);
    });

    const qBrands = query(collection(db, 'brands'));
    const unsubBrands = onSnapshot(qBrands, (snap) => {
      let notifs: any[] = [];
      snap.docs.forEach(d => {
        const b = d.data();
        notifs.push({
          id: `new-brand-${d.id}`,
          orderId: d.id, 
          title: 'New Brand Added!',
          message: `${b.name} is now available in our catalog. Explore their products!`,
          type: 'new_brand',
          time: b.createdAt?.seconds * 1000 || Date.now(),
          icon: 'tag',
          color: 'bg-purple-100',
          iconColor: '#9333ea'
        });
      });
      updateNotifications('new-brand-', notifs);
    });

    return () => {
      unsubPres();
      unsubOrders();
      unsubReturns();
      unsubChat();
      unsubNewArrivals();
      unsubBlogs();
      unsubBrands();
    };
  }, [user]);
}
