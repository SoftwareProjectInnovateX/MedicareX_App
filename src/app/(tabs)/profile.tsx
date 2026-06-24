import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <View className="flex-1 bg-primary items-center justify-center px-6">
        <View className="w-24 h-24 bg-accentLight rounded-full items-center justify-center mb-6">
          <Feather name="user" color="#1a87e1" size={40} />
        </View>
        <Text className="text-2xl font-bold text-textPrimary mb-2">Guest Profile</Text>
        <Text className="text-textSecondary text-center mb-8">Sign in to track orders, save prescriptions, and manage your health.</Text>
        <TouchableOpacity 
          className="bg-accent w-full py-4 rounded-2xl items-center"
          onPress={() => router.push('/(auth)/login')}
        >
          <Text className="text-white font-bold text-lg">Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const menuItems = [
    { icon: <Feather name="clock" color="#1a87e1" size={24} />, title: 'Order History', subtitle: 'Track your recent orders', route: '/orders' },
    { icon: <Feather name="file-text" color="#1a87e1" size={24} />, title: 'My Prescriptions', subtitle: 'Manage uploaded prescriptions', route: '/prescription' },
    { icon: <Feather name="heart" color="#1a87e1" size={24} />, title: 'Saved Items', subtitle: 'View your wishlist', route: null },
    { icon: <Feather name="settings" color="#1a87e1" size={24} />, title: 'Settings', subtitle: 'Notifications, password, etc.', route: '/settings' },
    { icon: <Feather name="help-circle" color="#1a87e1" size={24} />, title: 'Help & Support', subtitle: 'Contact us or view FAQs', route: null },
  ];

  return (
    <ScrollView className="flex-1 bg-primary" showsVerticalScrollIndicator={false}>
      {/* Header Profile Section */}
      <View className="bg-accent px-6 pt-16 pb-8 rounded-b-[40px] shadow-sm">
        <View className="flex-row items-center">
          <View className="w-20 h-20 bg-white rounded-full items-center justify-center border-4 border-accent">
            <Feather name="user" color="#1a87e1" size={40} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-2xl font-bold text-white mb-1">{user.fullName || 'Valued Customer'}</Text>
            <Text className="text-accentLight font-medium">{user.email}</Text>
            <TouchableOpacity className="mt-2 bg-primary0 self-start px-3 py-1 rounded-full" onPress={() => router.push('/settings')}>
              <Text className="text-white text-xs font-semibold">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats/Quick Info */}
      <View className="flex-row justify-between px-6 mt-[-20px] mb-6">
        <View className="bg-white rounded-2xl p-4 flex-1 mr-2 shadow-sm items-center border border-[#e5e7eb]">
          <Text className="text-accent font-bold text-2xl mb-1">12</Text>
          <Text className="text-textSecondary text-xs font-medium">Orders</Text>
        </View>
        <View className="bg-white rounded-2xl p-4 flex-1 ml-2 shadow-sm items-center border border-[#e5e7eb]">
          <Text className="text-accent font-bold text-2xl mb-1">3</Text>
          <Text className="text-textSecondary text-xs font-medium">Prescriptions</Text>
        </View>
      </View>

      {/* Menu Options */}
      <View className="px-6 pb-8">
        <Text className="text-lg font-bold text-textPrimary mb-4">Account Overview</Text>
        
        <View className="bg-white rounded-3xl shadow-sm border border-[#e5e7eb] overflow-hidden">
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index}
              className={`flex-row items-center p-4 ${index !== menuItems.length - 1 ? 'border-b border-[#e5e7eb]' : ''}`}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <View className="w-12 h-12 bg-primary rounded-xl items-center justify-center mr-4">
                {item.icon}
              </View>
              <View className="flex-1">
                <Text className="font-bold text-textPrimary text-base">{item.title}</Text>
                <Text className="text-textSecondary text-xs mt-0.5">{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" color="#CBD5E1" size={24} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          className="mt-8 bg-red-50 py-4 rounded-2xl items-center flex-row justify-center border border-red-100"
          onPress={logout}
        >
          <Feather name="log-out" color="#EF4444" size={20} style={{ marginRight: 8 }} />
          <Text className="text-red-500 font-bold text-lg">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
