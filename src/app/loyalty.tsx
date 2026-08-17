import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoyaltyScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [loyaltyData, setLoyaltyData] = useState({ points: 0, tier: 'Silver' });
  const [loading, setLoading] = useState(true);
  const progressAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLoyaltyData({
          points: data.loyaltyPoints || 0,
          tier: data.loyaltyTier || 'Silver'
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Calculate progress
  const points = loyaltyData.points;
  let nextTier = 'Gold';
  let target = 500;
  let progress = 0;
  let tierColors = ['#9CA3AF', '#E5E7EB']; // Silver default
  let iconName = "award";

  if (loyaltyData.tier === 'Silver') {
    nextTier = 'Gold';
    target = 500;
    progress = (points / target) * 100;
    tierColors = ['#6B7280', '#D1D5DB']; // Sleek Silver
    iconName = "star";
  } else if (loyaltyData.tier === 'Gold') {
    nextTier = 'Platinum';
    target = 1000;
    progress = ((points - 500) / 500) * 100;
    tierColors = ['#D97706', '#FDE68A']; // Premium Gold
    iconName = "crown";
  } else if (loyaltyData.tier === 'Platinum') {
    nextTier = 'Max Tier';
    target = points;
    progress = 100;
    tierColors = ['#4338CA', '#C7D2FE']; // Elite Platinum
    iconName = "gem";
  }

  if (progress > 100) progress = 100;
  if (progress < 0) progress = 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      <View className="flex-row items-center justify-between p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0f2a5e'} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-textPrimary dark:text-white">Loyalty & Rewards</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1a87e1" />
        </View>
      ) : (
        <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
          
          <LinearGradient
            colors={tierColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl p-6 shadow-xl mb-8 items-center"
          >
            <View className="bg-white/20 p-4 rounded-full mb-4">
              <FontAwesome5 name={iconName} size={40} color="#FFFFFF" />
            </View>
            <Text className="text-white text-lg font-medium opacity-90 tracking-widest uppercase mb-1">Current Tier</Text>
            <Text className="text-white text-4xl font-black mb-6 shadow-sm">{loyaltyData.tier}</Text>
            
            <View className="bg-white/90 dark:bg-gray-800/90 w-full rounded-2xl p-5 items-center shadow-lg">
              <Text className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase mb-1">Total Points</Text>
              <Text className="text-4xl font-black text-blue-600 dark:text-blue-400">{points}</Text>
            </View>
          </LinearGradient>

          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-lg font-bold text-gray-800 dark:text-white">Progress to {nextTier}</Text>
              {loyaltyData.tier !== 'Platinum' && (
                <Text className="text-sm font-bold text-blue-500">{points} / {target}</Text>
              )}
            </View>
            
            <View className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <Animated.View 
                className="h-full rounded-full" 
                style={{ 
                  width: widthInterpolated, 
                  backgroundColor: loyaltyData.tier === 'Gold' ? '#D97706' : '#4338CA'
                }} 
              />
            </View>
            
            {loyaltyData.tier !== 'Platinum' ? (
              <Text className="text-gray-500 dark:text-gray-400 text-xs mt-3 text-center">
                Earn {target - points} more points to unlock {nextTier} benefits!
              </Text>
            ) : (
              <Text className="text-gray-500 dark:text-gray-400 text-xs mt-3 text-center">
                You have reached the highest tier! Enjoy exclusive Platinum benefits.
              </Text>
            )}
          </View>

          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 mb-8 border border-blue-100 dark:border-blue-800">
            <View className="flex-row items-center mb-2">
              <Feather name="info" size={18} color="#1a87e1" className="mr-2" />
              <Text className="text-blue-800 dark:text-blue-300 font-bold ml-2">How it works</Text>
            </View>
            <Text className="text-blue-700/80 dark:text-blue-400/80 text-sm leading-5">
              You earn points for every order placed. The more points you earn, the higher your tier. Higher tiers unlock exclusive discounts, priority support, and special rewards!
            </Text>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
