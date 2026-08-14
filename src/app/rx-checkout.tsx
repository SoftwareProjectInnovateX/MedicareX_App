import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert , useColorScheme } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function RxCheckoutScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();
  const { rxId, amount, items: itemsStr } = useLocalSearchParams<{ rxId: string, amount: string, items: string }>();

  const [name, setName] = useState((user as any)?.fullName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const totalAmount = parseFloat(amount || '0');
  
  let parsedItems: any[] = [];
  try {
    parsedItems = itemsStr ? JSON.parse(decodeURIComponent(itemsStr)) : [];
  } catch (e) {
    console.error("Failed to parse items:", e);
  }

  const handlePlaceOrder = async () => {
    if (!name || !phone || !address) {
      Alert.alert('Required', 'Please fill in all delivery details.');
      return;
    }

    setLoading(true);

    try {
      if (!rxId) throw new Error("No Prescription ID found");

      // 1. Fetch existing prescription
      const rxRef = doc(db, 'prescriptions', rxId);
      const rxSnap = await getDoc(rxRef);
      const rxData = rxSnap.exists() ? rxSnap.data() : null;

      if (!rxData) throw new Error("Prescription not found in database.");

      // 2. Update prescription status
      await updateDoc(rxRef, {
        status: 'Ready to Collect', // We use 'Ready to Collect' or 'Pending-COD' for COD
        customerConfirmed: true,
        paymentMethod: 'COD',
        confirmedAt: serverTimestamp(),
        customerAddress: address,
        customerName: name,
        customerPhone: phone
      });

      // 3. Add to pharmacistDispensed history so Pharmacist sees it in Dispensed History
      const dispensePayload = {
        rxId: rxId,
        patientName: name,
        verifiedPatient: name,
        phone: phone,
        address: address,
        orderItems: rxData.orderItems || rxData.medications || parsedItems || [],
        total: totalAmount,
        paymentStatus: 'COD',
        paymentMethod: 'COD',
        status: 'pending',
        createdAt: new Date().toISOString(), // Web App pharmacistService uses ISO strings for this
        finalized: false
      };
      
      await addDoc(collection(db, 'pharmacistDispensed'), dispensePayload);

      Alert.alert('Success', 'Prescription checkout complete! Your items will be delivered soon.', [
        { text: 'View Orders', onPress: () => router.replace('/orders') }
      ]);
    } catch (err: any) {
      console.error('Error placing prescription order:', err);
      Alert.alert('Checkout Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      <View className="flex-row items-center p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0f2a5e'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary dark:text-white">Prescription Checkout</Text>
      </View>
      
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Order Summary */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
          <Text className="font-bold text-textPrimary dark:text-white text-lg mb-4">Prescription Bill</Text>
          
          {parsedItems.length > 0 ? (
            parsedItems.map((item, idx) => (
              <View key={idx} className="flex-row justify-between mb-2">
                <Text className="text-textSecondary dark:text-gray-300" numberOfLines={1} style={{ flex: 1, paddingRight: 10 }}>
                  {item.name} x{item.qty}
                </Text>
                <Text className="font-bold text-textPrimary dark:text-white">
                  Rs. {(item.price * item.qty).toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-textSecondary dark:text-gray-300 mb-2">Prescription Items included.</Text>
          )}

          <View className="border-t border-[#e5e7eb] dark:border-gray-700 mt-4 pt-4 flex-row justify-between">
            <Text className="font-bold text-lg text-textPrimary dark:text-white">Total Amount</Text>
            <Text className="font-bold text-xl text-accent">Rs. {totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery Details */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
          <Text className="font-bold text-textPrimary dark:text-white text-lg mb-4">Delivery Details</Text>
          
          <View className="mb-4">
            <Text className="text-textSecondary dark:text-gray-300 font-semibold mb-2 text-xs uppercase tracking-widest">Full Name</Text>
            <TextInput 
              placeholder="Your full name" 
              className="bg-primary dark:bg-gray-900 px-4 py-3 rounded-xl border border-[#e5e7eb] dark:border-gray-700 text-textPrimary dark:text-white font-bold"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-textSecondary dark:text-gray-300 font-semibold mb-2 text-xs uppercase tracking-widest">Phone Number</Text>
            <TextInput 
              placeholder="e.g. 0712345678" 
              className="bg-primary dark:bg-gray-900 px-4 py-3 rounded-xl border border-[#e5e7eb] dark:border-gray-700 text-textPrimary dark:text-white font-bold"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View className="mb-2">
            <Text className="text-textSecondary dark:text-gray-300 font-semibold mb-2 text-xs uppercase tracking-widest">Delivery Address</Text>
            <TextInput 
              placeholder="Full delivery address" 
              className="bg-primary dark:bg-gray-900 px-4 py-3 rounded-xl border border-[#e5e7eb] dark:border-gray-700 text-textPrimary dark:text-white font-bold"
              multiline
              numberOfLines={3}
              style={{ textAlignVertical: 'top' }}
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-8">
          <Text className="font-bold text-textPrimary dark:text-white text-lg mb-4">Payment Method</Text>
          <View className="bg-green-50 border border-green-200 rounded-xl p-4 flex-row items-center">
            <View className="w-6 h-6 rounded-full bg-green-500 items-center justify-center mr-3">
              <Feather name="check" color="white" size={14} />
            </View>
            <Text className="font-bold text-green-800">Cash on Delivery</Text>
          </View>
        </View>

        {/* Place Order Button */}
        <TouchableOpacity 
          className={`w-full py-4 rounded-2xl items-center justify-center flex-row shadow-sm ${(!name || !phone || !address || loading) ? 'bg-[#e2e8f0]' : 'bg-accent'}`}
          disabled={!name || !phone || !address || loading}
          onPress={handlePlaceOrder}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-black text-lg ${(!name || !phone || !address) ? 'text-[#94A3B8]' : 'text-white'}`}>Confirm Order</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
