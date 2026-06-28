import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ShoppingCart, Upload, ClipboardList, Clock, Sparkles, TrendingUp, Zap, Heart, CheckCircle, Lightbulb } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';



const OrderCard = ({ order }: { order: any }) => {
  const router = useRouter();

  const handleAccept = () => {
    router.push(`/rx-checkout?rxId=${order.id}&amount=${order.totalPrice || order.totalAmount || order.total || 0}&items=${encodeURIComponent(JSON.stringify(order.medications || []))}`);
  };

  const handleReject = async () => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'prescriptions', order.id), {
        status: 'Rejected',
        customerConfirmed: false
      });
      alert('Prescription rejected successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to reject prescription.');
    }
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-[#e5e7eb] shadow-sm">
      <View className="flex-row justify-between items-start mb-3">
        <View>
          <Text className="text-xs uppercase font-bold text-textMuted tracking-wider">
            {order.type === 'prescription' ? 'PRESCRIPTION' : 'ORDER'} #{order.id?.slice(-6) || '---'}
          </Text>
          <Text className="text-lg font-bold text-textPrimary mt-1">
            {order.type === 'prescription' ? 'Rx Request' : `${order.types?.length || 0} Items`}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${
          order.orderStatus?.toLowerCase() === 'delivered' ? 'bg-green-100' :
          order.orderStatus?.toLowerCase() === 'approved' ? 'bg-emerald-100' :
          order.orderStatus?.toLowerCase() === 'pending' ? 'bg-orange-100' : 'bg-blue-100'
        }`}>
          <Text className={`text-[10px] font-bold uppercase tracking-wider ${
            order.orderStatus?.toLowerCase() === 'delivered' ? 'text-green-700' :
            order.orderStatus?.toLowerCase() === 'approved' ? 'text-emerald-700' :
            order.orderStatus?.toLowerCase() === 'pending' ? 'text-orange-700' : 'text-blue-700'
          }`}>{order.orderStatus}</Text>
        </View>
      </View>
      
      {order.type === 'prescription' && order.medications && order.medications.length > 0 && (
        <View className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-200">
          <Text className="text-xs font-bold text-slate-700 mb-2">Quoted Medications:</Text>
          {order.medications.map((m: any, idx: number) => (
            <View key={idx} className="flex-row justify-between mb-1">
              <Text className="text-xs text-slate-600">{m.name} <Text className="font-bold">x{m.qty}</Text></Text>
              <Text className="text-xs font-bold text-slate-800">Rs. {(m.total || (m.qty * m.price)).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {order.type === 'regular' && order.types && order.types.length > 0 && (
         <View className="mb-3">
            <Text className="text-xs text-slate-600 mb-1" numberOfLines={1}>
              {order.types.map((t: any) => t.productName || t.name).join(', ')}
            </Text>
         </View>
      )}
      
      <View className="flex-row justify-between items-center pt-3 border-t border-slate-100">
        <View>
          <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Total</Text>
          <Text className="text-sm font-black text-accent">Rs. {(order.totalPrice || order.totalAmount || order.total || 0).toLocaleString()}</Text>
        </View>

        {order.type === 'prescription' && order.orderStatus === 'Approved' ? (
          <View className="flex-row items-center space-x-2">
            <Pressable onPress={handleReject} className="px-4 py-2 border border-red-200 bg-red-50 rounded-xl mr-2">
              <Text className="text-red-600 text-xs font-bold">Reject</Text>
            </Pressable>
            <Pressable onPress={handleAccept} className="px-4 py-2 bg-emerald-600 rounded-xl flex-row items-center">
              <Text className="text-white text-xs font-bold mr-1">Pay Now</Text>
              <Feather name="chevron-right" size={14} color="#ffffff" />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center bg-accentLight px-4 py-2 rounded-xl">
            <Text className="text-accent text-xs font-bold mr-1">View Details</Text>
            <Feather name="chevron-right" size={14} color="#1a87e1" />
          </View>
        )}
      </View>
    </View>
  );
};

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'prescriptions'>('orders');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let unsubPres = () => {};

    const qOrders = query(
      collection(db, 'CustomerOrders'),
      where('userId', '==', user.uid)
    );

    const unsubOrders = onSnapshot(qOrders, (snap) => {
      let allOrders = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        type: 'regular',
        orderStatus: d.data().orderStatus || 'pending',
      }));
      // Sort in memory to avoid requiring a composite index
      allOrders.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setOrders(allOrders);
      setLoading(false);
    }, (err) => {
      console.error('Failed to fetch orders from firestore:', err);
      setLoading(false);
    });

    const qPres = query(
      collection(db, 'prescriptions'),
      where('userId', '==', user.uid)
    );

    unsubPres = onSnapshot(qPres, (snap) => {
      let all = snap.docs.map(d => {
        const p = d.data();
        return {
          id: d.id,
          ...p,
          type: 'prescription',
          customerName:  p.customerName || 'Prescription Upload',
          phone:         p.customerPhone,
          address:       p.customerAddress,
          orderStatus:   p.status || 'Pending',
          paymentMethod: p.medications?.length > 0 ? 'Pharmacy Quote' : 'Pending Review',
          paymentStatus: p.status === 'Paid' ? 'paid' : 'pending',
          types: (p.medications || p.orderItems || []).map((m: any) => ({
            name:     m.name,
            quantity: m.qty,
            price:    m.price,
            id:       'RX-ITEM',
          })),
          createdAt: p.createdAt,
        };
      });
      // Sort in memory to avoid requiring a composite index
      all.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setPrescriptions(all);
    });

    return () => { 
      unsubPres(); 
      unsubOrders();
    };
  }, [user]);

  const prescriptionIds = new Set(prescriptions.map(p => p.id));
  const visibleOrders = orders.filter((item) => {
    if (item.rxId && prescriptionIds.has(item.rxId)) return false;
    return true;
  });

  const generateAIInsights = () => {
    const allOrders = [...visibleOrders, ...prescriptions];
    if (allOrders.length === 0) {
      return {
        totalSpending: 0, avgOrderValue: 0, orderFrequency: 'N/A',
        deliveryPrediction: 'No orders yet', healthTrends: [],
        recommendations: ['Start placing orders to get AI insights'],
        nextOrderEstimate: 'No prediction available', savingsOpportunity: 0,
      };
    }

    const totalSpending = allOrders.reduce((sum, order) => {
      if (order.totalPrice) return sum + order.totalPrice;
      if (order.types) return sum + (order.types.reduce((s: number, t: any) => s + (t.price * t.quantity), 0));
      return sum;
    }, 0);

    const avgOrderValue = totalSpending / allOrders.length;

    const recentOrders = allOrders.filter(o => {
      const date = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
      const daysSince = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });

    const orderFrequency = recentOrders.length > 0 ? `${recentOrders.length} orders in last 30 days` : 'Less frequent';

    const deliveryPrediction = (() => {
      const processingOrders = allOrders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing');
      if (processingOrders.length === 0) return 'No active orders';
      return '2-4 business days';
    })();

    const healthTrends = prescriptions.length > 0
      ? prescriptions.flatMap(p => p.types || [])
          .reduce((acc: any[], item: any) => {
            const existing = acc.find(h => h.name === item.name);
            if (existing) existing.count++;
            else acc.push({ name: item.name, count: 1 });
            return acc;
          }, [])
          .sort((a, b) => b.count - a.count).slice(0, 3)
      : [];

    return {
      totalSpending: Math.round(totalSpending), 
      avgOrderValue: Math.round(avgOrderValue),
      orderFrequency, 
      deliveryPrediction, 
      healthTrends, 
      savingsOpportunity: avgOrderValue > 150 ? Math.round(avgOrderValue * 0.07) : 0,
    };
  };

  const aiInsights = generateAIInsights();

  const summary = {
    totalOrders: visibleOrders.length,
    activeOrders: visibleOrders.filter((o) => !['Delivered', 'Cancelled'].includes(o.orderStatus)).length,
    totalPrescriptions: prescriptions.length,
    pendingPrescriptions: prescriptions.filter((p) => p.orderStatus === 'Pending').length,
    ...aiInsights,
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-row items-center justify-between p-4 border-b border-[#e5e7eb] bg-white">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Feather name="arrow-left" size={24} color="#0f2a5e" />
          </Pressable>
          <Text className="text-xl font-bold text-textPrimary">My Orders</Text>
        </View>
        <Pressable onPress={() => router.push('/prescription')} style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 9999 }}>
          <Upload size={18} color="#1a87e1" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1a87e1" />
        </View>
      ) : (
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* SUMMARY GRID */}
          <View className="flex-row flex-wrap justify-between mb-6">
            <View className="w-[48%] bg-white p-4 rounded-2xl border border-[#e5e7eb] shadow-sm mb-3">
              <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mb-2">
                <ShoppingCart size={18} color="#2563eb" />
              </View>
              <Text className="text-2xl font-black text-slate-900">{summary.totalOrders}</Text>
              <Text className="text-[10px] font-bold uppercase text-slate-400 mt-1">Cart Orders</Text>
            </View>
            <View className="w-[48%] bg-white p-4 rounded-2xl border border-[#e5e7eb] shadow-sm mb-3">
              <View className="w-10 h-10 bg-purple-50 rounded-xl items-center justify-center mb-2">
                <ClipboardList size={18} color="#7c3aed" />
              </View>
              <Text className="text-2xl font-black text-slate-900">{summary.totalPrescriptions}</Text>
              <Text className="text-[10px] font-bold uppercase text-slate-400 mt-1">Prescriptions</Text>
            </View>
            <View className="w-[48%] bg-white p-4 rounded-2xl border border-[#e5e7eb] shadow-sm">
              <View className="w-10 h-10 bg-amber-50 rounded-xl items-center justify-center mb-2">
                <Clock size={18} color="#d97706" />
              </View>
              <Text className="text-2xl font-black text-slate-900">{summary.pendingPrescriptions}</Text>
              <Text className="text-[10px] font-bold uppercase text-slate-400 mt-1">Pending Rx</Text>
            </View>
            <View className="w-[48%] bg-white p-4 rounded-2xl border border-[#e5e7eb] shadow-sm">
              <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center mb-2">
                <Zap size={18} color="#059669" />
              </View>
              <Text className="text-2xl font-black text-slate-900">{summary.activeOrders}</Text>
              <Text className="text-[10px] font-bold uppercase text-slate-400 mt-1">In Progress</Text>
            </View>
          </View>

          {/* AI INSIGHTS */}
          <View className="bg-[#eff6ff] border border-[#bfdbfe] rounded-3xl p-5 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-3">
                <Sparkles size={16} color="#2563eb" />
              </View>
              <View>
                <Text className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">AI Powered</Text>
                <Text className="text-lg font-bold text-slate-900">Order Intelligence</Text>
              </View>
            </View>
            <View className="flex-row flex-wrap justify-between">
              <View className="w-[48%] bg-white rounded-xl p-3 mb-2 shadow-sm border border-[#e2e8f0]">
                <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Spent</Text>
                <Text className="text-base font-black text-slate-900">Rs. {summary.totalSpending.toLocaleString()}</Text>
              </View>
              <View className="w-[48%] bg-white rounded-xl p-3 mb-2 shadow-sm border border-[#e2e8f0]">
                <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1">Avg Order</Text>
                <Text className="text-base font-black text-slate-900">Rs. {summary.avgOrderValue.toLocaleString()}</Text>
              </View>
              <View className="w-[48%] bg-white rounded-xl p-3 shadow-sm border border-[#e2e8f0]">
                <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1">Frequency</Text>
                <Text className="text-sm font-black text-slate-900">{summary.orderFrequency}</Text>
              </View>
              <View className="w-[48%] bg-white rounded-xl p-3 shadow-sm border border-[#e2e8f0]">
                <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1">Delivery ETA</Text>
                <Text className="text-sm font-black text-slate-900">{summary.deliveryPrediction}</Text>
              </View>
            </View>
          </View>

          {/* TABS */}
          <View className="bg-slate-100 p-1 rounded-xl flex-row mb-6">
            <Pressable 
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: activeTab === 'orders' ? '#ffffff' : 'transparent', shadowColor: activeTab === 'orders' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: activeTab === 'orders' ? 1 : 0 }}
              onPress={() => setActiveTab('orders')}
            >
              <Text style={{ fontWeight: 'bold', color: activeTab === 'orders' ? '#0f172a' : '#64748b' }}>Cart Orders</Text>
            </Pressable>
            <Pressable 
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: activeTab === 'prescriptions' ? '#ffffff' : 'transparent', shadowColor: activeTab === 'prescriptions' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: activeTab === 'prescriptions' ? 1 : 0 }}
              onPress={() => setActiveTab('prescriptions')}
            >
              <Text style={{ fontWeight: 'bold', color: activeTab === 'prescriptions' ? '#0f172a' : '#64748b' }}>Prescriptions</Text>
            </Pressable>
          </View>

          {/* LIST */}
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-bold text-lg text-slate-900">
                {activeTab === 'orders' ? 'Your latest orders' : 'Prescription history'}
              </Text>
              <View className="bg-slate-100 px-3 py-1 rounded-full">
                <Text className="text-[10px] uppercase font-bold text-slate-500">
                  {activeTab === 'orders' ? `${visibleOrders.length} items` : `${prescriptions.length} submitted`}
                </Text>
              </View>
            </View>

            {activeTab === 'orders' ? (
              visibleOrders.length > 0 ? (
                visibleOrders.map((order) => <OrderCard key={order.id} order={order} />)
              ) : (
                <View className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 items-center">
                  <ShoppingCart size={32} color="#cbd5e1" className="mb-3" />
                  <Text className="font-bold text-slate-600">No cart orders yet</Text>
                  <Text className="text-xs text-slate-400 mt-1">Place a new order and it will appear here.</Text>
                </View>
              )
            ) : (
              prescriptions.length > 0 ? (
                prescriptions.map((order) => <OrderCard key={order.id} order={order} />)
              ) : (
                <View className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 items-center">
                  <ClipboardList size={32} color="#cbd5e1" className="mb-3" />
                  <Text className="font-bold text-slate-600">No prescriptions submitted</Text>
                  <Text className="text-xs text-slate-400 mt-1">Upload a prescription to track it here.</Text>
                </View>
              )
            )}
          </View>
          
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
