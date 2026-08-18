import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Feather, AntDesign } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogleCredential, resetPassword } = useAuth();
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

  const handleGoogleCredentialLogin = async (idToken: string) => {
    setIsLoading(true);
    try {
      await loginWithGoogleCredential(idToken);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert("Google Login Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '109245280482-unku2vvkm9qbgfjrig2jq7rfu2vqrv0m.apps.googleusercontent.com',
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (idToken) {
        handleGoogleCredentialLogin(idToken);
      } else {
        throw new Error('No ID token present!');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Google Login Error", error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first to reset your password.");
      return;
    }
    
    setIsLoading(true);
    try {
      await resetPassword(email);
      Alert.alert("Success", "A password reset link has been sent to your email.");
    } catch (error: any) {
      Alert.alert("Reset Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-blue-600 justify-center px-4">
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
          <TouchableOpacity className="flex-1 bg-blue-500 py-3 rounded-lg items-center">
            <Text className="text-white font-bold">Login</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 py-3 rounded-lg items-center"
            onPress={() => router.push('/(auth)/register')}
          >
            <Text className="text-gray-500 font-bold">Register</Text>
          </TouchableOpacity>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-bold text-gray-800 mb-2">Email Address</Text>
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
            <Text className="text-sm font-bold text-gray-800 mb-2">Password</Text>
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
            <TouchableOpacity onPress={handleForgotPassword} className="mt-3 self-end">
               <Text className="text-blue-500 font-bold text-sm">Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            className="bg-blue-500 rounded-xl py-4 mt-6 items-center"
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-bold">Sign In</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-4 text-gray-400 font-bold text-xs">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <TouchableOpacity 
            className="flex-row items-center justify-center border border-gray-300 rounded-xl py-4 mb-4 bg-white shadow-sm"
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <Image source={require('../../../assets/images/google-icon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
            <Text className="text-gray-800 font-bold ml-3 text-[15px]">Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center mt-2" onPress={handleForgotPassword} disabled={isLoading}>
            <Text className="text-blue-500 font-bold text-sm">Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
