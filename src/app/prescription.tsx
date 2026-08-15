import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

export default function PrescriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      console.log('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick a document.');
    }
  };

  const handleUpload = async () => {
    if (!name || !phone || !file) {
      Alert.alert('Required', 'Please fill in name, phone, and select a file.');
      return;
    }

    setUploading(true);

    try {
      let fileUrl = '';
      
      // 1. Upload to Cloudinary
      if (file.uri) {
        const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'rr9egjry';
        const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, file.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          parameters: {
            upload_preset: uploadPreset,
          },
        });

        if (uploadResult.status !== 200) {
           throw new Error("Upload failed: " + uploadResult.body);
        }

        const data = JSON.parse(uploadResult.body);
        fileUrl = data.secure_url;
      }

      // 2. Save to Firestore
      const prescriptionData = {
        userId: user?.uid || 'guest',
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        imageUrl: fileUrl,
        fileName: file.name,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'prescriptions'), prescriptionData);

      Alert.alert(
        'Success',
        'Upload successful! Pharmacist has been notified.',
        [{ text: 'OK', onPress: () => router.push('/orders') }]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      <View className="flex-row items-center p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#f1f5f9' : '#0f2a5e'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary dark:text-white">Upload Prescription</Text>
      </View>
      
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
        
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-accentLight dark:bg-gray-800 rounded-full items-center justify-center mr-3">
              <Feather name="upload" size={20} color="#1a87e1" />
            </View>
            <View>
              <Text className="font-bold text-textPrimary dark:text-white text-lg">Prescription Details</Text>
              <Text className="text-textSecondary dark:text-gray-300 text-xs">Fill in details and attach file</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View className="mb-4">
            <Text className="text-textPrimary dark:text-white font-semibold mb-2">Name</Text>
            <View className="flex-row items-center bg-primary dark:bg-gray-900 px-4 py-3 rounded-xl border border-[#e5e7eb] dark:border-gray-700">
              <Feather name="user" color="#1a87e1" size={18} />
              <TextInput 
                placeholder="Your full name" 
                className="flex-1 ml-3 text-textPrimary dark:text-white"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-textPrimary dark:text-white font-semibold mb-2">Phone</Text>
            <View className="flex-row items-center bg-primary dark:bg-gray-900 px-4 py-3 rounded-xl border border-[#e5e7eb] dark:border-gray-700">
              <Feather name="phone" color="#1a87e1" size={18} />
              <TextInput 
                placeholder="Your phone number" 
                className="flex-1 ml-3 text-textPrimary dark:text-white"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-textPrimary dark:text-white font-semibold mb-2">Address</Text>
            <View className="flex-row items-start bg-primary dark:bg-gray-900 px-4 py-3 rounded-xl border border-[#e5e7eb] dark:border-gray-700">
              <Feather name="map-pin" color="#1a87e1" size={18} className="mt-1" />
              <TextInput 
                placeholder="Your delivery address" 
                className="flex-1 ml-3 text-textPrimary dark:text-white"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* File Picker */}
          <View className="mb-6">
            <Text className="text-textPrimary dark:text-white font-semibold mb-2">Prescription File</Text>
            <TouchableOpacity 
              onPress={pickDocument}
              className={`border-2 border-dashed rounded-xl p-6 items-center justify-center ${file ? 'border-accent bg-accentLight dark:bg-gray-800' : 'border-[#e5e7eb] dark:border-gray-700 bg-primary dark:bg-gray-900'}`}
            >
              <Feather name={file ? "check-circle" : "file-plus"} size={32} color={file ? "#1a87e1" : "#94A3B8"} className="mb-2" />
              {file ? (
                <Text className="text-accent font-semibold text-center">{file.name}</Text>
              ) : (
                <>
                  <Text className="text-textSecondary dark:text-gray-300 font-semibold text-center">Tap to select a file</Text>
                  <Text className="text-[#94A3B8] text-xs text-center mt-1">Supports JPG, PNG, PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            className={`w-full py-4 rounded-xl items-center justify-center flex-row shadow-sm ${(!name || !phone || !file || uploading) ? 'bg-[#e2e8f0]' : 'bg-accent'}`}
            disabled={!name || !phone || !file || uploading}
            onPress={handleUpload}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="white" size="small" className="mr-2" />
                <Text className="text-white font-bold text-base">Uploading to secure storage...</Text>
              </>
            ) : (
              <>
                <Feather name="upload" color={(!name || !phone || !file) ? "#94A3B8" : "white"} size={20} className="mr-2" />
                <Text className={`font-bold text-base ${(!name || !phone || !file) ? 'text-[#94A3B8]' : 'text-white'}`}>Upload Prescription</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
