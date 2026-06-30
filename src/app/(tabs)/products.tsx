import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Platform, Modal } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);
  const [sortOrder, setSortOrder] = useState<'default' | 'priceAsc' | 'priceDesc'>('default');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Temporary states for the modal to allow applying filters at once
  const [tempCategory, setTempCategory] = useState<string | undefined>(initialCategory);
  const [tempSortOrder, setTempSortOrder] = useState<'default' | 'priceAsc' | 'priceDesc'>('default');

  const router = useRouter();
  const { user } = useAuth();
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);

  // Helper for physical device & emulator localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    const hostIp = Platform.OS === 'android' ? '10.0.2.2' : '10.207.127.9';
    return url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
  };

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      setTempCategory(initialCategory);
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
      const q = query(collection(db, 'pharmacistProducts'), where('visibility', '==', 'customer'));
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
    let result = [...products];
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(p => {
        const pName = p.name || p.productName || '';
        return pName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    
    if (sortOrder === 'priceAsc') {
      result.sort((a, b) => {
        const priceA = Number(a.retailPrice || a.price || 0);
        const priceB = Number(b.retailPrice || b.price || 0);
        return priceA - priceB;
      });
    } else if (sortOrder === 'priceDesc') {
      result.sort((a, b) => {
        const priceA = Number(a.retailPrice || a.price || 0);
        const priceB = Number(b.retailPrice || b.price || 0);
        return priceB - priceA;
      });
    }
    
    setFilteredProducts(result);
  }, [products, searchQuery, selectedCategory, sortOrder]);

  const activeCategoryName = CATEGORIES.find(c => c.id === selectedCategory)?.name || 'All Products';

  const getCartItem = (product: any) => {
    const prodId = String(product.id || product.productId || product.productCode);
    return cartItems.find((item) => String(item.productId) === prodId);
  };

  const openFilterModal = () => {
    setTempCategory(selectedCategory);
    setTempSortOrder(sortOrder);
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setSelectedCategory(tempCategory);
    setSortOrder(tempSortOrder);
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setTempCategory(undefined);
    setTempSortOrder('default');
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 bg-white border-b border-[#e5e7eb] flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-textPrimary">
          {activeCategoryName}
        </Text>
        <View className="flex-row items-center">
          {(selectedCategory || sortOrder !== 'default') && (
            <TouchableOpacity 
              className="mr-3 px-3 py-1 bg-slate-100 rounded-full flex-row items-center"
              onPress={() => {
                setSelectedCategory(undefined);
                setSortOrder('default');
              }}
            >
              <Text className="text-xs text-textSecondary font-bold mr-1">Clear</Text>
              <Feather name="x" size={12} color="#64748B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            className={`w-10 h-10 rounded-full items-center justify-center ${
              (selectedCategory || sortOrder !== 'default') ? 'bg-blue-100' : 'bg-primary'
            }`}
            onPress={openFilterModal}
          >
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
              filteredProducts.map((product) => {
                const cartItem = getCartItem(product);
                
                return (
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
                    
                    {cartItem ? (
                      <View className="flex-row items-center bg-accent rounded-full h-8">
                        <TouchableOpacity 
                          onPress={() => addItem(product, -1)} 
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Feather name="minus" color="#ffffff" size={14} />
                        </TouchableOpacity>
                        <Text className="text-white font-bold px-1 text-sm">{cartItem.qty}</Text>
                        <TouchableOpacity 
                          onPress={() => addItem(product, 1)} 
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Feather name="plus" color="#ffffff" size={14} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        className="bg-accent w-8 h-8 rounded-full items-center justify-center"
                        onPress={() => addItem(product, 1)}
                      >
                        <Feather name="plus" color="#ffffff" size={20} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
                );
              })
            ) : (
              <View className="flex-1 items-center justify-center py-10">
                <Feather name="inbox" size={48} color="#94A3B8" className="mb-4" />
                <Text className="text-textSecondary text-base text-center">No products found matching your criteria.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl pt-6 pb-8 px-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-textPrimary">Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              {/* Sort Section */}
              <Text className="text-sm font-bold text-textPrimary mb-3 uppercase tracking-wider">Sort By</Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {[
                  { id: 'default', label: 'Recommended' },
                  { id: 'priceAsc', label: 'Price: Low to High' },
                  { id: 'priceDesc', label: 'Price: High to Low' }
                ].map(sortOpt => (
                  <TouchableOpacity
                    key={sortOpt.id}
                    className={`px-4 py-2.5 rounded-xl border ${
                      tempSortOrder === sortOpt.id 
                        ? 'bg-blue-50 border-accent' 
                        : 'bg-white border-[#e5e7eb]'
                    }`}
                    onPress={() => setTempSortOrder(sortOpt.id as any)}
                  >
                    <Text className={`font-semibold ${
                      tempSortOrder === sortOpt.id ? 'text-accent' : 'text-textSecondary'
                    }`}>
                      {sortOpt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category Section */}
              <Text className="text-sm font-bold text-textPrimary mb-3 uppercase tracking-wider">Category</Text>
              <View className="flex-row flex-wrap gap-2 pb-4">
                <TouchableOpacity
                  className={`px-4 py-2.5 rounded-xl border ${
                    tempCategory === undefined
                      ? 'bg-blue-50 border-accent' 
                      : 'bg-white border-[#e5e7eb]'
                  }`}
                  onPress={() => setTempCategory(undefined)}
                >
                  <Text className={`font-semibold ${
                    tempCategory === undefined ? 'text-accent' : 'text-textSecondary'
                  }`}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    className={`px-4 py-2.5 rounded-xl border flex-row items-center ${
                      tempCategory === cat.id 
                        ? 'bg-blue-50 border-accent' 
                        : 'bg-white border-[#e5e7eb]'
                    }`}
                    onPress={() => setTempCategory(cat.id)}
                  >
                    <Text className="mr-1.5 text-base">{cat.icon}</Text>
                    <Text className={`font-semibold ${
                      tempCategory === cat.id ? 'text-accent' : 'text-textSecondary'
                    }`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View className="flex-row gap-3 pt-4 border-t border-[#e5e7eb]">
              <TouchableOpacity 
                className="flex-1 py-4 bg-slate-100 rounded-2xl items-center justify-center"
                onPress={clearFilters}
              >
                <Text className="font-bold text-textSecondary text-base">Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-[2] py-4 bg-accent rounded-2xl items-center justify-center shadow-lg shadow-accent/30"
                onPress={applyFilters}
              >
                <Text className="font-bold text-white text-base">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
