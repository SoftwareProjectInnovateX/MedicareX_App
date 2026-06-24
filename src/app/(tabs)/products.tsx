import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCartStore } from '../../stores/cartStore';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { CATEGORIES } from '../../constants/categories';

export default function ProductsScreen() {
  const { category: initialCategory } = useGlobalSearchParams<{ category?: string }>();

  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);
  
  const router = useRouter();
  const { user } = useAuth();

  // Helper for physical device localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    return url.replace('localhost', '10.207.127.9').replace('127.0.0.1', '10.207.127.9');
  };

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // We fetch all products and filter locally.
      // Now that we use the same category IDs as the web app, exact matching works perfectly.
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

  useEffect(() => {
    let result = products;
    if (selectedCategory) {
      // Exact match with id since both web and mobile now use the same CATEGORIES structure
      result = result.filter(p => p.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(p => {
        const pName = p.name || p.productName || '';
        return pName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    setFilteredProducts(result);
  }, [products, searchQuery, selectedCategory]);

  const activeCategoryName = CATEGORIES.find(c => c.id === selectedCategory)?.name || 'All Products';

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 bg-white border-b border-[#e5e7eb] flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-textPrimary">
          {activeCategoryName}
        </Text>
        <View className="flex-row items-center">
          {selectedCategory && (
            <TouchableOpacity 
              className="mr-3 px-3 py-1 bg-slate-100 rounded-full"
              onPress={() => setSelectedCategory(undefined)}
            >
              <Text className="text-xs text-textSecondary font-bold">Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity className="w-10 h-10 bg-primary rounded-full items-center justify-center">
            <Feather name="filter" color="#1a87e1" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 py-4 bg-white shadow-sm mb-4">
        <View className="flex-row items-center bg-slate-100 px-4 py-3 rounded-2xl">
          <Feather name="search" color="#64748B" size={20} />
          <TextInput 
            placeholder="Search for medicines, vitamins..." 
            className="flex-1 ml-3 text-base text-textPrimary"
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" color="#94A3B8" size={20} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Product Grid */}
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#1a87e1" size="large" className="mt-8" />
        ) : (
          <View className="flex-row flex-wrap justify-between pb-8">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#e5e7eb]"
                  onPress={() => router.push(`/product/${product.id}`)}
                >
                  <View className="h-32 w-full bg-primary rounded-xl mb-3 items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <Image source={{ uri: formatImageUrl(product.imageUrl) }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                      <MaterialCommunityIcons name={CATEGORIES.find(c => c.id === product.category)?.vectorIcon as any || "pill"} size={48} color="#1a87e1" />
                    )}
                  </View>
                  <Text className="font-bold text-textPrimary mb-1" numberOfLines={2}>{product.name || product.productName}</Text>
                  <Text className="text-xs text-textSecondary mb-2" numberOfLines={1}>
                    {CATEGORIES.find(c => c.id === product.category)?.name || product.category}
                  </Text>
                  
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
              ))
            ) : (
              <View className="flex-1 items-center justify-center py-10">
                <Feather name="inbox" size={48} color="#94A3B8" className="mb-4" />
                <Text className="text-textSecondary text-base text-center">No products found in this category.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
