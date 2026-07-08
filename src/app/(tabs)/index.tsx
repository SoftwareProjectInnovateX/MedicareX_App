import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Linking, Dimensions, FlatList, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCartStore } from '../../stores/cartStore';
import Footer from '../../components/Footer';
import { useLocationStore } from '../../stores/locationStore';
import { CATEGORIES } from '../../constants/categories';

const { width } = Dimensions.get('window');
const CAROUSEL_WIDTH = width - 48; // padding 24 on each side

const CAROUSEL_DATA = [
  {
    id: '1',
    label: 'MEDICAREX',
    title: 'Your Health,\nOur Priority',
    subtitle: 'We make getting your medicines simple, safe, and stress-free.',
    buttonText: 'Chat on WhatsApp',
    buttonAction: () => Linking.openURL('whatsapp://send?phone=+94112345678'),
    bgColor: '#1a87e1', // Brand Blue
    icon: 'whatsapp',
    imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=800&auto=format&fit=crop', // Healthcare
    isFullBackground: true
  },
  {
    id: '2',
    label: 'SPECIAL OFFER',
    title: 'Get 20%\nDiscount',
    subtitle: 'On your first order with us. Valid for all prescription medicines.',
    buttonText: 'Shop Now',
    buttonAction: (router: any) => router.push('/products'),
    bgColor: '#0f2a5e', // Premium Dark Blue
    icon: 'medical-bag',
    imageUrl: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?q=80&w=800&auto=format&fit=crop', // Pharmacy Counter
    isFullBackground: true
  },
  {
    id: '3',
    label: 'FAST DELIVERY',
    title: 'Doorstep\nDelivery',
    subtitle: 'Get your medicines delivered right to your doorstep within hours.',
    buttonText: 'Upload Rx',
    buttonAction: (router: any) => router.push('/prescription'),
    bgColor: '#1a87e1', // Brand Blue
    icon: 'truck-delivery',
    imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=800&auto=format&fit=crop', // Delivery Box
    isFullBackground: true
  }
];
export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [productRatings, setProductRatings] = useState<Record<string, {avg: number, count: number}>>({});
  const { address } = useLocationStore();
  
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveCarouselIndex(viewableItems[0].index);
    }
  }).current;

  
  // Helper for physical device & emulator localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    // Android emulator needs 10.0.2.2 to access host's localhost, physical devices need LAN IP
    const hostIp = Platform.OS === 'android' ? '10.0.2.2' : '10.207.127.9';
    return url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
  };
  
  const cartItems = useCartStore(state => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchProducts();
      } else {
        setLoading(false);
      }
    }, [user])
  );

  const fetchProducts = async () => {
    try {
      // Fetch products
      const q = query(collection(db, 'pharmacistProducts'), where('visibility', '==', 'customer'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);

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
      setProductRatings(finalRatings);
      
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
          <View className="mr-2" style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(26,135,225,0.22)', overflow: 'hidden' }}>
            <Image 
              source={require('../../../assets/images/logo.png')} 
              style={{ width: '100%', height: '100%' }} 
              resizeMode="cover" 
            />
          </View>
          <View>
            <Text className="text-xl font-extrabold text-[#0f2a5e] tracking-tight" style={{ lineHeight: 22 }}>MediCareX</Text>
            <Text className="text-[10px] text-[#64748b] font-bold tracking-widest mt-0.5">Your Smart Pharmacy</Text>
          </View>
        </View>
        <View className="flex-row items-center space-x-5">
          <TouchableOpacity onPress={() => router.push('/notifications')}>
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
          {/* Promotional Banner Carousel */}
          <View className="mb-8">
            <FlatList
              data={CAROUSEL_DATA}
              keyExtractor={item => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAROUSEL_WIDTH}
              decelerationRate="fast"
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              renderItem={({ item }) => (
                <View style={{ width: CAROUSEL_WIDTH }}>
                  <View 
                    style={{ backgroundColor: item.bgColor }} 
                    className="rounded-2xl flex-row justify-between items-center shadow-sm min-h-[160px] overflow-hidden relative"
                  >
                    {item.isFullBackground && item.imageUrl && (
                      <View className="absolute inset-0 w-full h-full">
                        <Image 
                          source={{ uri: item.imageUrl }}
                          className="w-full h-full absolute right-0 top-0"
                          style={{ resizeMode: 'cover', opacity: 0.9 }}
                        />
                        <LinearGradient
                          colors={[item.bgColor, item.bgColor, 'transparent']}
                          locations={[0, 0.45, 1]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                        />
                      </View>
                    )}
                    
                    <View className="flex-1 pr-2 p-5 z-10">
                      <Text className="text-white/80 font-semibold mb-1 text-[10px] tracking-wider uppercase">{item.label}</Text>
                      <Text className="text-white text-xl font-bold mb-1 leading-tight">{item.title}</Text>
                      <Text className="text-white/90 text-[10px] mb-3" numberOfLines={2}>{item.subtitle}</Text>
                      <TouchableOpacity 
                        className="bg-white px-4 py-2 rounded-full self-start flex-row items-center"
                        onPress={() => item.buttonAction(router)}
                      >
                        {item.icon === 'whatsapp' && <MaterialCommunityIcons name="whatsapp" size={16} color="#22c55e" className="mr-1.5" />}
                        <Text style={{ color: item.bgColor }} className="font-bold text-xs">{item.buttonText}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {(!item.isFullBackground) && (
                      <View className="pr-5 py-5 z-10">
                        {item.imageUrl ? (
                          <View className="w-24 h-28 rounded-xl overflow-hidden shadow-sm border border-white/20 bg-white/10">
                             <Image 
                               source={{ uri: item.imageUrl }} 
                               className="w-full h-full"
                               resizeMode="cover"
                             />
                          </View>
                        ) : (
                          <View 
                            className={`w-20 h-20 rounded-full items-center justify-center shadow-lg border-2 ${item.icon === 'whatsapp' ? 'bg-[#25D366] border-[#25D366]' : 'bg-white/20 border-white/30'}`}
                            style={item.icon === 'whatsapp' ? { elevation: 8 } : {}}
                          >
                             <MaterialCommunityIcons name={item.icon as any} size={46} color="#ffffff" />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}
            />
            <View className="flex-row justify-center items-center mt-4">
              {CAROUSEL_DATA.map((_, index) => (
                <View
                  key={index}
                  className={`h-1.5 rounded-full mx-1 ${
                    activeCarouselIndex === index ? 'w-6 bg-[#1a87e1]' : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
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
                    <Text className="text-xs text-textSecondary mb-1.5" numberOfLines={1}>
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
                      <Text className="text-[10px] text-textSecondary">
                        ({productRatings[product.id]?.count || 0})
                      </Text>
                    </View>

                    
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

        {/* Footer Section */}
        <Footer />
      </ScrollView>
    </View>
  );
}
