import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <View className="mb-10 items-center">
        <Text className="text-3xl font-bold text-teal-600 mb-2">Welcome Back</Text>
        <Text className="text-gray-500 text-base text-center">
          Log in to MedicareX to manage your health and prescriptions
        </Text>
      </View>

      <View className="space-y-4">
        <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
          <Feather name="mail" color="#9ca3af" size={20} />
          <TextInput
            className="flex-1 ml-3 text-base text-slate-800"
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 mt-4">
          <Feather name="lock" color="#9ca3af" size={20} />
          <TextInput
            className="flex-1 ml-3 text-base text-slate-800"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          className="bg-teal-600 rounded-lg py-4 mt-6 items-center flex-row justify-center"
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-lg font-semibold">Log In</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="text-teal-600 font-semibold">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
