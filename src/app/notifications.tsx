import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
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
            message: `Your prescription #${d.id.slice(-6)} has been reviewed and a bill is ready.`,
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
      setLoading(false);
    });

    return () => {
      unsubPres();
      unsubOrders();
    };
  }, [user]);

  const handlePress = () => {
    router.push('/orders');
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-row items-center p-4 border-b border-[#e5e7eb] bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="#0f2a5e" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary">Notifications</Text>
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
                onPress={handlePress}
                className="bg-white rounded-2xl p-4 mb-3 border border-[#e5e7eb] shadow-sm flex-row items-center"
              >
                <View className={`w-12 h-12 rounded-xl ${notif.color} items-center justify-center mr-4`}>
                  <Feather name={notif.icon as any} size={20} color={notif.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-textPrimary text-base mb-1">{notif.title}</Text>
                  <Text className="text-textSecondary text-sm">{notif.message}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ))
          ) : (
            <View className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 items-center mt-10">
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
