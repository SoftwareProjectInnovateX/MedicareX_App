import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCartStore } from '../../stores/cartStore';
import { useRouter } from 'expo-router';

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper for physical device localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    return url.replace('localhost', '10.160.86.9').replace('127.0.0.1', '10.160.86.9');
  };

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'adminProducts'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 bg-white border-b border-[#e5e7eb] flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-textPrimary">All Products</Text>
        <TouchableOpacity className="w-10 h-10 bg-primary rounded-full items-center justify-center">
          <Feather name="filter" color="#1a87e1" size={20} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="px-6 py-4 bg-white shadow-sm mb-4">
        <View className="flex-row items-center bg-slate-100 px-4 py-3 rounded-2xl">
          <Feather name="search" color="#64748B" size={20} />
          <TextInput 
            placeholder="Search for medicines, vitamins..." 
            className="flex-1 ml-3 text-base text-textPrimary"
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      {/* Product Grid */}
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#1a87e1" size="large" className="mt-8" />
        ) : (
          <View className="flex-row flex-wrap justify-between pb-8">
            {products.map((product) => (
              <TouchableOpacity 
                key={product.id} 
                className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#e5e7eb]"
                onPress={() => router.push(`/product/${product.id}`)}
              >
                <View className="h-32 w-full bg-primary rounded-xl mb-3 items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <Image source={{ uri: formatImageUrl(product.imageUrl) }} className="w-full h-full" resizeMode="contain" />
                  ) : (
                    <Text className="text-4xl">💊</Text>
                  )}
                </View>
                <Text className="font-bold text-textPrimary mb-1" numberOfLines={2}>{product.name}</Text>
                <Text className="text-xs text-textSecondary mb-2" numberOfLines={1}>{product.category}</Text>
                
                <View className="flex-row justify-between items-center mt-auto">
                  <Text className="text-accent font-bold text-lg">Rs. {product.retailPrice || product.price}</Text>
                  <TouchableOpacity 
                    className="bg-accent w-8 h-8 rounded-full items-center justify-center"
                    onPress={() => useCartStore.getState().addItem(product)}
                  >
                    <Feather name="plus" color="#ffffff" size={20} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
