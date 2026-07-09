import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';

const RETURN_REASONS = [
  "Damaged product",
  "Wrong item delivered",
  "Expired product",
  "Quantity mismatch",
  "Other"
];

export default function ReturnsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [note, setNote] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [myReturns, setMyReturns] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.email) return;
    const q = query(collection(db, 'CustomerReturns'), where('userEmail', '==', user.email));
    const unsub = onSnapshot(q, (snap) => {
      const returns = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally by createdAt desc
      returns.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setMyReturns(returns);
    });
    return () => unsub();
  }, [user?.email]);

  const submitReturn = async () => {
    if (!orderId || !reason) {
      Alert.alert('Error', 'Please enter Order ID and select a Reason.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'CustomerReturns'), {
        orderId,
        customerName: (user as any)?.fullName || user?.displayName || 'Customer',
        phone: (user as any)?.contact || '',
        address: (user as any)?.address || '',
        items: [{ name: 'Returned Item', quantity: 1, reason: reason, price: 0 }],
        refundAmount: 0,
        adjustmentNote: note,
        returnStatus: 'pending',
        refundStatus: 'pending',
        createdAt: serverTimestamp(),
        userEmail: user?.email
      });
      
      Alert.alert('Success', 'Return request submitted successfully!');
      setOrderId('');
      setReason(RETURN_REASONS[0]);
      setNote('');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to submit return request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-primary dark:bg-gray-900">
      <View className="px-6 pt-14 pb-4 bg-white dark:bg-gray-800 border-b border-[#e5e7eb] dark:border-gray-700 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-full items-center justify-center">
          <Feather name="arrow-left" color="#1E293B" size={20} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary dark:text-white">Returns</Text>
        <View className="w-10" />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          <Text className="text-2xl font-black text-textPrimary dark:text-white mb-2">Initiate a Return</Text>
          <Text className="text-textSecondary dark:text-gray-300 text-sm mb-6">Enter your order details below to request a return or refund for delivered items.</Text>
          
          <View className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
            <View className="mb-4">
              <Text className="text-[10px] font-black text-textSecondary dark:text-gray-300 uppercase tracking-widest mb-1.5">Order ID *</Text>
              <TextInput 
                className="bg-primary dark:bg-gray-900 rounded-xl px-4 py-3 text-textPrimary dark:text-white font-bold border border-[#e5e7eb] dark:border-gray-700"
                placeholder="e.g., ORD-12345"
                value={orderId}
                onChangeText={setOrderId}
              />
            </View>
            <View className="mb-4">
              <Text className="text-[10px] font-black text-textSecondary dark:text-gray-300 uppercase tracking-widest mb-1.5">Reason for Return *</Text>
              <TouchableOpacity 
                className="bg-primary dark:bg-gray-900 rounded-xl px-4 py-3 border border-[#e5e7eb] dark:border-gray-700 flex-row justify-between items-center"
                onPress={() => setShowPicker(true)}
              >
                <Text className="text-textPrimary dark:text-white font-bold">{reason}</Text>
                <Feather name="chevron-down" color="#64748b" size={18} />
              </TouchableOpacity>
            </View>
            <View className="mb-2">
              <Text className="text-[10px] font-black text-textSecondary dark:text-gray-300 uppercase tracking-widest mb-1.5">Additional Notes</Text>
              <TextInput 
                className="bg-primary dark:bg-gray-900 rounded-xl px-4 py-3 text-textPrimary dark:text-white font-bold border border-[#e5e7eb] dark:border-gray-700 h-24"
                placeholder="Provide any additional details..."
                multiline
                textAlignVertical="top"
                value={note}
                onChangeText={setNote}
              />
            </View>
          </View>

          <TouchableOpacity 
            className={`rounded-2xl py-4 flex-row justify-center items-center shadow-lg mb-8 ${isSubmitting ? 'bg-blue-300' : 'bg-accent shadow-accent/30'}`} 
            onPress={submitReturn}
            disabled={isSubmitting}
          >
            <Feather name="send" color="#ffffff" size={20} />
            <Text className="text-white font-black text-lg ml-2">{isSubmitting ? 'Submitting...' : 'Submit Request'}</Text>
          </TouchableOpacity>
          
          {/* My Returns Section */}
          {myReturns.length > 0 && (
            <View className="mb-10">
              <Text className="text-lg font-black text-textPrimary dark:text-white mb-4">My Returns</Text>
              {myReturns.map(ret => (
                <View key={ret.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-[#e5e7eb] dark:border-gray-700 mb-3">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-bold text-textPrimary dark:text-white">Order ID: {ret.orderId}</Text>
                    {ret.returnStatus === 'approved' ? (
                      <View className="bg-emerald-100 px-2 py-1 rounded-md">
                        <Text className="text-[10px] font-bold text-emerald-700 uppercase">Return Successful</Text>
                      </View>
                    ) : ret.returnStatus === 'rejected' ? (
                      <View className="bg-red-100 px-2 py-1 rounded-md">
                        <Text className="text-[10px] font-bold text-red-700 uppercase">Rejected</Text>
                      </View>
                    ) : (
                      <View className="bg-amber-100 px-2 py-1 rounded-md">
                        <Text className="text-[10px] font-bold text-amber-700 uppercase">Pending Return</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-textSecondary dark:text-gray-300">
                    Reason: {ret.items?.[0]?.reason || 'N/A'}
                  </Text>
                  {ret.returnStatus === 'approved' && (
                    <Text className="text-xs text-emerald-600 font-semibold mt-1">
                      Your return has been processed successfully.
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
            <Text className="text-lg font-black text-textPrimary dark:text-white mb-4">Select Reason</Text>
            {RETURN_REASONS.map(r => (
              <TouchableOpacity 
                key={r} 
                className="py-4 border-b border-[#e5e7eb] dark:border-gray-700"
                onPress={() => {
                  setReason(r);
                  setShowPicker(false);
                }}
              >
                <Text className={`text-base ${reason === r ? 'text-accent font-bold' : 'text-textPrimary dark:text-white'}`}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              className="mt-6 bg-slate-100 dark:bg-gray-800 rounded-xl py-3 items-center"
              onPress={() => setShowPicker(false)}
            >
              <Text className="font-bold text-textSecondary dark:text-gray-300">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
