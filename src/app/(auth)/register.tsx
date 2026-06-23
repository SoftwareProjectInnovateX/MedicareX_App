import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    try {
      await register({
        fullName,
        email,
        phone,
        password,
        role: 'customer'
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, justifyContent: 'center', minHeight: '100%' }}>
      <View className="mb-8 items-center">
        <Text className="text-3xl font-bold text-accent mb-2">Create Account</Text>
        <Text className="text-gray-500 text-base text-center">
          Join MedicareX to order medicines and track prescriptions
        </Text>
      </View>

      <View className="space-y-4">
        <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 mb-4">
          <Feather name="user" color="#9ca3af" size={20} />
          <TextInput
            className="flex-1 ml-3 text-base text-textPrimary"
            placeholder="Full Name *"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 mb-4">
          <Feather name="mail" color="#9ca3af" size={20} />
          <TextInput
            className="flex-1 ml-3 text-base text-textPrimary"
            placeholder="Email Address *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 mb-4">
          <Feather name="phone" color="#9ca3af" size={20} />
          <TextInput
            className="flex-1 ml-3 text-base text-textPrimary"
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 mb-4">
          <Feather name="lock" color="#9ca3af" size={20} />
          <TextInput
            className="flex-1 ml-3 text-base text-textPrimary"
            placeholder="Password *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 mb-4">
          <Feather name="lock" color="#9ca3af" size={20} />
          <TextInput
            className="flex-1 ml-3 text-base text-textPrimary"
            placeholder="Confirm Password *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          className="bg-accent rounded-lg py-4 mt-4 items-center flex-row justify-center"
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-lg font-semibold">Sign Up</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6 pb-6">
          <Text className="text-gray-600">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-accent font-semibold">Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
