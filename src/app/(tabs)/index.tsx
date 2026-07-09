import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Linking, Dimensions, FlatList, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
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
  
  // Blog State
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const { address } = useLocationStore();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    const timer = setInterval(() => {
      let nextIndex = activeCarouselIndex + 1;
      if (nextIndex >= CAROUSEL_DATA.length) {
        nextIndex = 0;
      }
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [activeCarouselIndex]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveCarouselIndex(viewableItems[0].index);
    }
  }).current;

  // Blog Carousel Logic
  const [activeBlogIndex, setActiveBlogIndex] = useState(0);
  const flatListBlogRef = useRef<FlatList>(null);
  
  useEffect(() => {
    if (blogPosts.length === 0) return;
    const timer = setInterval(() => {
      let nextIndex = activeBlogIndex + 1;
      const maxItems = Math.min(blogPosts.length, 3);
      if (nextIndex >= maxItems) {
        nextIndex = 0;
      }
      flatListBlogRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 5000); // 5 seconds

    return () => clearInterval(timer);
  }, [activeBlogIndex, blogPosts]);

  const blogViewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onBlogViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveBlogIndex(viewableItems[0].index);
    }
  }).current;

  
  // Dynamic host IP detection
  const getHostIp = () => {
    if (Platform.OS === 'web') return 'localhost';
    let ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    if (Constants?.expoConfig?.hostUri) {
      ip = Constants.expoConfig.hostUri.split(':')[0];
    } else if ((Constants as any)?.manifest?.hostUri) {
      ip = (Constants as any).manifest.hostUri.split(':')[0];
    } else if ((Constants as any)?.manifest2?.extra?.expoGo?.hostUri) {
      ip = (Constants as any).manifest2.extra.expoGo.hostUri.split(':')[0];
    }
    return ip;
  };

  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    const hostIp = getHostIp();
    return url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const hostIp = getHostIp();
        const response = await fetch(`http://${hostIp}:5000/api/customer/blogs/latest`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        setBlogPosts(Array.isArray(data) ? data : []);
      } catch (error: any) {
        console.error("Error fetching blogs:", error.message);
        setBlogPosts([]);
      } finally {
        setLoadingBlogs(false);
      }
    };
    fetchBlogs();
  }, []);
  
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

      const stockSnap = await getDocs(collection(db, 'products'));
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

      const finalItems = items.map(p => ({
        ...p,
        stock: stockMap[(p as any).stockId] ?? stockMap[(p as any).productCode] ?? (p as any).stock ?? 0
      }));
      
      setProducts(finalItems);

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
    <View className="flex-1 bg-primary dark:bg-gray-900">
      {/* Top Brand Header */}
      <View className="pt-14 pb-3 bg-white dark:bg-gray-800 px-6 flex-row justify-between items-center shadow-sm z-10">
        <View className="flex-row items-center">
          <View className="mr-2" style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(26,135,225,0.22)', overflow: 'hidden' }}>
            <Image 
              source={require('../../../assets/images/logo.png')} 
              style={{ width: '100%', height: '100%' }} 
              resizeMode="cover" 
            />
          </View>
          <View>
            <Text className="text-xl font-extrabold text-textPrimary dark:text-white tracking-tight" style={{ lineHeight: 22 }}>MediCareX</Text>
            <Text className="text-[10px] text-textSecondary dark:text-gray-300 font-bold tracking-widest mt-0.5">Your Smart Pharmacy</Text>
          </View>
        </View>
        <View className="flex-row items-center space-x-5">
          <TouchableOpacity onPress={toggleColorScheme} className="mr-3">
            <Feather name={colorScheme === 'dark' ? 'sun' : 'moon'} color={colorScheme === 'dark' ? '#f1f5f9' : '#1E293B'} size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notifications')} className="mr-3">
            <Feather name="bell" color={colorScheme === 'dark' ? '#f1f5f9' : '#1E293B'} size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/cart')} className="relative">
            <Feather name="shopping-cart" color={colorScheme === 'dark' ? '#f1f5f9' : '#1E293B'} size={24} />
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
        <View className="px-6 py-4 bg-primary dark:bg-gray-900 rounded-b-3xl mb-6 shadow-sm">

          
          <View className="flex-row items-center bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl shadow-sm border border-accentLight">
            <Feather name="search" color="#64748B" size={20} />
            <TextInput 
              placeholder="Search medicine..." 
              className="flex-1 ml-3 text-base text-textPrimary dark:text-white"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View className="px-6 py-6">
          {/* Promotional Banner Carousel */}
          <View className="mb-8">
            <FlatList
              ref={flatListRef}
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
                        className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full self-start flex-row items-center"
                        onPress={() => item.buttonAction(router)}
                      >
                        {item.icon === 'whatsapp' && <MaterialCommunityIcons name="whatsapp" size={16} color="#22c55e" className="mr-1.5" />}
                        <Text style={{ color: colorScheme === 'dark' ? '#60a5fa' : item.bgColor }} className="font-bold text-xs">{item.buttonText}</Text>
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
              <Text className="text-xl font-bold text-textPrimary dark:text-white">Quick Access</Text>
            </View>
            <View className="flex-row flex-wrap justify-between">
              <TouchableOpacity 
                className="w-[48%] bg-accentLight border border-accent rounded-2xl p-4 items-center mb-4"
                onPress={() => router.push('/products')}
              >
                <Feather name="shopping-bag" color="#1a87e1" size={32} className="mb-2" />
                <Text className="text-textPrimary dark:text-white font-semibold mb-1 text-center">Shop Products</Text>
                <Text className="text-textSecondary dark:text-gray-300 text-xs text-center">Browse catalog</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="w-[48%] bg-accentLight border border-accent rounded-2xl p-4 items-center mb-4"
                onPress={() => router.push('/brands')}
              >
                <Feather name="star" color="#1a87e1" size={32} className="mb-2" />
                <Text className="text-textPrimary dark:text-white font-semibold mb-1 text-center">Explore Brands</Text>
                <Text className="text-textSecondary dark:text-gray-300 text-xs text-center">Trusted makers</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-[48%] bg-accentLight border border-accent rounded-2xl p-4 items-center"
                onPress={() => router.push('/orders')}
              >
                <Feather name="heart" color="#1a87e1" size={32} className="mb-2" />
                <Text className="text-textPrimary dark:text-white font-semibold mb-1 text-center">My Orders</Text>
                <Text className="text-textSecondary dark:text-gray-300 text-xs text-center">Track purchases</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-[48%] bg-accentLight border border-accent rounded-2xl p-4 items-center"
                onPress={() => router.push('/prescription')}
              >
                <MaterialCommunityIcons name="file-document-outline" color="#1a87e1" size={32} className="mb-2" />
                <Text className="text-textPrimary dark:text-white font-semibold mb-1 text-center">Upload Rx</Text>
                <Text className="text-textSecondary dark:text-gray-300 text-xs text-center">Get delivered</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Categories */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-textPrimary dark:text-white">Categories</Text>
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
                    <View className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full items-center justify-center shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-2">
                      <MaterialCommunityIcons name={cat.vectorIcon as any} size={32} color="#1a87e1" />
                    </View>
                    <Text className="text-xs text-textSecondary dark:text-gray-300 font-medium text-center" numberOfLines={1}>{cat.name}</Text>
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
                    <View className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full items-center justify-center shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-2">
                      <MaterialCommunityIcons name={cat.vectorIcon as any} size={32} color="#1a87e1" />
                    </View>
                    <Text className="text-xs text-textSecondary dark:text-gray-300 font-medium text-center" numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Popular Products */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-textPrimary dark:text-white">Popular Products</Text>
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
                    <Text className="font-bold text-textPrimary dark:text-white mb-1" numberOfLines={1}>{product.name || product.productName}</Text>
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
                      {(product.stock || 0) > 0 ? (
                        <TouchableOpacity 
                          className="bg-accent w-8 h-8 rounded-full items-center justify-center"
                          onPress={() => useCartStore.getState().addItem(product)}
                        >
                          <Feather name="plus" color="#ffffff" size={20} />
                        </TouchableOpacity>
                      ) : (
                        <View className="bg-slate-200 w-8 h-8 rounded-full items-center justify-center">
                          <Feather name="slash" color="#94a3b8" size={16} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

            )}
          </View>
        </View>

        {/* AI Generated Blogs Section - WHO Guidelines Compliant */}
        <View className="px-4 py-8 bg-white dark:bg-gray-800 rounded-t-3xl mt-2 mb-4 shadow-sm border-t border-[#e5e7eb] dark:border-gray-700">
          <Text className="text-2xl font-bold text-center mb-6 text-textPrimary dark:text-white tracking-tight">
            Latest Health Insights
          </Text>
          
          {loadingBlogs ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              {[1, 2, 3].map((item) => (
                <View key={item} style={{ width: width - 32 }} className="bg-primary dark:bg-gray-900 rounded-[20px] shadow-sm border border-[#e5e7eb] dark:border-gray-700 overflow-hidden flex-col">
                  <View className="h-44 bg-gray-200 dark:bg-gray-800" />
                  <View className="p-5 flex-1 justify-between">
                    <View>
                      <View className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-4" />
                      <View className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
                      <View className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2" />
                      <View className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6 mb-2" />
                      <View className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-4/6" />
                    </View>
                    <View className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 flex-row justify-between">
                      <View className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                      <View className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/6" />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : blogPosts.length > 0 ? (
            <View className="mb-2">
              <FlatList
                ref={flatListBlogRef}
                data={blogPosts.slice(0, 3)}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={width - 32}
                decelerationRate="fast"
                onViewableItemsChanged={onBlogViewableItemsChanged}
                viewabilityConfig={blogViewabilityConfig}
                renderItem={({ item: blog, index }) => {
                  const title = blog.title ? blog.title.replace(/\*\*/g, '') : "MediCareX Health Tip";
                  let excerpt = blog.content || '';
                  excerpt = excerpt
                    .replace(/^#+\s+.*/gm, '') 
                    .replace(/Title:.*/gi, '') 
                    .replace(title, '')
                    .replace(/={3,}/g, '')
                    .replace(/-{3,}/g, '')
                    .replace(/[*_~`>]/g, '')   
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') 
                    .replace(/\n+/g, ' ')
                    .trim();
                    
                  const dateStr = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : "Just now";
                  const fallbackImg = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80";
                  
                  return (
                    <View style={{ width: width - 32 }}>
                      <TouchableOpacity 
                        className="w-full bg-primary dark:bg-gray-900 rounded-[20px] shadow-sm border border-[#e5e7eb] dark:border-gray-700 overflow-hidden flex-col"
                        onPress={() => router.push(`/blog/${blog.id}` as any)}
                      >
                        <View className="h-44 bg-gray-200 relative">
                          <Image 
                            source={{ uri: formatImageUrl(blog.imageUrl) || formatImageUrl(blog.fallbackImageUrl) || fallbackImg }} 
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                          <View className="absolute top-3 left-3 bg-blue-600/90 rounded-full px-3 py-1">
                            <Text className="text-white text-[10px] font-bold uppercase tracking-widest">Health Insight</Text>
                          </View>
                          {index === 0 && (
                            <View className="absolute top-3 right-3 bg-red-500 rounded-full px-3 py-1 flex-row items-center shadow-sm border border-red-400">
                              <Feather name="zap" size={10} color="white" className="mr-1" />
                              <Text className="text-white text-[10px] font-black uppercase tracking-widest">NEW</Text>
                            </View>
                          )}
                        </View>
                        
                        <View className="p-5 flex-1 justify-between">
                          <View>
                            <View className="flex-row items-center mb-3">
                              <Feather name="calendar" size={10} color="#64748B" />
                              <Text className="text-[10px] text-textSecondary dark:text-gray-400 ml-1.5 mr-4 uppercase font-bold tracking-wider">{dateStr}</Text>
                              <Feather name="clock" size={10} color="#64748B" />
                              <Text className="text-[10px] text-textSecondary dark:text-gray-400 ml-1.5 uppercase font-bold tracking-wider">5 min read</Text>
                            </View>
                            
                            <Text className="text-lg font-bold text-textPrimary dark:text-white mb-2 leading-tight" numberOfLines={2}>
                              {title}
                            </Text>
                            
                            <Text className="text-sm text-textSecondary dark:text-gray-300 mb-4 leading-relaxed" numberOfLines={3}>
                              {excerpt}
                            </Text>
                          </View>
                          
                          <View className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-4 flex-row items-center">
                            <Text className="text-accent font-bold text-sm mr-2">Read Full Article</Text>
                            <Feather name="arrow-right" size={14} color="#1a87e1" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
              <View className="flex-row justify-center items-center mt-4">
                {blogPosts.slice(0, 3).map((_, index) => (
                  <View
                    key={index}
                    className={`h-1.5 rounded-full mx-1 ${
                      activeBlogIndex === index ? 'w-6 bg-[#1a87e1]' : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View className="py-12 items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl mx-4 bg-primary dark:bg-gray-900">
              <Text className="italic text-textSecondary dark:text-gray-400">No health insights found at the moment.</Text>
            </View>
          )}

          {/* Mandatory Medical Disclaimer */}
          <View className="mt-8 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-primary dark:bg-gray-900 mx-2 shadow-sm">
            <Text className="text-[10px] italic text-textSecondary dark:text-gray-400 text-center leading-relaxed">
              Disclaimer: This information is generated by AI based on public health guidelines and is for educational purposes only. 
              It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of 
              your physician or other qualified health provider with any questions you may have regarding a medical condition.
            </Text>
          </View>
        </View>

        {/* Footer Section */}
        <Footer />
      </ScrollView>
    </View>
  );
}
