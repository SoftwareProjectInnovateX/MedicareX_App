import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Feather } from '@expo/vector-icons';
import { useCartStore } from '../../stores/cartStore';
import { CATEGORIES } from '../../constants/categories';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore(state => state.addItem);

  // Helper for physical device & emulator localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    const hostIp = Platform.OS === 'android' ? '10.0.2.2' : '10.207.127.9';
    return url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
  };

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      const docRef = doc(db, 'pharmacistProducts', id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("No such product!");
      }
    } catch (error) {
      console.error("Error fetching product", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#1a87e1" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-primary items-center justify-center px-6">
        <Feather name="alert-circle" size={48} color="#94A3B8" />
        <Text className="text-xl font-bold text-textPrimary mt-4 text-center">Product Not Found</Text>
        <Text className="text-textSecondary text-center mt-2">The product you are looking for does not exist.</Text>
        <TouchableOpacity 
          className="mt-8 bg-accent px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const price = product.retailPrice || product.price;

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="absolute top-0 left-0 right-0 z-10 flex-row justify-between items-center px-6 pt-14 pb-4">
        <TouchableOpacity 
          className="w-10 h-10 bg-white/80 rounded-full items-center justify-center backdrop-blur-md shadow-sm"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" color="#1E293B" size={20} />
        </TouchableOpacity>
        <TouchableOpacity 
          className="w-10 h-10 bg-white/80 rounded-full items-center justify-center backdrop-blur-md shadow-sm"
          onPress={() => router.push('/cart')}
        >
          <Feather name="shopping-cart" color="#1E293B" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Image Area */}
        <View className="h-96 bg-white w-full items-center justify-center rounded-b-[40px] shadow-sm pt-20 overflow-hidden">
          {product.imageUrl ? (
            <Image 
              source={{ uri: formatImageUrl(product.imageUrl) }} 
              className="w-[80%] h-[80%]" 
              resizeMode="contain" 
            />
          ) : (
            <Text className="text-8xl">📦</Text>
          )}
        </View>

        {/* Product Info */}
        <View className="px-6 py-8">
          <View className="flex-row items-center mb-3">
            <View className="bg-accentLight px-3 py-1 rounded-full">
              <Text className="text-textPrimary text-xs font-bold">
                {CATEGORIES.find(c => c.id === product.category)?.name || product.category || 'Medicine'}
              </Text>
            </View>
            {product.prescriptionRequired && (
              <View className="bg-orange-100 px-3 py-1 rounded-full ml-2 flex-row items-center">
                <Feather name="file-text" color="#C2410C" size={12} />
                <Text className="text-orange-800 text-xs font-bold ml-1">Prescription</Text>
              </View>
            )}
          </View>

          <Text className="text-3xl font-extrabold text-textPrimary mb-2 leading-tight">{product.name || product.productName}</Text>
          
          <Text className="text-2xl font-bold text-accent mb-6">Rs. {price}</Text>

          <View className="mb-6">
            <Text className="text-lg font-bold text-textPrimary mb-2">Description</Text>
            <Text className="text-textSecondary leading-relaxed text-base">
              {product.description || 'No description available for this product.'}
            </Text>
          </View>

          {/* Supplier Info if available */}
          {product.supplierId && (
            <View className="flex-row items-center bg-white p-4 rounded-2xl shadow-sm border border-[#e5e7eb] mb-6">
              <View className="w-12 h-12 bg-primary rounded-full items-center justify-center mr-4">
                <Feather name="truck" color="#1a87e1" size={20} />
              </View>
              <View>
                <Text className="text-sm text-textSecondary font-medium">Supplier Code</Text>
                <Text className="text-base font-bold text-textPrimary">{product.supplierId}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="bg-white px-6 py-6 border-t border-[#e5e7eb] flex-row items-center justify-between">
        <View className="flex-row items-center bg-slate-100 rounded-full p-1">
          <TouchableOpacity 
            className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm"
            onPress={() => setQty(prev => prev > 1 ? prev - 1 : 1)}
          >
            <Feather name="minus" color="#1E293B" size={20} />
          </TouchableOpacity>
          <Text className="w-10 text-center font-bold text-lg text-textPrimary">{qty}</Text>
          <TouchableOpacity 
            className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm"
            onPress={() => setQty(prev => prev + 1)}
          >
            <Feather name="plus" color="#1E293B" size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className="flex-1 ml-6 bg-accent h-14 rounded-full flex-row items-center justify-center shadow-md shadow-accent/30"
          onPress={() => {
            // Need to pass the custom qty
            const cartItem = { ...product, qty };
            // Since store's addItem usually defaults to qty 1 or increments if exists,
            // we will call addItem 'qty' times or implement a custom bulk add.
            // For simplicity with existing store, we can just call addItem once and it adds qty 1.
            // To add multiple, we loop.
            for(let i = 0; i < qty; i++) {
              addItem(product);
            }
            router.push('/cart');
          }}
        >
          <Feather name="shopping-bag" color="#ffffff" size={20} />
          <Text className="text-white font-bold text-lg ml-2">Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
