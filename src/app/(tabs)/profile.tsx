import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, TextInput, ActivityIndicator, Alert, Platform, useColorScheme } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { updateProfile } from 'firebase/auth';
import { db, storage, auth } from '../../services/firebase';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const [userData, setUserData] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [ordersCount, setOrdersCount] = useState(0);
  const [prescriptionsCount, setPrescriptionsCount] = useState(0);

  // Listen to user document in real-time to get the latest name and photo
  useEffect(() => {
    if (user?.uid) {
      const userRef = doc(db, 'users', user.uid);
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
          setEditName(docSnap.data().fullName || docSnap.data().name || '');
        }
      });
      
      const { collection, query, where } = require('firebase/firestore');
      
      const qOrders = query(collection(db, 'CustomerOrders'), where('userId', '==', user.uid));
      const unsubOrders = onSnapshot(qOrders, (snap: any) => setOrdersCount(snap.size));
      
      const qPres = query(collection(db, 'prescriptions'), where('userId', '==', user.uid));
      const unsubPres = onSnapshot(qPres, (snap: any) => setPrescriptionsCount(snap.size));
      
      return () => {
        unsubUser();
        unsubOrders();
        unsubPres();
      };
    }
  }, [user]);

  if (!user) {
    return (
      <View className="flex-1 bg-primary dark:bg-gray-900 items-center justify-center px-6">
        <View className="w-24 h-24 bg-accentLight dark:bg-gray-800 rounded-full items-center justify-center mb-6">
          <Feather name="user" color="#1a87e1" size={40} />
        </View>
        <Text className="text-2xl font-bold text-textPrimary dark:text-white mb-2">Guest Profile</Text>
        <Text className="text-textSecondary dark:text-gray-300 text-center mb-8">Sign in to track orders, save prescriptions, and manage your health.</Text>
        <TouchableOpacity 
          className="bg-accent w-full py-4 rounded-2xl items-center"
          onPress={() => router.push('/(auth)/login')}
        >
          <Text className="text-white font-bold text-lg">Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUpdating(true);
        const asset = result.assets[0];
        
        let base64Image = '';

        // Compress and convert to base64
        try {
          const manipResult = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 300 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          base64Image = `data:image/jpeg;base64,${manipResult.base64}`;
        } catch (manipError) {
          console.error("Image compression failed, using original", manipError);
          throw new Error('Could not process the image properly. Try a different photo.');
        }
        
        // Save base64 directly to Firestore to bypass all Storage Rules
        await updateDoc(doc(db, 'users', user.uid), { photoURL: base64Image });
        
        // Removed Firebase Auth updateProfile because Auth rejects long Base64 strings (auth/invalid-profile-attribute)
        
        setIsUpdating(false);
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      Alert.alert('Update Error', error.message || 'Failed to update profile picture. Please try again.');
      setIsUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { fullName: editName.trim() });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: editName.trim() });
      }
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating profile', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const menuItems = [
    { icon: <Feather name="clock" color="#1a87e1" size={24} />, title: 'Order History', subtitle: 'Track your recent orders', route: '/orders' },
    { icon: <Feather name="file-text" color="#1a87e1" size={24} />, title: 'My Prescriptions', subtitle: 'Manage uploaded prescriptions', route: '/prescription' },
    { icon: <Feather name="settings" color="#1a87e1" size={24} />, title: 'Settings', subtitle: 'Notifications, password, etc.', route: '/settings' },
    { icon: <Feather name="help-circle" color="#1a87e1" size={24} />, title: 'Help & Support', subtitle: 'Contact us or view FAQs', route: '/help' },
  ];

  const displayName = userData?.fullName || userData?.name || user.displayName || 'Valued Customer';
  const displayPhoto = userData?.photoURL || user.photoURL;

  return (
    <View className="flex-1 bg-primary dark:bg-gray-900">
      <ScrollView className="flex-1 bg-primary dark:bg-gray-900" showsVerticalScrollIndicator={false}>
        {/* Header Profile Section */}
        <View className="bg-accent px-6 pt-16 pb-8 rounded-b-[40px] shadow-sm">
          <View className="flex-row items-center">
            <View className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full items-center justify-center border-4 border-accent overflow-hidden shadow-md">
              {displayPhoto ? (
                <Image source={{ uri: displayPhoto }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Feather name="user" color="#1a87e1" size={40} />
              )}
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-2xl font-bold text-white mb-1" numberOfLines={1}>{displayName}</Text>
              <Text className="text-white/80 font-medium">{user.email}</Text>
              <TouchableOpacity 
                className="mt-2 bg-white/20 self-start px-4 py-1.5 rounded-full flex-row items-center border border-white/30"
                onPress={() => setShowEditModal(true)}
              >
                <Feather name="edit-2" color="#ffffff" size={12} className="mr-1" />
                <Text className="text-white text-xs font-bold ml-1">Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats/Quick Info */}
        <View className="flex-row justify-between px-6 mt-[-20px] mb-6">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-1 mr-2 shadow-sm items-center border border-[#e5e7eb] dark:border-gray-700">
            <Text className="text-accent font-bold text-2xl mb-1">{ordersCount}</Text>
            <Text className="text-textSecondary dark:text-gray-300 text-xs font-medium">Orders</Text>
          </View>
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-1 ml-2 shadow-sm items-center border border-[#e5e7eb] dark:border-gray-700">
            <Text className="text-accent font-bold text-2xl mb-1">{prescriptionsCount}</Text>
            <Text className="text-textSecondary dark:text-gray-300 text-xs font-medium">Prescriptions</Text>
          </View>
        </View>

        {/* Menu Options */}
        <View className="px-6 pb-8">
          <Text className="text-lg font-bold text-textPrimary dark:text-white mb-4">Account Overview</Text>
          
          <View className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-[#e5e7eb] dark:border-gray-700 overflow-hidden">
            {menuItems.map((item, index) => (
              <TouchableOpacity 
                key={index}
                className={`flex-row items-center p-4 ${index !== menuItems.length - 1 ? 'border-b border-[#e5e7eb] dark:border-gray-700' : ''}`}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <View className="w-12 h-12 bg-primary dark:bg-gray-900 rounded-xl items-center justify-center mr-4">
                  {item.icon}
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-textPrimary dark:text-white text-base">{item.title}</Text>
                  <Text className="text-textSecondary dark:text-gray-300 text-xs mt-0.5">{item.subtitle}</Text>
                </View>
                <Feather name="chevron-right" color={colorScheme === 'dark' ? '#FFFFFF' : '#CBD5E1'} size={24} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            className="mt-8 bg-red-50 py-4 rounded-2xl items-center flex-row justify-center border border-red-100 mb-10"
            onPress={logout}
          >
            <Feather name="log-out" color="#EF4444" size={20} style={{ marginRight: 8 }} />
            <Text className="text-red-500 font-bold text-lg">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 h-[75%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-black text-textPrimary dark:text-white">Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} className="w-8 h-8 bg-slate-100 dark:bg-gray-800 rounded-full items-center justify-center">
                <Feather name="x" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Profile Image Picker */}
              <View className="items-center mb-8 mt-2">
                <View className="relative">
                  <View className="w-28 h-28 bg-slate-100 dark:bg-gray-800 rounded-full items-center justify-center border-4 border-primary overflow-hidden shadow-sm">
                    {displayPhoto ? (
                      <Image source={{ uri: displayPhoto }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Feather name="user" color="#94A3B8" size={40} />
                    )}
                  </View>
                  <TouchableOpacity 
                    className="absolute bottom-0 right-0 w-9 h-9 bg-accent rounded-full items-center justify-center shadow-md border-2 border-white"
                    onPress={handlePickImage}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Feather name="camera" color="#ffffff" size={16} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text className="text-textSecondary dark:text-gray-300 text-xs mt-3 font-semibold">Tap camera to change photo</Text>
              </View>

              {/* Name Input */}
              <View className="mb-4">
                <Text className="text-[10px] font-black text-textSecondary dark:text-gray-300 uppercase tracking-widest mb-1.5">Full Name</Text>
                <TextInput 
                  className="bg-primary dark:bg-gray-900 rounded-xl px-4 py-3.5 text-textPrimary dark:text-white font-bold border border-[#e5e7eb] dark:border-gray-700 text-base"
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your full name"
                />
              </View>

              {/* Email (Read Only) */}
              <View className="mb-8">
                <Text className="text-[10px] font-black text-textSecondary dark:text-gray-300 uppercase tracking-widest mb-1.5">Email Address</Text>
                <View className="bg-slate-50 dark:bg-gray-800 rounded-xl px-4 py-3.5 border border-[#e5e7eb] dark:border-gray-700">
                  <Text className="text-textSecondary dark:text-gray-300 font-bold text-base">{user.email}</Text>
                </View>
                <Text className="text-xs text-textSecondary dark:text-gray-300 mt-2">Email addresses cannot be changed here. Visit settings for account management.</Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity 
                className={`w-full py-4 rounded-2xl items-center flex-row justify-center shadow-lg ${isUpdating ? 'bg-blue-300' : 'bg-accent shadow-accent/30'}`}
                onPress={handleSaveProfile}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#ffffff" className="mr-2" />
                ) : (
                  <Feather name="check" color="#ffffff" size={20} className="mr-2" />
                )}
                <Text className="text-white font-black text-lg">Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
