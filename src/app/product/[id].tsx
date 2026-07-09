import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Platform, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../stores/cartStore';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../constants/categories';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { user } = useAuth();
  const addItem = useCartStore(state => state.addItem);
  const cartItemsCount = useCartStore(state => state.items).length;

  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingSummary, setRatingSummary] = useState({ avg: 0, count: 0 });
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Helper for physical device & emulator localhost image resolution
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    const hostIp = Platform.OS === 'android' ? '10.0.2.2' : '10.207.127.9';
    return url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
  };

  useEffect(() => {
    if (id) {
      fetchProductDetails();
      fetchReviews();
    }
  }, [id]);

  const fetchReviews = async () => {
    try {
      const q = query(collection(db, 'productRatings'), where('productId', '==', String(id)));
      const snap = await getDocs(q);
      const fetchedReviews: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let sum = 0;
      let count = 0;
      fetchedReviews.forEach((r: any) => {
        if (r.rating > 0) {
          sum += r.rating;
          count += 1;
        }
      });
      
      setRatingSummary({ avg: count > 0 ? sum / count : 0, count });
      // sort by date descending
      fetchedReviews.sort((a, b) => {
        const da = a.createdAt?.seconds || 0;
        const db = b.createdAt?.seconds || 0;
        return db - da;
      });
      setReviews(fetchedReviews);
    } catch (error) {
      console.error("Error fetching reviews", error);
    }
  };

  const submitReview = async () => {
    if (!user) {
      alert("Please login to submit a review.");
      return;
    }
    if (newRating === 0) {
      alert("Please select a star rating.");
      return;
    }
    setSubmittingReview(true);
    try {
      const payload = {
        productId: String(id),
        productName: product?.name || product?.productName || '',
        userId: user.uid,
        customerName: user.displayName || user.email?.split('@')[0] || 'Customer',
        customerEmail: user.email || '',
        comment: newComment.trim(),
        rating: newRating,
        helpful: 0,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'productRatings'), payload);
      
      // Update local state instantly
      const newReview = { id: ref.id, ...payload, createdAt: { seconds: Date.now() / 1000 } };
      setReviews([newReview, ...reviews]);
      
      const newCount = ratingSummary.count + 1;
      const newAvg = ((ratingSummary.avg * ratingSummary.count) + newRating) / newCount;
      setRatingSummary({ avg: newAvg, count: newCount });
      
      setNewComment('');
      setNewRating(0);
      alert("Review submitted successfully!");
    } catch (error) {
      console.error("Error submitting review", error);
      alert("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchProductDetails = async () => {
    try {
      const docRef = doc(db, 'pharmacistProducts', id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const productData = docSnap.data();
        const stockId = productData.stockId || productData.productCode;
        
        // Initial set without stock
        setProduct({ id: docSnap.id, ...productData, stock: 0 });
        
        // Listen to actual stock from 'products' collection in real-time
        if (stockId) {
          const stockQ = query(collection(db, 'products'), where('productCode', '==', stockId));
          const unsubscribe = onSnapshot(stockQ, (querySnapshot) => {
            if (!querySnapshot.empty) {
              setProduct((prev: any) => ({ ...prev, stock: querySnapshot.docs[0].data().stock ?? 0 }));
            } else {
              // Fallback to direct document id check just in case
              onSnapshot(doc(db, 'products', stockId), (stockDoc) => {
                if (stockDoc.exists()) {
                  setProduct((prev: any) => ({ ...prev, stock: stockDoc.data().stock ?? 0 }));
                }
              });
            }
          });
        }
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
      <View className="flex-1 bg-primary dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#1a87e1" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-primary dark:bg-gray-900 items-center justify-center px-6">
        <Feather name="alert-circle" size={48} color="#94A3B8" />
        <Text className="text-xl font-bold text-textPrimary dark:text-white mt-4 text-center">Product Not Found</Text>
        <Text className="text-textSecondary dark:text-gray-300 text-center mt-2">The product you are looking for does not exist.</Text>
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
    <View className="flex-1 bg-primary dark:bg-gray-900">
      {/* Header */}
      <View className="absolute top-0 left-0 right-0 z-10 flex-row justify-between items-center px-6 pt-14 pb-4">
        <TouchableOpacity 
          className="w-10 h-10 bg-white dark:bg-gray-800/80 rounded-full items-center justify-center backdrop-blur-md shadow-sm"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" color="#1E293B" size={20} />
        </TouchableOpacity>
        <TouchableOpacity 
          className="w-10 h-10 bg-white dark:bg-gray-800/80 rounded-full items-center justify-center backdrop-blur-md shadow-sm relative"
          onPress={() => router.push('/cart')}
        >
          <Feather name="shopping-cart" color="#1E293B" size={20} />
          {cartItemsCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-600 rounded-full w-5 h-5 items-center justify-center border-2 border-white">
              <Text className="text-white text-[10px] font-bold">{cartItemsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Image Area */}
        <View className="h-96 bg-white dark:bg-gray-800 w-full items-center justify-center rounded-b-[40px] shadow-sm pt-20 overflow-hidden">
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
            <View className="bg-accentLight dark:bg-gray-800 px-3 py-1 rounded-full">
              <Text className="text-textPrimary dark:text-white text-xs font-bold">
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

          <Text className="text-3xl font-extrabold text-textPrimary dark:text-white mb-2 leading-tight">{product.name || product.productName}</Text>
          
          {/* Rating Summary Display */}
          <View className="flex-row items-center mb-4">
            <View className="flex-row items-center bg-orange-50 px-2 py-1 rounded-md mr-2">
              <Text className="font-bold text-orange-600 mr-1">{ratingSummary.avg.toFixed(1)}</Text>
              <Ionicons name="star" size={14} color="#ea580c" />
            </View>
            <Text className="text-textSecondary dark:text-gray-300 text-sm">{ratingSummary.count} {ratingSummary.count === 1 ? 'Review' : 'Reviews'}</Text>
          </View>

          <Text className="text-2xl font-bold text-accent mb-2">Rs. {price}</Text>

          {/* Stock Info */}
          <View className={`flex-row items-center px-3 py-1.5 rounded-full self-start mb-6 ${(product.stock || 0) > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <Feather name={(product.stock || 0) > 0 ? 'check-circle' : 'slash'} color={(product.stock || 0) > 0 ? '#16a34a' : '#ef4444'} size={14} />
            <Text className={`ml-1.5 font-bold text-sm ${(product.stock || 0) > 0 ? 'text-green-700' : 'text-red-600'}`}>
              {(product.stock || 0) > 0 ? `In Stock: ${product.stock} units` : 'Out of Stock'}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-bold text-textPrimary dark:text-white mb-2">Description</Text>
            <Text className="text-textSecondary dark:text-gray-300 leading-relaxed text-base">
              {product.description || 'No description available for this product.'}
            </Text>
          </View>

          {/* Supplier Info if available */}
          {product.supplierId && (
            <View className="flex-row items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
              <View className="w-12 h-12 bg-primary dark:bg-gray-900 rounded-full items-center justify-center mr-4">
                <Feather name="truck" color="#1a87e1" size={20} />
              </View>
              <View>
                <Text className="text-sm text-textSecondary dark:text-gray-300 font-medium">Supplier Code</Text>
                <Text className="text-base font-bold text-textPrimary dark:text-white">{product.supplierId}</Text>
              </View>
            </View>
          )}

          {/* Ratings & Reviews Section */}
          <View className="mt-4 mb-8">
            <Text className="text-lg font-bold text-textPrimary dark:text-white mb-4">Ratings & Reviews</Text>
            
            {/* Review Form */}
            <View className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 mb-6 shadow-sm">
              <Text className="text-base font-bold text-slate-800 mb-2">Write a Review</Text>
              <View className="flex-row mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setNewRating(star)} className="mr-2">
                    <Ionicons 
                      name={star <= newRating ? "star" : "star-outline"} 
                      size={28} 
                      color={star <= newRating ? "#f59e0b" : "#cbd5e1"} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {/* @ts-ignore */}
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Share your experience with this product..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                className="bg-slate-50 dark:bg-gray-800 border border-slate-200 rounded-xl p-3 text-slate-700 mb-3"
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
              <TouchableOpacity 
                onPress={submitReview}
                disabled={submittingReview}
                className={`py-3 rounded-xl items-center ${submittingReview ? 'bg-slate-300' : 'bg-accent'}`}
              >
                <Text className="text-white font-bold">{submittingReview ? 'Submitting...' : 'Submit Review'}</Text>
              </TouchableOpacity>
            </View>

            {/* Review List */}
            {reviews.filter(r => r.comment && r.comment.trim() !== '').length === 0 ? (
              <Text className="text-slate-500 italic text-center py-4">No text reviews yet. Be the first to leave a feedback!</Text>
            ) : (
              reviews.filter(r => r.comment && r.comment.trim() !== '').map((review, idx) => (
                <View key={review.id || idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 mb-3">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-bold text-slate-800">{review.customerName}</Text>
                    <View className="flex-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons 
                          key={star} 
                          name={star <= review.rating ? "star" : "star-outline"} 
                          size={12} 
                          color="#f59e0b" 
                        />
                      ))}
                    </View>
                  </View>
                  <Text className="text-sm text-slate-600">{review.comment}</Text>
                  <Text className="text-[10px] text-slate-400 mt-2">
                    {review.createdAt?.seconds ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="bg-white dark:bg-gray-800 px-6 py-6 border-t border-[#e5e7eb] dark:border-gray-700 flex-row items-center justify-between">
        <View className="flex-row items-center bg-slate-100 dark:bg-gray-800 rounded-full p-1">
          <TouchableOpacity 
            className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full items-center justify-center shadow-sm"
            onPress={() => setQty(prev => prev > 1 ? prev - 1 : 1)}
          >
            <Feather name="minus" color="#1E293B" size={20} />
          </TouchableOpacity>
          <Text className="w-10 text-center font-bold text-lg text-textPrimary dark:text-white">{qty}</Text>
          <TouchableOpacity 
            className={`w-12 h-12 bg-white dark:bg-gray-800 rounded-full items-center justify-center shadow-sm ${qty >= (product.stock || 0) ? 'opacity-50' : ''}`}
            onPress={() => setQty(prev => prev < (product.stock || 0) ? prev + 1 : prev)}
            disabled={qty >= (product.stock || 0)}
          >
            <Feather name="plus" color="#1E293B" size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className={`flex-1 ml-6 h-14 rounded-full flex-row items-center justify-center shadow-md ${(product.stock || 0) > 0 ? 'bg-accent shadow-accent/30' : 'bg-slate-300 shadow-slate-300'}`}
          onPress={() => {
            if ((product.stock || 0) > 0) {
              addItem(product, qty);
            }
          }}
          disabled={(product.stock || 0) <= 0}
        >
          <Feather name={(product.stock || 0) > 0 ? 'shopping-bag' : 'slash'} color={(product.stock || 0) > 0 ? '#ffffff' : '#64748b'} size={20} />
          <Text className={`font-bold text-lg ml-2 ${(product.stock || 0) > 0 ? 'text-white' : 'text-slate-500'}`}>
            {(product.stock || 0) > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
