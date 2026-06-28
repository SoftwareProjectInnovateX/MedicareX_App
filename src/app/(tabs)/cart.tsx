import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useCartStore } from '../../stores/cartStore';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CartScreen() {
  const { items, removeItem, addItem, clearCart } = useCartStore();
  const router = useRouter();

  // Helper for physical device & emulator localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    const hostIp = Platform.OS === 'android' ? '10.0.2.2' : '10.207.127.9';
    return url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const courierCharge = items.length > 0 ? 400.00 : 0;
  const tax = 0.00;
  const totalAmount = subtotal + courierCharge + tax;

  return (
    <SafeAreaView className="flex-1 bg-primary">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-[#e5e7eb] bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary">Shopping Cart</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-24 h-24 bg-slate-100 rounded-full items-center justify-center mb-6">
              <Feather name="shopping-cart" size={40} color="#64748b" />
            </View>
            <Text className="text-xl font-bold text-textPrimary mb-2">Your cart is empty</Text>
            <Text className="text-textSecondary text-center mb-8">Looks like you haven't added any items to your cart yet.</Text>
            <TouchableOpacity 
              className="bg-accent px-8 py-4 rounded-xl"
              onPress={() => router.push('/products')}
            >
              <Text className="text-white font-bold text-base">Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="pb-8">
            {/* Cart Items */}
            {items.map((item) => (
              <View key={item.id} className="bg-white rounded-xl p-4 mb-4 border border-[#e5e7eb] flex-row items-center justify-between shadow-sm">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-slate-50 rounded-lg items-center justify-center mr-4 overflow-hidden border border-[#e5e7eb]">
                    {item.imageUrl ? (
                      <Image source={{ uri: formatImageUrl(item.imageUrl) }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                      <MaterialCommunityIcons name="pill" size={24} color="#1a87e1" />
                    )}
                  </View>
                  
                  <View className="flex-1">
                    <Text className="font-bold text-textPrimary mb-1" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-textSecondary text-xs">Rs. {item.price.toFixed(2)} each</Text>
                  </View>
                </View>

                <View className="flex-row items-center ml-2">
                  <View className="flex-row items-center mr-4">
                    <TouchableOpacity 
                      className="w-8 h-8 bg-red-50 rounded items-center justify-center border border-red-100"
                      onPress={() => {
                        if (item.qty > 1) addItem(item, -1);
                        else removeItem(item.id!);
                      }}
                    >
                      <Feather name={item.qty === 1 ? "trash-2" : "minus"} color="#ef4444" size={14} />
                    </TouchableOpacity>
                    
                    <Text className="font-bold text-textPrimary px-3">{item.qty}</Text>
                    
                    <TouchableOpacity 
                      className="w-8 h-8 bg-blue-50 rounded items-center justify-center border border-blue-100"
                      onPress={() => addItem(item, 1)}
                    >
                      <Feather name="plus" color="#1a87e1" size={14} />
                    </TouchableOpacity>
                  </View>

                  <Text className="font-bold text-textPrimary mr-3 min-w-[80px] text-right">
                    Rs. {(item.price * item.qty).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Order Summary */}
            <View className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm mt-2 mb-6">
              <View className="flex-row justify-between mb-3">
                <Text className="text-textSecondary">Subtotal</Text>
                <Text className="font-bold text-textPrimary">Rs. {subtotal.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between mb-3">
                <Text className="text-textSecondary">Courier Charge</Text>
                <Text className="font-bold text-textPrimary">Rs. {courierCharge.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-textSecondary">Tax (0%)</Text>
                <Text className="font-bold text-textPrimary">Rs. {tax.toFixed(2)}</Text>
              </View>
              
              <View className="border-t border-[#e5e7eb] pt-4 flex-row justify-between items-center">
                <Text className="font-bold text-lg text-textPrimary">Total</Text>
                <Text className="font-bold text-lg text-textPrimary">Rs. {totalAmount.toFixed(2)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-col gap-4">
              <TouchableOpacity 
                className="bg-accent py-4 rounded-xl items-center w-full shadow-sm"
                onPress={() => router.push('/checkout')}
              >
                <Text className="text-white font-bold text-lg">Proceed to Checkout</Text>
              </TouchableOpacity>
              
              <View className="flex-row items-center justify-between mt-2">
                <TouchableOpacity 
                  className="bg-red-50 px-4 py-3 rounded-lg flex-row items-center"
                  onPress={() => clearCart()}
                >
                  <Feather name="trash-2" size={16} color="#ef4444" />
                  <Text className="text-red-500 font-bold ml-2">Clear Cart</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  className="px-4 py-3 flex-row items-center"
                  onPress={() => router.push('/products')}
                >
                  <Feather name="arrow-left" size={16} color="#64748b" />
                  <Text className="text-textSecondary ml-2">Continue Shopping</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
