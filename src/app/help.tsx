import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function HelpCenterScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  const faqs = [
    { q: "How do I track my order?", a: "You can track your order in the 'Orders' section. We provide real-time updates." },
    { q: "What payment methods are accepted?", a: "We accept Visa, Mastercard, and Mobile Pay options." },
    { q: "How can I contact a pharmacist?", a: "You can chat directly with a live pharmacist by clicking the 'Contact Support' button below. This connects you to our pharmacist dashboard." }
  ];

  return (
    <View className="flex-1 bg-primary dark:bg-gray-900">
      <View className="px-6 pt-14 pb-4 bg-white dark:bg-gray-800 border-b border-[#e5e7eb] dark:border-gray-700 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-full items-center justify-center">
          <Feather name="arrow-left" color={colorScheme === 'dark' ? '#f1f5f9' : '#1E293B'} size={20} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary dark:text-white">Help Center</Text>
        <View className="w-10" />
      </View>
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-black text-textPrimary dark:text-white mb-2">How can we help you?</Text>
        <Text className="text-textSecondary dark:text-gray-300 text-sm mb-6">Find answers to frequently asked questions below.</Text>
        
        {faqs.map((faq, index) => (
          <View key={index} className="bg-white dark:bg-gray-800 p-5 rounded-2xl mb-4 border border-[#e5e7eb] dark:border-gray-700">
            <Text className="font-bold text-lg text-textPrimary dark:text-white mb-2">{faq.q}</Text>
            <Text className="text-textSecondary dark:text-gray-300 leading-5">{faq.a}</Text>
          </View>
        ))}

        <TouchableOpacity 
          className="bg-accent rounded-2xl py-4 flex-row justify-center items-center mt-4 mb-10"
          onPress={() => router.push('/support' as any)}
        >
          <Feather name="message-circle" color="#ffffff" size={20} />
          <Text className="text-white font-black text-lg ml-2">Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
