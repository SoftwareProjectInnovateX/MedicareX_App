import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator , useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function SupportChatScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'contactMessages'), where('email', '==', user.email));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      msgs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      <View className="flex-row items-center p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0f2a5e'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary dark:text-white">Customer Support</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1a87e1" />
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          {messages.length > 0 ? (
            messages.map(msg => (
              <View key={msg.id} className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-[#e5e7eb] dark:border-gray-700 overflow-hidden shadow-sm">
                
                {/* User Message */}
                <View className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-[#e5e7eb] dark:border-gray-700">
                  <View className="flex-row items-center mb-2">
                    <Feather name="user" size={16} color={colorScheme === 'dark' ? '#FFFFFF' : '#64748b'} />
                    <Text className="ml-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Your Message</Text>
                  </View>
                  <Text className="text-sm text-textPrimary dark:text-white leading-5">{msg.message}</Text>
                  {msg.createdAt && (
                    <Text className="text-[10px] text-gray-400 mt-2">
                      {new Date(msg.createdAt.seconds * 1000).toLocaleString()}
                    </Text>
                  )}
                </View>

                {/* Pharmacist Reply */}
                {msg.reply ? (
                  <View className="p-4 bg-blue-50 dark:bg-blue-900/20">
                    <View className="flex-row items-center mb-2">
                      <Feather name="message-square" size={16} color="#1a87e1" />
                      <Text className="ml-2 text-xs font-bold text-[#1a87e1] uppercase tracking-wider">Pharmacist Reply</Text>
                    </View>
                    <Text className="text-sm text-textPrimary dark:text-white leading-5">{msg.reply}</Text>
                  </View>
                ) : (
                  <View className="p-4 flex-row items-center">
                    <Feather name="clock" size={14} color="#d97706" />
                    <Text className="ml-2 text-xs text-amber-600">Waiting for pharmacist reply...</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View className="bg-slate-50 dark:bg-gray-800 border border-dashed border-slate-200 rounded-2xl p-8 items-center mt-10">
              <Feather name="message-square" size={40} color="#cbd5e1" className="mb-4" />
              <Text className="font-bold text-slate-600 text-lg">No Messages</Text>
              <Text className="text-sm text-slate-400 mt-2 text-center">
                You haven't sent any messages to support yet.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
