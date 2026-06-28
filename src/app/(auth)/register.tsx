import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Feather, AntDesign } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+94');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();

  const handlePhoneChange = (text: string) => {
    if (!text.startsWith('+94')) {
      setPhone('+94');
      return;
    }
    if (text.length > 12) return;
    const remainder = text.slice(3);
    if (remainder && !/^\d+$/.test(remainder)) return;
    setPhone(text);
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword || !phone) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    
    if (phone.length !== 12) {
      Alert.alert("Invalid Phone Number", "Please enter exactly 9 digits after +94.");
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
      router.replace('/(tabs)/');
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-blue-600">
      <ScrollView contentContainerStyle={{ padding: 16, justifyContent: 'center', minHeight: '100%' }}>
        <View className="bg-white rounded-3xl p-6 py-10 shadow-lg">
          <View className="items-center mb-6">
            <Text className="text-4xl font-black mb-1">
              <Text className="text-blue-900">Medi</Text>
              <Text className="text-blue-500">CareX</Text>
            </Text>
            <Text className="text-gray-500 text-sm">
              Pharmacy Supply Chain Management
            </Text>
          </View>

          {/* Toggle Login/Register */}
          <View className="flex-row bg-white border border-gray-200 rounded-xl mb-6 p-1">
            <TouchableOpacity 
              className="flex-1 py-3 rounded-lg items-center"
              onPress={() => router.push('/(auth)/login')}
            >
              <Text className="text-gray-500 font-bold">Login</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-blue-500 py-3 rounded-lg items-center">
              <Text className="text-white font-bold">Register</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-bold text-gray-800 mb-2">Full Name *</Text>
              <View className="border border-gray-300 rounded-xl px-4 py-3 bg-white">
                <TextInput
                  className="text-base text-gray-800"
                  placeholder="John Doe"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-bold text-gray-800 mb-2">Email Address *</Text>
              <View className="border border-gray-300 rounded-xl px-4 py-3 bg-white">
                <TextInput
                  className="text-base text-gray-800"
                  placeholder="your.email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-bold text-gray-800 mb-2">Phone Number</Text>
              <View className="border border-gray-300 rounded-xl px-4 py-3 bg-white">
                <TextInput
                  className="text-base text-gray-800"
                  placeholder="+94712345678"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-bold text-gray-800 mb-2">Password *</Text>
              <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                <TextInput
                  className="flex-1 text-base text-gray-800"
                  placeholder="........"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="gray" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-bold text-gray-800 mb-2">Confirm Password *</Text>
              <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                <TextInput
                  className="flex-1 text-base text-gray-800"
                  placeholder="........"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="gray" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              className="bg-blue-500 rounded-xl py-4 mt-6 items-center"
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white text-lg font-bold">Sign Up</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="mx-4 text-gray-400 font-bold text-xs">OR</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            <TouchableOpacity className="flex-row items-center justify-center border border-gray-300 rounded-xl py-4 mb-4 bg-white shadow-sm">
              <AntDesign name="google" size={20} color="#DB4437" />
              <Text className="text-gray-800 font-bold ml-2">Sign in with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
