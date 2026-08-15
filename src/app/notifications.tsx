import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Subscribe to Prescriptions
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
      
      setNotifications(prev => {
        const filtered = prev.filter(n => !n.id.startsWith('rx-'));
        const combined = [...filtered, ...notifs].sort((a, b) => b.time - a.time);
        return combined;
      });
    });

    // Subscribe to Customer Orders
    const qOrders = query(collection(db, 'CustomerOrders'), where('userId', '==', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      let notifs: any[] = [];
      snap.docs.forEach(d => {
        const o = d.data();
        if (o.orderStatus === 'Delivered') {
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
        } else if (o.orderStatus === 'Out for Delivery') {
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
        }
      });

      setNotifications(prev => {
        const filtered = prev.filter(n => !n.id.startsWith('ord-'));
        const combined = [...filtered, ...notifs].sort((a, b) => b.time - a.time);
        return combined;
      });
    });

    // Subscribe to Customer Returns
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

      setNotifications(prev => {
        const filtered = prev.filter(n => !n.id.startsWith('ret-'));
        const combined = [...filtered, ...notifs].sort((a, b) => b.time - a.time);
        return combined;
      });
    });

    // Subscribe to Contact Messages (Chat)
    let unsubChat = () => {};
    if (user.email) {
      const qChat = query(collection(db, 'contactMessages'), where('email', '==', user.email));
      unsubChat = onSnapshot(qChat, (snap) => {
        let notifs: any[] = [];
        snap.docs.forEach(d => {
          const msg = d.data();
          if (msg.status === 'replied') {
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

        setNotifications(prev => {
          const filtered = prev.filter(n => !n.id.startsWith('chat-'));
          const combined = [...filtered, ...notifs].sort((a, b) => b.time - a.time);
          return combined;
        });
      });
    }

    // Subscribe to New Arrivals
    const qNewArrivals = query(
      collection(db, 'pharmacistProducts'), 
      where('tags', 'array-contains', 'newArrival'),
      where('deleted', '==', false)
    );
    const unsubNewArrivals = onSnapshot(qNewArrivals, (snap) => {
      let notifs: any[] = [];
      snap.docs.forEach(d => {
        const p = d.data();
        notifs.push({
          id: `new-arr-${d.id}`,
          orderId: d.id, // used for routing to product
          title: 'New Arrival!',
          message: `${p.name || p.productName} is now available in stock. Check it out!`,
          type: 'new_arrival',
          time: p.createdAt?.seconds * 1000 || Date.now(),
          icon: 'star',
          color: 'bg-amber-100',
          iconColor: '#f59e0b'
        });
      });

      setNotifications(prev => {
        const filtered = prev.filter(n => !n.id.startsWith('new-arr-'));
        const combined = [...filtered, ...notifs].sort((a, b) => b.time - a.time);
        return combined;
      });
    });

    setLoading(false);

    return () => {
      unsubPres();
      unsubOrders();
      unsubReturns();
      unsubChat();
      unsubNewArrivals();
    };
  }, [user]);

  const handlePress = (notif: any) => {
    if (notif.type === 'prescription_approved') {
      router.push(`/prescription-bill?id=${notif.orderId}`);
    } else if (notif.type === 'support_reply') {
      router.push('/support-chat');
    } else if (notif.type === 'new_arrival') {
      router.push(`/product/${notif.orderId}`);
    } else {
      router.push('/orders');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      <View className="flex-row items-center p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0f2a5e'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary dark:text-white">Notifications</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1a87e1" />
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          {notifications.length > 0 ? (
            notifications.map(notif => (
              <TouchableOpacity 
                key={notif.id} 
                onPress={() => handlePress(notif)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-[#e5e7eb] dark:border-gray-700 shadow-sm flex-row items-center"
              >
                <View className={`w-12 h-12 rounded-xl ${notif.color} items-center justify-center mr-4`}>
                  <Feather name={notif.icon as any} size={20} color={notif.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-textPrimary dark:text-white text-base mb-1">{notif.title}</Text>
                  <Text className="text-textSecondary dark:text-gray-300 text-sm">{notif.message}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colorScheme === 'dark' ? '#FFFFFF' : '#94a3b8'} />
              </TouchableOpacity>
            ))
          ) : (
            <View className="bg-slate-50 dark:bg-gray-800 border border-dashed border-slate-200 rounded-2xl p-8 items-center mt-10">
              <Feather name="bell-off" size={40} color="#cbd5e1" className="mb-4" />
              <Text className="font-bold text-slate-600 text-lg">No Notifications</Text>
              <Text className="text-sm text-slate-400 mt-2 text-center">
                When your prescriptions are approved or orders delivered, they will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
