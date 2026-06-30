import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-primary">
      <View className="px-6 pt-14 pb-4 bg-white border-b border-[#e5e7eb] flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center">
          <Feather name="arrow-left" color="#1E293B" size={20} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary">Terms of Service</Text>
        <View className="w-10" />
      </View>
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-black text-textPrimary mb-4">Terms and Conditions</Text>
        <Text className="text-textSecondary leading-6 mb-4">
          Welcome to MediCareX. By accessing or using our mobile application, you agree to be bound by these Terms of Service. Please read them carefully.
        </Text>
        
        <Text className="font-bold text-lg text-textPrimary mb-2 mt-4">1. Use of Service</Text>
        <Text className="text-textSecondary leading-6 mb-4">
          You must be at least 18 years old to use our services. You are responsible for maintaining the confidentiality of your account information.
        </Text>
        
        <Text className="font-bold text-lg text-textPrimary mb-2 mt-2">2. Prescriptions</Text>
        <Text className="text-textSecondary leading-6 mb-10">
          All prescription medications require a valid prescription from a registered medical practitioner. We reserve the right to refuse service if the prescription is invalid or unverifiable.
        </Text>
      </ScrollView>
    </View>
  );
}
