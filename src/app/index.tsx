import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, ActivityIndicator, Image, Animated, Easing } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

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

    // Hide splash after 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
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

  // If already logged in, skip the welcome screen
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ImageBackground 
      source={require('../../assets/images/welcome_bg.png')} 
      className="flex-1 w-full h-full"
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1 justify-center px-8">
        <View className="mt-[-100px]">
          <View className="self-start mb-6">
            <Text className="text-5xl font-extrabold text-black tracking-tight">MediCareX</Text>
            <View className="h-1 bg-black w-[110%] mt-2" />
          </View>
          
          <Text className="text-xl font-bold text-black leading-tight pr-8">
            Order medicines safely, quickly, and at your doorstep.
          </Text>
        </View>

        {/* Start Button at bottom */}
        <View className="absolute bottom-16 left-8 right-8 items-center">
          <TouchableOpacity 
            className="w-full max-w-[280px] bg-black rounded-[30px] h-16 flex-row items-center justify-center shadow-lg"
            onPress={() => router.push('/(auth)/login')}
          >
            <Text className="text-white text-2xl font-bold mr-4">Start</Text>
            <Feather name="chevron-right" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
