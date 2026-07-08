import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../services/firebase';
import { deleteDoc, doc } from 'firebase/firestore';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { orderData } = useLocalSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);

  let order: any = {};
  try {
    order = orderData ? JSON.parse(orderData as string) : {};
  } catch (e) {
    console.error("Failed to parse order data", e);
  }

  if (!order || !order.id) {
    return (
      <SafeAreaView className="flex-1 bg-[#f1f5f9] justify-center items-center">
        <Text className="text-slate-500">Order not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-6 py-2 bg-accent rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPrescription = order.type === 'prescription';
  const itemsList = order.items || order.types || order.medications || [];
  const displayAmount = order.totalPrice || order.totalAmount || order.total || 0;

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'delivered' || s === 'paid' || s === 'success') return 'bg-green-100 text-green-700';
    if (s === 'approved') return 'bg-emerald-100 text-emerald-700';
    if (s === 'pending' || s === 'pending-cod') return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Order",
      "Are you sure you want to permanently delete this order from your history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Decide collection based on order type
              const collectionName = isPrescription ? 'prescriptions' : 'CustomerOrders';
              await deleteDoc(doc(db, collectionName, order.id));
              Alert.alert("Deleted", "Order has been removed from your history.");
              router.back();
            } catch (error) {
              console.error("Error deleting order:", error);
              Alert.alert("Error", "Could not delete order. Please try again.");
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Handle Firestore timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
    }
    // Handle regular string/date
    return new Date(timestamp).toLocaleString('en-GB');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f1f5f9]">
      <View className="flex-row items-center justify-between p-4 bg-white border-b border-[#e5e7eb]">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2">
            <Feather name="arrow-left" size={24} color="#0f2a5e" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-slate-900">Order Details</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header Card */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Order Number</Text>
              <Text className="text-lg font-black text-slate-800">#{order.orderId || order.id?.slice(-6) || 'N/A'}</Text>
            </View>
            <View className={`px-3 py-1.5 rounded-full ${getStatusColor(order.orderStatus).split(' ')[0]}`}>
              <Text className={`text-[11px] font-bold uppercase tracking-wider ${getStatusColor(order.orderStatus).split(' ')[1]}`}>
                {order.orderStatus}
              </Text>
            </View>
          </View>

          <View className="space-y-2 mb-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">Date</Text>
              <Text className="text-sm font-bold text-slate-700">{formatDate(order.createdAt)}</Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-slate-500">Payment Method</Text>
              <Text className="text-sm font-bold text-slate-700">
                {order.paymentMethod === 'COD' ? 'Cash on Delivery' : (order.paymentMethod || 'Online')}
              </Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-slate-500">Total Items</Text>
              <Text className="text-sm font-bold text-slate-700">{itemsList.length}</Text>
            </View>
          </View>
        </View>

        {/* Customer Info Card */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-slate-200 shadow-sm">
          <View className="flex-row items-center mb-4 border-b border-slate-100 pb-3">
            <Feather name="map-pin" size={18} color="#1a87e1" className="mr-2" />
            <Text className="text-base font-bold text-slate-800">Delivery Details</Text>
          </View>
          <Text className="text-sm font-bold text-slate-800 mb-1">{order.customerName || (order.firstName ? order.firstName + ' ' + (order.lastName || '') : 'N/A')}</Text>
          <Text className="text-sm text-slate-500 leading-relaxed mb-3">
            {order.address || `${order.houseNumber ? order.houseNumber + ', ' : ''}${order.laneStreet || ''}, ${order.city || ''}`}
          </Text>
          
          <View className="flex-row items-center">
            <Feather name="phone" size={14} color="#64748b" />
            <Text className="text-sm text-slate-600 ml-2">{order.phone || 'N/A'}</Text>
          </View>
          {order.email && (
            <View className="flex-row items-center mt-2">
              <Feather name="mail" size={14} color="#64748b" />
              <Text className="text-sm text-slate-600 ml-2">{order.email}</Text>
            </View>
          )}
        </View>

        {/* Items List */}
        <View className="bg-white rounded-2xl p-5 mb-6 border border-slate-200 shadow-sm">
          <View className="flex-row items-center mb-4 border-b border-slate-100 pb-3">
            <Feather name="package" size={18} color="#1a87e1" className="mr-2" />
            <Text className="text-base font-bold text-slate-800">Order Summary</Text>
          </View>

          {itemsList.map((item: any, idx: number) => (
            <View key={idx} className="flex-row justify-between items-center mb-3">
              <View className="flex-1 mr-4">
                <Text className="text-sm font-bold text-slate-700" numberOfLines={2}>
                  {item.name || item.productName || 'Item'}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">Qty: {item.qty || item.quantity || 1}</Text>
              </View>
              <Text className="text-sm font-black text-slate-800">
                Rs. {Number((item.price || item.total || 0) * (item.qty || item.quantity || 1)).toFixed(2)}
              </Text>
            </View>
          ))}

          <View className="border-t border-slate-100 mt-3 pt-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-slate-500">Subtotal</Text>
              <Text className="text-sm font-bold text-slate-600">
                Rs. {((displayAmount) > 400 ? displayAmount - 400 : displayAmount).toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-sm text-slate-500">Shipping Charge</Text>
              <Text className="text-sm font-bold text-slate-600">Rs. 400.00</Text>
            </View>
            <View className="flex-row justify-between items-center pt-3 border-t border-slate-200 border-dashed">
              <Text className="text-base font-bold text-slate-800">Total Amount</Text>
              <Text className="text-xl font-black text-[#1e3a8a]">Rs. {Number(displayAmount).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity 
          onPress={handleDelete}
          disabled={isDeleting}
          className="w-full bg-red-50 border border-red-200 py-4 rounded-xl flex-row items-center justify-center mb-8"
        >
          {isDeleting ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <>
              <Feather name="trash-2" size={18} color="#ef4444" className="mr-2" />
              <Text className="text-red-600 font-bold uppercase tracking-wider text-sm">Delete Order</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
