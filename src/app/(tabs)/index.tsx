import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCartStore } from '../../stores/cartStore';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Helper for physical device localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    return url.replace('localhost', '10.160.86.9').replace('127.0.0.1', '10.160.86.9');
  };
  
  const cartItems = useCartStore(state => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  useEffect(() => {
    if (user) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'adminProducts'), limit(6));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length > 0) {
        console.log("--- DEBUG: FIRST PRODUCT IMAGE URL ---");
        console.log("Product Name:", items[0].name);
        console.log("Raw URL:", items[0].imageUrl);
        console.log("Formatted URL:", formatImageUrl(items[0].imageUrl));
        console.log("--------------------------------------");
      }
      setProducts(items);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: 'Medicines', icon: '💊' },
    { name: 'Wellness', icon: '🌿' },
    { name: 'Devices', icon: '🩺' },
    { name: 'Personal Care', icon: '🧴' },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      {/* Top Brand Header */}
      <View className="pt-14 pb-3 bg-white px-6 flex-row justify-between items-center shadow-sm z-10">
        <View className="flex-row items-center">
          <View className="bg-teal-600 p-2 rounded-xl mr-3 shadow-sm">
            <MaterialCommunityIcons name="shield-plus" color="#ffffff" size={24} />
          </View>
          <View>
            <Text className="text-xl font-extrabold text-teal-800 tracking-tight">MedicareX</Text>
            <Text className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">Pharmacy</Text>
          </View>
        </View>
        <View className="flex-row items-center space-x-5">
          <TouchableOpacity>
            <Feather name="bell" color="#1E293B" size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/cart')} className="relative ml-4">
            <Feather name="shopping-cart" color="#1E293B" size={24} />
            {cartCount > 0 && (
              <View className="absolute -top-2 -right-2 bg-red-500 w-5 h-5 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Delivery & Search Area */}
        <View className="px-6 py-4 bg-teal-50 rounded-b-3xl mb-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Feather name="map-pin" color="#0D9488" size={18} />
              <View className="ml-2">
                <Text className="text-xs text-slate-500">Deliver to</Text>
                <Text className="text-sm font-bold text-slate-800">Colombo, Sri Lanka</Text>
              </View>
            </View>
          </View>
          
          <View className="flex-row items-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-teal-100">
            <Feather name="search" color="#64748B" size={20} />
            <TextInput 
              placeholder="Search medicine..." 
              className="flex-1 ml-3 text-base text-slate-800"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View className="px-6 py-6">
          {/* Promotional Banner */}
          <View className="bg-teal-600 rounded-2xl p-6 flex-row justify-between items-center mb-8 shadow-sm">
            <View className="flex-1 pr-4">
              <Text className="text-teal-100 font-semibold mb-1">Special Offer</Text>
              <Text className="text-white text-2xl font-bold mb-4 leading-tight">Get 20%{"\n"}Discount</Text>
              <TouchableOpacity className="bg-white px-5 py-2 rounded-full self-start">
                <Text className="text-teal-700 font-bold">Shop Now</Text>
              </TouchableOpacity>
            </View>
            <View className="w-24 h-24 bg-teal-500 rounded-full items-center justify-center">
               <Text className="text-5xl">💊</Text>
            </View>
          </View>

          {/* Categories */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-slate-800">Categories</Text>
              <TouchableOpacity>
                <Text className="text-teal-600 font-semibold">See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              {categories.map((cat, index) => (
                <TouchableOpacity key={index} className="items-center mr-6">
                  <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 mb-2">
                    <Text className="text-2xl">{cat.icon}</Text>
                  </View>
                  <Text className="text-xs text-slate-600 font-medium">{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Popular Products */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-slate-800">Popular Products</Text>
              <TouchableOpacity onPress={() => router.push('/products')}>
                <Text className="text-teal-600 font-semibold">See All</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#0D9488" size="large" className="mt-8" />
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {products.map((product) => (
                  <TouchableOpacity 
                    key={product.id} 
                    className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-100"
                    onPress={() => router.push(`/product/${product.id}`)}
                  >
                    <View className="h-32 w-full bg-slate-50 rounded-xl mb-3 items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <Image source={{ uri: formatImageUrl(product.imageUrl) }} className="w-full h-full" resizeMode="contain" />
                      ) : (
                        <Text className="text-4xl">📦</Text>
                      )}
                    </View>
                    <Text className="font-bold text-slate-800 mb-1" numberOfLines={1}>{product.name}</Text>
                    <Text className="text-xs text-slate-500 mb-2" numberOfLines={1}>{product.category}</Text>
                    
                    <View className="flex-row justify-between items-center mt-auto">
                      <Text className="text-teal-600 font-bold text-lg">Rs. {product.retailPrice || product.price}</Text>
                      <TouchableOpacity 
                        className="bg-teal-600 w-8 h-8 rounded-full items-center justify-center"
                        onPress={() => useCartStore.getState().addItem(product)}
                      >
                        <Feather name="plus" color="#ffffff" size={20} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

            )}
          </View>
        </View>

        {/* Footer Section */}
        <View className="bg-teal-900 pt-10 pb-24 px-8 mt-4 rounded-t-[40px]">
          <View className="items-center mb-8">
            <View className="bg-white/10 p-4 rounded-full mb-4">
              <MaterialCommunityIcons name="shield-plus" color="#ffffff" size={32} />
            </View>
            <Text className="text-2xl font-bold text-white mb-2">MedicareX</Text>
            <Text className="text-teal-100 text-center px-4 leading-relaxed">
              Your trusted online pharmacy for total healthcare. Delivering excellence in medicines and personal care to the community.
            </Text>
          </View>

          <View className="space-y-4 mb-10">
            <Text className="text-white font-bold text-lg mb-2">Quick Links</Text>
            {['About Us', 'Upload Prescription', 'Terms & Conditions', 'Privacy Policy'].map((link, idx) => (
              <TouchableOpacity key={idx} className="flex-row items-center border-b border-teal-800/50 pb-3">
                <Feather name="chevron-right" color="#5EEAD4" size={16} />
                <Text className="text-teal-100 ml-3 text-base">{link}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="space-y-4 mb-10">
            <Text className="text-white font-bold text-lg mb-2">Contact Us</Text>
            
            <View className="flex-row items-start mb-3">
              <View className="bg-teal-800 p-2 rounded-lg mr-4">
                <Feather name="phone" color="#5EEAD4" size={20} />
              </View>
              <View>
                <Text className="text-teal-100 text-sm">Call Us</Text>
                <Text className="text-white font-bold text-base mt-1">+94 112 345 678</Text>
              </View>
            </View>

            <View className="flex-row items-start mb-3">
              <View className="bg-teal-800 p-2 rounded-lg mr-4">
                <Feather name="mail" color="#5EEAD4" size={20} />
              </View>
              <View>
                <Text className="text-teal-100 text-sm">Email</Text>
                <Text className="text-white font-bold text-base mt-1">care@medicarex.lk</Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="bg-teal-800 p-2 rounded-lg mr-4">
                <Feather name="map-pin" color="#5EEAD4" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-teal-100 text-sm">Location</Text>
                <Text className="text-white font-bold text-base mt-1 leading-snug">No 123, Galle Road, Colombo 03, Sri Lanka</Text>
              </View>
            </View>
          </View>

          <View className="flex-row justify-center space-x-6 mb-8 border-t border-teal-800 pt-8">
            <TouchableOpacity className="bg-teal-800 p-3 rounded-full mr-4">
              <MaterialCommunityIcons name="facebook" color="#ffffff" size={24} />
            </TouchableOpacity>
            <TouchableOpacity className="bg-teal-800 p-3 rounded-full">
              <MaterialCommunityIcons name="instagram" color="#ffffff" size={24} />
            </TouchableOpacity>
          </View>

          <Text className="text-teal-500 text-center text-xs">
            © {new Date().getFullYear()} MedicareX Pharmacy. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
