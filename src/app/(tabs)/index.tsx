import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCartStore } from '../../stores/cartStore';
import { useLocationStore } from '../../stores/locationStore';
import { CATEGORIES } from '../../constants/categories';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const { address } = useLocationStore();
  
  // Helper for physical device localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    return url.replace('localhost', '10.207.127.9').replace('127.0.0.1', '10.207.127.9');
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
      // Fetch up to 20 products for the popular section instead of strictly 6
      const q = query(collection(db, 'adminProducts'), limit(20));
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
      {/* Top Brand Header */}
      <View className="pt-14 pb-3 bg-white px-6 flex-row justify-between items-center shadow-sm z-10">
        <View className="flex-row items-center">
          <View className="bg-accent p-2 rounded-xl mr-3 shadow-sm">
            <MaterialCommunityIcons name="shield-plus" color="#ffffff" size={24} />
          </View>
          <View>
            <Text className="text-xl font-extrabold text-textPrimary tracking-tight">MedicareX</Text>
            <Text className="text-[10px] text-accent font-bold uppercase tracking-widest">Pharmacy</Text>
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
        <View className="px-6 py-4 bg-primary rounded-b-3xl mb-6 shadow-sm">
          <TouchableOpacity 
            className="flex-row items-center justify-between mb-4"
            onPress={() => router.push('/location-selector')}
          >
            <View className="flex-row items-center">
              <Feather name="map-pin" color="#1a87e1" size={18} />
              <View className="ml-2">
                <Text className="text-xs text-textSecondary">Deliver to</Text>
                <Text className="text-sm font-bold text-textPrimary" numberOfLines={1} style={{ maxWidth: 250 }}>{address}</Text>
              </View>
            </View>
            <Feather name="chevron-down" color="#1a87e1" size={16} />
          </TouchableOpacity>
          
          <View className="flex-row items-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-accentLight">
            <Feather name="search" color="#64748B" size={20} />
            <TextInput 
              placeholder="Search medicine..." 
              className="flex-1 ml-3 text-base text-textPrimary"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View className="px-6 py-6">
          {/* Promotional Banner */}
          <View className="bg-accent rounded-2xl p-6 flex-row justify-between items-center mb-8 shadow-sm">
            <View className="flex-1 pr-4">
              <Text className="text-accentLight font-semibold mb-1">Special Offer</Text>
              <Text className="text-white text-2xl font-bold mb-4 leading-tight">Get 20%{"\n"}Discount</Text>
              <TouchableOpacity className="bg-white px-5 py-2 rounded-full self-start">
                <Text className="text-accent font-bold">Shop Now</Text>
              </TouchableOpacity>
            </View>
            <View className="w-24 h-24 bg-primary0 rounded-full items-center justify-center">
               <MaterialCommunityIcons name="medical-bag" size={48} color="#1a87e1" />
            </View>
          </View>

          {/* Quick Access Section */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-textPrimary">Quick Access</Text>
            </View>
            <View className="flex-row flex-wrap justify-between">
              <TouchableOpacity 
                className="w-[48%] bg-accentLight border border-accent rounded-2xl p-4 items-center mb-4"
                onPress={() => router.push('/products')}
              >
                <Feather name="shopping-bag" color="#1a87e1" size={32} className="mb-2" />
                <Text className="text-textPrimary font-semibold mb-1 text-center">Shop Products</Text>
                <Text className="text-textSecondary text-xs text-center">Browse catalog</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="w-[48%] bg-accentLight border border-accent rounded-2xl p-4 items-center mb-4"
                onPress={() => router.push('/brands')}
              >
                <Feather name="star" color="#1a87e1" size={32} className="mb-2" />
                <Text className="text-textPrimary font-semibold mb-1 text-center">Explore Brands</Text>
                <Text className="text-textSecondary text-xs text-center">Trusted makers</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-[48%] bg-accentLight border border-accent rounded-2xl p-4 items-center"
                onPress={() => router.push('/orders')}
              >
                <Feather name="heart" color="#1a87e1" size={32} className="mb-2" />
                <Text className="text-textPrimary font-semibold mb-1 text-center">My Orders</Text>
                <Text className="text-textSecondary text-xs text-center">Track purchases</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-[48%] bg-accentLight border border-accent rounded-2xl p-4 items-center"
                onPress={() => router.push('/prescription')}
              >
                <MaterialCommunityIcons name="file-document-outline" color="#1a87e1" size={32} className="mb-2" />
                <Text className="text-textPrimary font-semibold mb-1 text-center">Upload Rx</Text>
                <Text className="text-textSecondary text-xs text-center">Get delivered</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Categories */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-textPrimary">Categories</Text>
              <TouchableOpacity onPress={() => setShowAllCategories(!showAllCategories)}>
                <Text className="text-accent font-semibold">{showAllCategories ? 'See Less' : 'See All'}</Text>
              </TouchableOpacity>
            </View>
            
            {showAllCategories ? (
              <View className="flex-row flex-wrap justify-between">
                {CATEGORIES.map((cat, index) => (
                  <TouchableOpacity 
                    key={index} 
                    className="items-center mb-4 w-[22%]"
                    onPress={() => router.push(`/products?category=${cat.id}`)}
                  >
                    <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-sm border border-[#e5e7eb] mb-2">
                      <MaterialCommunityIcons name={cat.vectorIcon as any} size={32} color="#1a87e1" />
                    </View>
                    <Text className="text-xs text-textSecondary font-medium text-center" numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
                {/* Add invisible placeholders to keep left-alignment if the last row isn't full */}
                {Array.from({ length: (4 - (CATEGORIES.length % 4)) % 4 }).map((_, i) => (
                  <View key={`placeholder-${i}`} className="w-[22%]" />
                ))}
              </View>
            ) : (
              <View className="flex-row justify-between">
                {CATEGORIES.slice(0, 4).map((cat, index) => (
                  <TouchableOpacity 
                    key={index} 
                    className="items-center w-[22%]"
                    onPress={() => router.push(`/products?category=${cat.id}`)}
                  >
                    <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-sm border border-[#e5e7eb] mb-2">
                      <MaterialCommunityIcons name={cat.vectorIcon as any} size={32} color="#1a87e1" />
                    </View>
                    <Text className="text-xs text-textSecondary font-medium text-center" numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Popular Products */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-textPrimary">Popular Products</Text>
              <TouchableOpacity onPress={() => setShowAllProducts(!showAllProducts)}>
                <Text className="text-accent font-semibold">{showAllProducts ? 'See Less' : 'See All'}</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#1a87e1" size="large" className="mt-8" />
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {products.slice(0, showAllProducts ? products.length : 4).map((product) => (
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
                    <Text className="font-bold text-textPrimary mb-1" numberOfLines={1}>{product.name || product.productName}</Text>
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
                ))}
              </View>

            )}
          </View>
        </View>

        {/* Footer Section - Premium Look */}
        <View className="bg-[#0b1e42] pt-10 pb-14 px-6 mt-6 rounded-t-[40px] shadow-lg">
          {/* Logo & Tagline */}
          <View className="items-center mb-8">
            <View className="flex-row items-center justify-center bg-[#1a87e1]/20 px-5 py-2 rounded-full mb-4 border border-[#1a87e1]/30">
              <MaterialCommunityIcons name="shield-plus" color="#38bdf8" size={24} />
              <Text className="text-2xl font-bold text-white ml-2 tracking-wide">Medicare<Text className="text-[#38bdf8]">X</Text></Text>
            </View>
            <Text className="text-gray-400 text-center px-4 text-xs leading-relaxed">
              Experience the future of healthcare with our premium online pharmacy. Quality medicines, delivered with care.
            </Text>
          </View>

          {/* Quick Links */}
          <View className="mb-8">
            <Text className="text-white font-bold text-sm mb-4 tracking-wider uppercase opacity-80">Quick Links</Text>
            <View className="flex-row flex-wrap justify-between">
              {[
                { label: 'Shop Products', route: '/products' },
                { label: 'Upload Prescription', route: '/prescription' },
                { label: 'Settings', route: '/settings' },
                { label: 'My Cart', route: '/cart' }
              ].map((link, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  className="w-[48%] flex-row items-center bg-white/5 rounded-2xl p-3 mb-3 border border-white/10"
                  onPress={() => router.push(link.route as any)}
                >
                  <View className="bg-[#1a87e1]/20 p-1.5 rounded-lg mr-2">
                    <Feather name="chevron-right" color="#38bdf8" size={14} />
                  </View>
                  <Text className="text-gray-300 text-xs font-semibold">{link.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contact Us Interactive */}
          <View className="mb-8 bg-gradient-to-r from-white/10 to-transparent rounded-3xl p-5 border border-white/5">
            <Text className="text-white font-bold text-sm mb-4 tracking-wider uppercase opacity-80">Get in Touch</Text>
            
            <TouchableOpacity 
              className="flex-row items-center mb-4"
              onPress={() => Linking.openURL('tel:+94112345678')}
            >
              <View className="w-10 h-10 rounded-full bg-[#1a87e1]/20 items-center justify-center mr-4 border border-[#1a87e1]/30">
                <Feather name="phone-call" color="#38bdf8" size={16} />
              </View>
              <View>
                <Text className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">Call Support</Text>
                <Text className="text-white font-semibold text-sm">+94 112 345 678</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-row items-center mb-4"
              onPress={() => Linking.openURL('mailto:care@medicarex.lk')}
            >
              <View className="w-10 h-10 rounded-full bg-[#1a87e1]/20 items-center justify-center mr-4 border border-[#1a87e1]/30">
                <Feather name="mail" color="#38bdf8" size={16} />
              </View>
              <View>
                <Text className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">Email Us</Text>
                <Text className="text-white font-semibold text-sm">care@medicarex.lk</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => Linking.openURL('https://maps.google.com/?q=Colombo+03')}
            >
              <View className="w-10 h-10 rounded-full bg-[#1a87e1]/20 items-center justify-center mr-4 border border-[#1a87e1]/30">
                <Feather name="map-pin" color="#38bdf8" size={16} />
              </View>
              <View>
                <Text className="text-gray-400 text-[10px] uppercase tracking-wider mb-0.5">Headquarters</Text>
                <Text className="text-white font-semibold text-sm">Colombo 03, Sri Lanka</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Socials & Copyright */}
          <View className="flex-row justify-center items-center space-x-8 mb-8 border-t border-white/10 pt-8">
            <TouchableOpacity 
              className="w-12 h-12 bg-white/5 rounded-full items-center justify-center border border-white/10"
              onPress={() => Linking.openURL('https://facebook.com')}
            >
              <MaterialCommunityIcons name="facebook" color="#38bdf8" size={22} />
            </TouchableOpacity>
            <TouchableOpacity 
              className="w-12 h-12 bg-white/5 rounded-full items-center justify-center border border-white/10 mx-6"
              onPress={() => Linking.openURL('https://instagram.com')}
            >
              <MaterialCommunityIcons name="instagram" color="#38bdf8" size={22} />
            </TouchableOpacity>
            <TouchableOpacity 
              className="w-12 h-12 bg-white/5 rounded-full items-center justify-center border border-white/10"
              onPress={() => Linking.openURL('https://twitter.com')}
            >
              <MaterialCommunityIcons name="twitter" color="#38bdf8" size={22} />
            </TouchableOpacity>
          </View>
          
          <Text className="text-center text-[10px] text-gray-500 tracking-widest uppercase">
            © {new Date().getFullYear()} MedicareX. All rights reserved.
          </Text>
        </View>
      </ScrollView>
      {/* ChatBot FAB */}
      <TouchableOpacity 
        onPress={() => router.push('/chat')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#0b5ed7] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5 }}
      >
        <MaterialCommunityIcons name="robot" size={28} color="white" />
        <View className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white items-center justify-center">
          <Text className="text-white text-[8px] font-bold">1</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
