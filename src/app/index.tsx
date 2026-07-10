import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, ActivityIndicator, Image, Animated } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  
  // Splash animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  
  // Content entrance animations
  const contentFadeAnim = React.useRef(new Animated.Value(0)).current;
  const contentSlideAnim = React.useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Animate splash
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide splash after 2.5 seconds and trigger entrance animation
    const timer = setTimeout(() => {
      setShowSplash(false);
      
      Animated.parallel([
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(contentSlideAnim, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center'
          }}
        >
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={{ width: 120, height: 120, marginBottom: 20 }}
            resizeMode="contain"
          />
          <Text className="text-4xl font-extrabold text-[#0f2a5e] tracking-tight">MediCareX</Text>
          <Text className="text-[#1a87e1] font-semibold mt-2 tracking-widest uppercase text-xs">Your Health Partner</Text>
        </Animated.View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a87e1" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ImageBackground 
      source={require('../../assets/images/modern_welcome_bg.jpg')} 
      className="flex-1 w-full h-full"
      resizeMode="cover"
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,1)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}
      />

      <SafeAreaView className="flex-1 justify-between px-6 pb-12 pt-8">
        
        <Animated.View 
          style={{ 
            alignItems: 'center', 
            marginTop: 40,
            opacity: contentFadeAnim,
            transform: [{ translateY: contentSlideAnim }]
          }}
        >
          {/* Properly cropped circular logo */}
          <View 
            className="bg-white shadow-2xl mb-5 items-center justify-center" 
            style={{ 
              width: 140, 
              height: 140, 
              borderRadius: 70, 
              overflow: 'hidden',
              elevation: 10,
              borderWidth: 4,
              borderColor: 'rgba(255,255,255,0.8)'
            }}
          >
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          <Text className="text-[42px] font-extrabold text-[#0f2a5e] tracking-tight shadow-sm">MediCareX</Text>
          <Text className="text-[#1a87e1] font-bold mt-1 tracking-widest uppercase text-[12px]">Your Health Partner</Text>
        </Animated.View>

        <Animated.View 
          style={{ 
            alignItems: 'center', 
            marginBottom: 24,
            opacity: contentFadeAnim,
            transform: [{ translateY: contentSlideAnim }]
          }}
        >
          <Text className="text-[28px] font-black text-center text-gray-900 mb-4 px-2 leading-8">
            Pharmacy at your fingertips
          </Text>
          <Text className="text-[16px] text-center text-gray-600 mb-10 px-6 font-medium leading-6">
            Order medicines safely, quickly, and get them delivered right to your doorstep.
          </Text>

          <TouchableOpacity 
            className="w-full max-w-[340px] shadow-xl elevation-5"
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={['#1a87e1', '#0ea5e9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 100, paddingVertical: 18 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text className="text-white text-[22px] font-extrabold mr-3 tracking-wide">Get Started</Text>
                <Feather name="arrow-right" size={24} color="white" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

      </SafeAreaView>
    </ImageBackground>
  );
}
