import React from 'react';
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function Footer() {
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  };

  const socialLinks = [
    { icon: 'facebook', url: 'https://facebook.com/medicarex' },
    { icon: 'twitter', url: 'https://twitter.com/medicarex' },
    { icon: 'instagram', url: 'https://instagram.com/medicarex' },
    { icon: 'linkedin', url: 'https://linkedin.com/company/medicarex' },
    { icon: 'whatsapp', url: 'whatsapp://send?phone=+94760689429' },
  ];

  return (
    <View className="bg-[#0f2a5e] mt-8 pt-10 pb-6 px-6 rounded-t-[40px] overflow-hidden shadow-lg">
      {/* Top accent line simulation */}
      <View className="absolute top-0 left-0 right-0 h-1 bg-[#1a87e1]" />
      {/* Brand Section */}
      <View className="mb-8">
        <Text className="text-white font-serif text-3xl font-bold tracking-tight mb-1">
          MediCareX
        </Text>
        <Text className="text-blue-200 text-xs font-bold tracking-widest mb-4 uppercase">
          Your Smart Pharmacy System
        </Text>
        <Text className="text-blue-100 text-sm leading-6 pr-4">
          Trusted pharmacy platform for managing medicines and healthcare services.
        </Text>
      </View>

      <View className="flex-row justify-between mb-8">
        {/* Quick Links */}
        <View className="flex-1 mr-4">
          <Text className="text-white font-bold text-sm mb-4 uppercase tracking-wider">
            Quick Links
          </Text>
          <View className="space-y-3">
            <TouchableOpacity onPress={() => router.push('/products')}>
              <Text className="text-blue-100 text-sm py-1">Products</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/orders')}>
              <Text className="text-blue-100 text-sm py-1">Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/cart')}>
              <Text className="text-blue-100 text-sm py-1">Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/offers')}>
              <Text className="text-blue-100 text-sm py-1">Offers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support */}
        <View className="flex-1 ml-4">
          <Text className="text-white font-bold text-sm mb-4 uppercase tracking-wider">
            Support
          </Text>
          <View className="space-y-3">
            <TouchableOpacity onPress={() => router.push('/help')}>
              <Text className="text-blue-100 text-sm py-1">Help Center</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/returns')}>
              <Text className="text-blue-100 text-sm py-1">Returns</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/privacy')}>
              <Text className="text-blue-100 text-sm py-1">Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text className="text-blue-100 text-sm py-1">Terms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Contact Section */}
      <View className="mb-8 border-t border-blue-600/50 pt-8">
        <Text className="text-white font-bold text-sm mb-4 uppercase tracking-wider">
          Contact
        </Text>
        
        <View className="space-y-4 mb-6">
          <TouchableOpacity 
            className="flex-row items-center" 
            onPress={() => openLink('tel:+94760689429')}
          >
            <Feather name="phone-call" size={16} color="#bfdbfe" className="mr-3" />
            <Text className="text-blue-100 text-sm ml-3">+94 76 068 9429</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center" 
            onPress={() => openLink('mailto:info@medicarex.com')}
          >
            <Feather name="mail" size={16} color="#bfdbfe" className="mr-3" />
            <Text className="text-blue-100 text-sm ml-3">info@medicarex.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center" 
            onPress={() => openLink('https://maps.google.com/?q=Sri+Lanka')}
          >
            <Feather name="map-pin" size={16} color="#bfdbfe" className="mr-3" />
            <Text className="text-blue-100 text-sm ml-3">Sri Lanka</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Social Icons - Centered at bottom */}
      <View className="items-center mb-6 pt-4">
        <View className="flex-row justify-center gap-4">
          {socialLinks.map((social, index) => (
            <TouchableOpacity 
              key={index}
              onPress={() => openLink(social.url)}
              className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/20"
            >
              <MaterialCommunityIcons name={social.icon as any} size={20} color="white" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Copyright */}
      <View className="pt-6 border-t border-blue-600/50 items-center">
        <Text className="text-blue-200/80 text-xs">
          © 2026 MediCareX POS — All Rights Reserved
        </Text>
      </View>
    </View>
  );
}
