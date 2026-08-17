import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Platform, Modal , useColorScheme } from 'react-native';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCartStore } from '../../stores/cartStore';
import { useRouter, useGlobalSearchParams, useFocusEffect } from 'expo-router';
import { CATEGORIES } from '../../constants/categories';

export default function ProductsScreen() {
  const colorScheme = useColorScheme();
  const { category: initialCategory } = useGlobalSearchParams<{ category?: string }>();

  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productRatings, setProductRatings] = useState<Record<string, {avg: number, count: number}>>({});
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
    let isActive = true;
    let unsubscribeStock: (() => void) | undefined;

    const initData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'pharmacistProducts'), where('visibility', '==', 'customer'));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (!isActive) return;

        // Fetch stock in real-time
        unsubscribeStock = onSnapshot(collection(db, 'products'), (stockSnap) => {
          const stockMap: Record<string, number> = {};
          stockSnap.forEach(doc => {
            const d = doc.data();
            const s = typeof d.stock === 'number' && !isNaN(d.stock) ? d.stock : 0;
            
            if (stockMap[doc.id] === undefined) {
              stockMap[doc.id] = s;
            }
            if (d.productCode) {
              stockMap[d.productCode] = s;
            }
          });

          setProducts(prev => {
            const source = prev.length > 0 ? prev : items;
            return source.map(p => ({
              ...p,
              stock: stockMap[(p as any).stockId] ?? stockMap[(p as any).productCode] ?? (p as any).stock ?? 0
            }));
          });
        });

        // Fetch ratings
        const ratingsSnapshot = await getDocs(collection(db, 'productRatings'));
        const ratingsMap: Record<string, { sum: number, count: number }> = {};
        
        ratingsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.productId && data.rating > 0) {
            const pid = String(data.productId);
            if (!ratingsMap[pid]) ratingsMap[pid] = { sum: 0, count: 0 };
            ratingsMap[pid].sum += data.rating;
            ratingsMap[pid].count += 1;
          }
        });

        const finalRatings: Record<string, {avg: number, count: number}> = {};
        Object.keys(ratingsMap).forEach(key => {
          finalRatings[key] = {
            avg: ratingsMap[key].sum / ratingsMap[key].count,
            count: ratingsMap[key].count
          };
        });
        
        if (isActive) setProductRatings(finalRatings);

      } catch (error) {
        console.error("Error fetching products", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    if (user) {
      initData();
    } else {
      setLoading(false);
    }

    return () => {
      isActive = false;
      if (unsubscribeStock) unsubscribeStock();
    };
  }, [user]);

  React.useEffect(() => {
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
    <View className="flex-1 bg-primary dark:bg-gray-900">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 bg-white dark:bg-gray-800 border-b border-[#e5e7eb] dark:border-gray-700 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-textPrimary dark:text-white">
          {activeCategoryName}
        </Text>
        <View className="flex-row items-center">
          {(selectedCategory || sortOrder !== 'default') && (
            <TouchableOpacity 
              className="mr-3 px-3 py-1 bg-slate-100 dark:bg-gray-800 rounded-full flex-row items-center"
              onPress={() => {
                setSelectedCategory(undefined);
                setSortOrder('default');
              }}
            >
              <Text className="text-xs text-textSecondary dark:text-gray-300 font-bold mr-1">Clear</Text>
              <Feather name="x" size={12} color={colorScheme === 'dark' ? '#FFFFFF' : '#64748B'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            className={`w-10 h-10 rounded-full items-center justify-center ${
              (selectedCategory || sortOrder !== 'default') ? 'bg-blue-100' : 'bg-primary dark:bg-gray-900'
            }`}
            onPress={openFilterModal}
          >
            <Feather name="filter" color="#1a87e1" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 py-4 bg-white dark:bg-gray-800 shadow-sm mb-4">
        <View className="flex-row items-center bg-slate-100 dark:bg-gray-800 px-4 py-3 rounded-2xl">
          <Feather name="search" color={colorScheme === 'dark' ? '#FFFFFF' : '#64748B'} size={20} />
          <TextInput 
            placeholder="Search for medicines, vitamins..." 
            className="flex-1 ml-3 text-base text-textPrimary dark:text-white"
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
                  className="w-[48%] bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm border border-[#e5e7eb] dark:border-gray-700"
                  onPress={() => router.push(`/product/${product.id}`)}
                >
                  <View className="h-32 w-full bg-primary dark:bg-gray-900 rounded-xl mb-3 items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <Image source={{ uri: formatImageUrl(product.imageUrl) }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                      <MaterialCommunityIcons name={CATEGORIES.find(c => c.id === product.category)?.vectorIcon as any || "pill"} size={48} color="#1a87e1" />
                    )}
                  </View>
                  <Text className="font-bold text-textPrimary dark:text-white mb-1" numberOfLines={2}>{product.name || product.productName}</Text>
                  <Text className="text-xs text-textSecondary dark:text-gray-300 mb-1.5" numberOfLines={1}>
                    {CATEGORIES.find(c => c.id === product.category)?.name || product.category}
                  </Text>
                  
                  {/* Rating Stars */}
                  <View className="flex-row items-center mb-2">
                    <View className="flex-row mr-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const avg = productRatings[product.id]?.avg || 0;
                        let iconName = "star-outline";
                        if (avg >= star) iconName = "star";
                        else if (avg >= star - 0.5) iconName = "star-half";
                        return <Ionicons key={star} name={iconName as any} size={12} color="#f59e0b" />;
                      })}
                    </View>
                    <Text className="text-[10px] text-textSecondary dark:text-gray-300">
                      ({productRatings[product.id]?.count || 0})
                    </Text>
                  </View>
                  {/* Stock Info */}
                  <Text className={`text-[11px] font-bold mb-1 ${(product.stock || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(product.stock || 0) > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
                  </Text>
                  
                  <View className="flex-row justify-between items-center mt-auto">
                    <Text className="text-accent font-bold text-lg">Rs. {product.retailPrice || product.price}</Text>
                    
                    {(product.stock || 0) <= 0 ? (
                      <View className="bg-slate-200 w-8 h-8 rounded-full items-center justify-center">
                        <Feather name="slash" color="#94a3b8" size={16} />
                      </View>
                    ) : cartItem ? (
                      <View className="flex-row items-center bg-accent rounded-full h-8">
                        <TouchableOpacity 
                          onPress={() => addItem(product, -1)} 
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Feather name="minus" color="#ffffff" size={14} />
                        </TouchableOpacity>
                        <Text className="text-white font-bold px-1 text-sm">{cartItem.qty}</Text>
                        <TouchableOpacity 
                          onPress={() => cartItem.qty < (product.stock || 0) && addItem(product, 1)} 
                          className={`w-8 h-8 items-center justify-center ${cartItem.qty >= (product.stock || 0) ? 'opacity-50' : ''}`}
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
                <Text className="text-textSecondary dark:text-gray-300 text-base text-center">No products found matching your criteria.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl pt-6 pb-8 px-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-textPrimary dark:text-white">Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} className="w-8 h-8 bg-slate-100 dark:bg-gray-800 rounded-full items-center justify-center">
                <Feather name="x" size={18} color={colorScheme === 'dark' ? '#FFFFFF' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              {/* Sort Section */}
              <Text className="text-sm font-bold text-textPrimary dark:text-white mb-3 uppercase tracking-wider">Sort By</Text>
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
                        : 'bg-white dark:bg-gray-800 border-[#e5e7eb] dark:border-gray-700'
                    }`}
                    onPress={() => setTempSortOrder(sortOpt.id as any)}
                  >
                    <Text className={`font-semibold ${
                      tempSortOrder === sortOpt.id ? 'text-accent' : 'text-textSecondary dark:text-gray-300'
                    }`}>
                      {sortOpt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category Section */}
              <Text className="text-sm font-bold text-textPrimary dark:text-white mb-3 uppercase tracking-wider">Category</Text>
              <View className="flex-row flex-wrap gap-2 pb-4">
                <TouchableOpacity
                  className={`px-4 py-2.5 rounded-xl border ${
                    tempCategory === undefined
                      ? 'bg-blue-50 border-accent' 
                      : 'bg-white dark:bg-gray-800 border-[#e5e7eb] dark:border-gray-700'
                  }`}
                  onPress={() => setTempCategory(undefined)}
                >
                  <Text className={`font-semibold ${
                    tempCategory === undefined ? 'text-accent' : 'text-textSecondary dark:text-gray-300'
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
                        : 'bg-white dark:bg-gray-800 border-[#e5e7eb] dark:border-gray-700'
                    }`}
                    onPress={() => setTempCategory(cat.id)}
                  >
                    <MaterialCommunityIcons 
                      name={cat.vectorIcon as any} 
                      size={18} 
                      color={tempCategory === cat.id ? '#1a87e1' : '#64748B'} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text className={`font-semibold ${
                      tempCategory === cat.id ? 'text-accent' : 'text-textSecondary dark:text-gray-300'
                    }`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View className="flex-row gap-3 pt-4 border-t border-[#e5e7eb] dark:border-gray-700">
              <TouchableOpacity 
                className="flex-1 py-4 bg-slate-100 dark:bg-gray-800 rounded-2xl items-center justify-center"
                onPress={clearFilters}
              >
                <Text className="font-bold text-textSecondary dark:text-gray-300 text-base">Reset</Text>
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
