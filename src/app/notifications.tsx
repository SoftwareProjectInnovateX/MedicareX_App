import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNotificationStore } from '../hooks/useNotifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  
  const notifications = useNotificationStore(s => s.notifications);
  const markAsRead = useNotificationStore(s => s.markAsRead);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      markAsRead();
    }
  }, [user]);

  const handlePress = (notif: any) => {
    if (notif.type === 'prescription_approved') {
      router.push(`/prescription-bill?id=${notif.orderId}`);
    } else if (notif.type === 'support_reply') {
      router.push('/support');
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
