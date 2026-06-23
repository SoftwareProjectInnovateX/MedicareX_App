import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';

export default function PrescriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
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
      const fd = new FormData();
      fd.append('prescription', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
      fd.append('customerName', name);
      fd.append('customerPhone', phone);
      fd.append('customerAddress', address);
      if (user?.uid) {
        fd.append('userId', user.uid);
      }

      const res = await fetch('http://10.132.249.9:5000/api/prescriptions/upload', {
        method: 'POST',
        body: fd,
        headers: {
          'Accept': 'application/json',
          // Note: Content-Type is set automatically by fetch when passing FormData
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Upload failed');
      }

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
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-row items-center p-4 border-b border-[#e5e7eb] bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color="#0f2a5e" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary">Upload Prescription</Text>
      </View>
      
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
        
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e7eb] mb-6">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-accentLight rounded-full items-center justify-center mr-3">
              <Feather name="upload" size={20} color="#1a87e1" />
            </View>
            <View>
              <Text className="font-bold text-textPrimary text-lg">Prescription Details</Text>
              <Text className="text-textSecondary text-xs">Fill in details and attach file</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View className="mb-4">
            <Text className="text-textPrimary font-semibold mb-2">Name</Text>
            <View className="flex-row items-center bg-primary px-4 py-3 rounded-xl border border-[#e5e7eb]">
              <Feather name="user" color="#1a87e1" size={18} />
              <TextInput 
                placeholder="Your full name" 
                className="flex-1 ml-3 text-textPrimary"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-textPrimary font-semibold mb-2">Phone</Text>
            <View className="flex-row items-center bg-primary px-4 py-3 rounded-xl border border-[#e5e7eb]">
              <Feather name="phone" color="#1a87e1" size={18} />
              <TextInput 
                placeholder="Your phone number" 
                className="flex-1 ml-3 text-textPrimary"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-textPrimary font-semibold mb-2">Address</Text>
            <View className="flex-row items-start bg-primary px-4 py-3 rounded-xl border border-[#e5e7eb]">
              <Feather name="map-pin" color="#1a87e1" size={18} className="mt-1" />
              <TextInput 
                placeholder="Your delivery address" 
                className="flex-1 ml-3 text-textPrimary"
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
            <Text className="text-textPrimary font-semibold mb-2">Prescription File</Text>
            <TouchableOpacity 
              onPress={pickDocument}
              className={`border-2 border-dashed rounded-xl p-6 items-center justify-center ${file ? 'border-accent bg-accentLight' : 'border-[#e5e7eb] bg-primary'}`}
            >
              <Feather name={file ? "check-circle" : "file-plus"} size={32} color={file ? "#1a87e1" : "#94A3B8"} className="mb-2" />
              {file ? (
                <Text className="text-accent font-semibold text-center">{file.name}</Text>
              ) : (
                <>
                  <Text className="text-textSecondary font-semibold text-center">Tap to select a file</Text>
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
