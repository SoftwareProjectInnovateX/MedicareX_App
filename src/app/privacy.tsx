import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-primary">
      <View className="px-6 pt-14 pb-4 bg-white border-b border-[#e5e7eb] flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center">
          <Feather name="arrow-left" color="#1E293B" size={20} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary">Privacy Policy</Text>
        <View className="w-10" />
      </View>
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-black text-textPrimary mb-4">Privacy Policy</Text>
        <Text className="text-textSecondary leading-6 mb-4">
          At MediCareX, we value your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you use our mobile application.
        </Text>
        
        <Text className="font-bold text-lg text-textPrimary mb-2 mt-4">1. Information We Collect</Text>
        <Text className="text-textSecondary leading-6 mb-4">
          We collect information that you provide directly to us, such as your name, email address, contact number, delivery address, and medical prescriptions when you create an account or place an order.
        </Text>
        
        <Text className="font-bold text-lg text-textPrimary mb-2 mt-2">2. How We Use Your Information</Text>
        <Text className="text-textSecondary leading-6 mb-10">
          We use the information we collect to provide, maintain, and improve our services, process your orders, communicate with you, and ensure the security of our platform.
        </Text>
      </ScrollView>
    </View>
  );
}
