import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert , useColorScheme } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function PrescriptionBillScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchRx = async () => {
      try {
        const docRef = doc(db, 'prescriptions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPrescription({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRx();
  }, [id]);

  const handleCancel = async () => {
    Alert.alert(
      "Cancel Prescription",
      "Are you sure you don't need these medicines?",
      [
        { text: "No, Go Back", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              const ref = doc(db, 'prescriptions', id as string);
              await updateDoc(ref, { status: 'Customer Cancelled' });
              setPrescription((prev: any) => ({ ...prev, status: 'Customer Cancelled' }));
              Alert.alert("Cancelled", "The pharmacist has been notified.");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Failed to cancel.");
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      // Mock payment delay
      await new Promise(res => setTimeout(res, 1500));
      
      const ref = doc(db, 'prescriptions', id as string);
      await updateDoc(ref, { 
        status: 'Paid',
        paymentMethod,
        paidAt: new Date()
      });
      setPrescription((prev: any) => ({ ...prev, status: 'Paid', paymentMethod }));
      Alert.alert("Payment Successful", "Your medicines will be packed and sent to you.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Payment failed.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#1a87e1" />
      </SafeAreaView>
    );
  }

  if (!prescription) {
    return (
      <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
        <View className="flex-row items-center p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0f2a5e'} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-textPrimary dark:text-white">Prescription Bill</Text>
        </View>
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500">Prescription not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isApproved = prescription.status === 'Approved';

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      <View className="flex-row items-center p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4" disabled={processing}>
          <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0f2a5e'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary dark:text-white">Prescription Bill</Text>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Status Banner */}
        <View className={`p-4 rounded-xl mb-6 flex-row items-center ${
          prescription.status === 'Paid' ? 'bg-emerald-100' :
          prescription.status === 'Customer Cancelled' ? 'bg-red-100' :
          'bg-blue-100'
        }`}>
          <Feather 
            name={prescription.status === 'Paid' ? 'check-circle' : prescription.status === 'Customer Cancelled' ? 'x-circle' : 'info'} 
            size={24} 
            color={prescription.status === 'Paid' ? '#10b981' : prescription.status === 'Customer Cancelled' ? '#ef4444' : '#3b82f6'} 
          />
          <View className="ml-3">
            <Text className={`font-bold ${
              prescription.status === 'Paid' ? 'text-emerald-700' : 
              prescription.status === 'Customer Cancelled' ? 'text-red-700' : 
              'text-blue-700'
            }`}>
              Status: {prescription.status}
            </Text>
            {prescription.status === 'Approved' && (
              <Text className="text-blue-600 text-xs mt-1">Please pay the bill to get your medicines delivered.</Text>
            )}
          </View>
        </View>

        {/* Medicines List */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
          <Text className="font-bold text-lg text-textPrimary dark:text-white mb-4">Prescribed Medicines</Text>
          
          {prescription.medications && prescription.medications.length > 0 ? (
            <View>
              {prescription.medications.map((med: any, index: number) => (
                <View key={index} className="flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                  <View className="flex-1 pr-4">
                    <Text className="font-semibold text-textPrimary dark:text-white">{med.name}</Text>
                    <Text className="text-xs text-gray-500">{med.dosage} • {med.timing}</Text>
                  </View>
                  <View className="items-end justify-center">
                    <Text className="text-sm text-gray-600 dark:text-gray-400">Qty: {med.qty}</Text>
                    <Text className="font-bold text-textPrimary dark:text-white mt-1">Rs. {((med.price || 0) * (med.qty || 0)).toFixed(2)}</Text>
                  </View>
                </View>
              ))}
              <View className="flex-row justify-between py-4 mt-2">
                <Text className="font-bold text-lg text-textPrimary dark:text-white">Total Amount</Text>
                <Text className="font-black text-xl text-[#1a87e1]">Rs. {(prescription.totalAmount || 0).toFixed(2)}</Text>
              </View>
            </View>
          ) : (
            <Text className="text-gray-500 italic text-center py-4">No medications listed.</Text>
          )}
        </View>

        {/* Payment Options (Only visible if Approved) */}
        {isApproved && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
            <Text className="font-bold text-lg text-textPrimary dark:text-white mb-3">Payment Method</Text>
            
            <TouchableOpacity 
              onPress={() => setPaymentMethod('card')}
              className={`flex-row items-center p-3 border rounded-xl mb-3 ${paymentMethod === 'card' ? 'border-[#1a87e1] bg-blue-50 dark:bg-blue-900/20' : 'border-[#e5e7eb] dark:border-gray-700'}`}
            >
              <Feather name="credit-card" size={20} color={paymentMethod === 'card' ? '#1a87e1' : '#9ca3af'} />
              <Text className={`ml-3 font-semibold ${paymentMethod === 'card' ? 'text-[#1a87e1]' : 'text-textPrimary dark:text-white'}`}>Credit / Debit Card</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setPaymentMethod('cash')}
              className={`flex-row items-center p-3 border rounded-xl ${paymentMethod === 'cash' ? 'border-[#1a87e1] bg-blue-50 dark:bg-blue-900/20' : 'border-[#e5e7eb] dark:border-gray-700'}`}
            >
              <Feather name="dollar-sign" size={20} color={paymentMethod === 'cash' ? '#1a87e1' : '#9ca3af'} />
              <Text className={`ml-3 font-semibold ${paymentMethod === 'cash' ? 'text-[#1a87e1]' : 'text-textPrimary dark:text-white'}`}>Cash on Delivery</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Sticky Action Buttons */}
      {isApproved && (
        <View className="p-4 bg-white dark:bg-gray-800 border-t border-[#e5e7eb] dark:border-gray-700 flex-row">
          <TouchableOpacity 
            onPress={handleCancel}
            disabled={processing}
            className={`flex-1 border-2 border-red-500 py-3 rounded-xl items-center justify-center mr-3 ${processing ? 'opacity-50' : ''}`}
          >
            <Text className="font-bold text-red-500">Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handlePay}
            disabled={processing}
            className={`flex-[2] bg-[#1a87e1] py-3 rounded-xl items-center justify-center flex-row ${processing ? 'opacity-50' : ''}`}
          >
            {processing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Feather name="check" color="white" size={20} className="mr-2" />
                <Text className="font-bold text-white text-base">Pay & Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
