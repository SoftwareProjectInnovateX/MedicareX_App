import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useCartStore } from '../../stores/cartStore';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function CartScreen() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const router = useRouter();

  // Helper for physical device localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    return url.replace('localhost', '10.207.127.9').replace('127.0.0.1', '10.207.127.9');
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.retailPrice || item.price) * item.qty, 0);

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 bg-white shadow-sm border-b border-[#e5e7eb] flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-textPrimary">My Cart</Text>
        <View className="bg-primary px-3 py-1 rounded-full">
          <Text className="text-accent font-bold">{items.length} Items</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-24 h-24 bg-slate-100 rounded-full items-center justify-center mb-6">
              <Text className="text-4xl">🛒</Text>
            </View>
            <Text className="text-xl font-bold text-textPrimary mb-2">Your cart is empty</Text>
            <Text className="text-textSecondary text-center mb-8">Looks like you haven't added any items to your cart yet.</Text>
            <TouchableOpacity 
              className="bg-accent px-8 py-4 rounded-full"
              onPress={() => router.push('/products')}
            >
              <Text className="text-white font-bold text-base">Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="pb-8">
            {items.map((item) => (
              <View key={item.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#e5e7eb] flex-row items-center">
                <View className="w-20 h-20 bg-primary rounded-xl items-center justify-center mr-4">
                  {item.imageUrl ? (
                    <Image source={{ uri: formatImageUrl(item.imageUrl) }} className="w-16 h-16" resizeMode="contain" />
                  ) : (
                    <Text className="text-3xl">💊</Text>
                  )}
                </View>
                
                <View className="flex-1">
                  <Text className="font-bold text-textPrimary mb-1">{item.name}</Text>
                  <Text className="text-accent font-bold mb-3">Rs. {item.retailPrice || item.price}</Text>
                  
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center bg-primary rounded-lg">
                      <TouchableOpacity 
                        className="w-8 h-8 items-center justify-center"
                        onPress={() => {
                          if (item.qty > 1) updateQuantity(item.id, item.qty - 1);
                        }}
                      >
                        <Feather name="minus" color="#64748B" size={16} />
                      </TouchableOpacity>
                      <Text className="font-bold text-textPrimary px-2">{item.qty}</Text>
                      <TouchableOpacity 
                        className="w-8 h-8 items-center justify-center"
                        onPress={() => updateQuantity(item.id, item.qty + 1)}
                      >
                        <Feather name="plus" color="#1a87e1" size={16} />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity 
                      className="w-8 h-8 bg-red-50 rounded-full items-center justify-center"
                      onPress={() => removeItem(item.id)}
                    >
                      <Feather name="trash-2" color="#EF4444" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Checkout Bar */}
      {items.length > 0 && (
        <View className="bg-white px-6 py-6 border-t border-[#e5e7eb] shadow-lg">
          <View className="flex-row justify-between mb-4">
            <Text className="text-textSecondary font-medium text-base">Total Amount</Text>
            <Text className="text-2xl font-bold text-accent">Rs. {totalAmount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity 
            className="bg-accent rounded-2xl py-4 flex-row justify-center items-center"
            onPress={() => router.push('/checkout')}
          >
            <Text className="text-white font-bold text-lg mr-2">Proceed to Checkout</Text>
            <Feather name="arrow-right" color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
