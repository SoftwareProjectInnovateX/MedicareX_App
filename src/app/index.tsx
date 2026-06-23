import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, ActivityIndicator, Image } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
