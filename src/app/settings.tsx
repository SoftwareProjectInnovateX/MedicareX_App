import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
    contact: '',
    address: '',
  });

  const [goals, setGoals] = useState([
    { id: 1, text: 'Order monthly vitamins before the 1st', completed: false },
    { id: 2, text: 'Check prescription refill dates this week', completed: false },
    { id: 3, text: 'Review order history for the past month', completed: true },
  ]);
  const [newGoal, setNewGoal] = useState('');

  const [passwords, setPasswords] = useState({
    newPass: '',
    confirm: '',
  });

  useEffect(() => {
    if (!user?.uid) {
      setLoadingInitial(false);
      return;
    }
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            name: data.fullName || user.fullName || '',
            email: data.email || user.email || '',
            contact: data.contact || '',
            address: data.address || '',
          });
          if (data.goals && Array.isArray(data.goals)) {
            setGoals(data.goals);
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchProfile();
  }, [user]);

  const toggleGoal = (id: number) => {
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const deleteGoal = (id: number) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, { id: Date.now(), text: newGoal, completed: false }]);
      setNewGoal('');
    }
  };

  const saveSettings = async () => {
    if (passwords.newPass && passwords.newPass !== passwords.confirm) {
      Alert.alert('Error', 'New Password and Confirm Password do not match!');
      return;
    }

    setSaving(true);
    try {
      if (user?.uid) {
        const docRef = doc(db, 'users', user.uid);
        await setDoc(docRef, {
          fullName: profile.name,
          email: profile.email,
          contact: profile.contact,
          address: profile.address,
          goals: goals
        }, { merge: true });
      }

      if (passwords.newPass && auth.currentUser) {
        await updatePassword(auth.currentUser, passwords.newPass);
        setPasswords({ newPass: '', confirm: '' });
      }

      Alert.alert('Success', 'Settings saved successfully!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      Alert.alert('Error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#1a87e1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="px-6 pt-14 pb-4 bg-white border-b border-[#e5e7eb] flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity 
          className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" color="#1E293B" size={20} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary">Settings</Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          
          <View className="mb-6">
            <Text className="text-3xl font-black text-textPrimary">Account Settings</Text>
            <Text className="text-textSecondary text-sm font-medium mt-1">Manage your profile, personal goals, and security.</Text>
          </View>

          {/* Personal Information */}
          <View className="bg-white rounded-3xl shadow-sm border border-[#e5e7eb] overflow-hidden mb-6">
            <View className="bg-slate-50 border-b border-[#e5e7eb] p-4 flex-row items-center">
              <Feather name="user" color="#1a87e1" size={20} />
              <Text className="text-lg font-black text-textPrimary ml-3">Personal Information</Text>
            </View>
            <View className="p-5 space-y-4">
              <View>
                <Text className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-1.5">Full Name</Text>
                <TextInput 
                  className="bg-primary rounded-xl px-4 py-3 text-textPrimary font-bold border border-[#e5e7eb]"
                  value={profile.name}
                  onChangeText={(text) => setProfile({...profile, name: text})}
                  placeholder="Your Name"
                />
              </View>
              <View>
                <Text className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-1.5">Email Address</Text>
                <TextInput 
                  className="bg-primary rounded-xl px-4 py-3 text-textPrimary font-bold border border-[#e5e7eb]"
                  value={profile.email}
                  onChangeText={(text) => setProfile({...profile, email: text})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Your Email"
                />
              </View>
              <View>
                <Text className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-1.5">Contact Number</Text>
                <TextInput 
                  className="bg-primary rounded-xl px-4 py-3 text-textPrimary font-bold border border-[#e5e7eb]"
                  value={profile.contact}
                  onChangeText={(text) => setProfile({...profile, contact: text})}
                  keyboardType="phone-pad"
                  placeholder="Phone Number"
                />
              </View>
              <View>
                <Text className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-1.5">Delivery Address</Text>
                <TextInput 
                  className="bg-primary rounded-xl px-4 py-3 text-textPrimary font-bold border border-[#e5e7eb]"
                  value={profile.address}
                  onChangeText={(text) => setProfile({...profile, address: text})}
                  placeholder="Home Address"
                />
              </View>
            </View>
          </View>

          {/* Personal Health Goals */}
          <View className="bg-white rounded-3xl shadow-sm border border-[#e5e7eb] overflow-hidden mb-6">
            <View className="bg-slate-50 border-b border-[#e5e7eb] p-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Feather name="target" color="#9333EA" size={20} />
                <Text className="text-lg font-black text-textPrimary ml-3">Health Goals</Text>
              </View>
              <View className="bg-white px-2 py-1 rounded border border-[#e5e7eb]">
                <Text className="text-[10px] font-black text-textSecondary uppercase tracking-widest">
                  {goals.filter(g => g.completed).length} / {goals.length}
                </Text>
              </View>
            </View>
            <View className="p-5">
              {goals.map(goal => (
                <View 
                  key={goal.id} 
                  className={`flex-row items-center justify-between p-3 rounded-xl border mb-3 ${goal.completed ? 'bg-green-50 border-green-200' : 'bg-white border-[#e5e7eb]'}`}
                >
                  <TouchableOpacity className="flex-row items-center flex-1" onPress={() => toggleGoal(goal.id)}>
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${goal.completed ? 'bg-green-500 border-green-500' : 'border-[#CBD5E1]'}`}>
                      {goal.completed && <Feather name="check" color="#ffffff" size={14} />}
                    </View>
                    <Text className={`font-bold flex-1 ${goal.completed ? 'text-green-800 line-through opacity-70' : 'text-textPrimary'}`}>
                      {goal.text}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteGoal(goal.id)} className="p-2">
                    <Feather name="trash-2" color="#94A3B8" size={18} />
                  </TouchableOpacity>
                </View>
              ))}
              
              <View className="flex-row items-center mt-2">
                <View className="flex-1 flex-row items-center bg-primary rounded-xl px-4 border border-[#e5e7eb]">
                  <Feather name="plus" color="#94A3B8" size={16} />
                  <TextInput 
                    className="flex-1 py-3 ml-2 text-textPrimary font-bold"
                    placeholder="Type a new goal..."
                    value={newGoal}
                    onChangeText={setNewGoal}
                    onSubmitEditing={addGoal}
                  />
                </View>
                <TouchableOpacity 
                  className="bg-accent ml-3 w-12 h-12 rounded-xl items-center justify-center"
                  onPress={addGoal}
                >
                  <Feather name="check" color="#ffffff" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Account Security */}
          <View className="bg-white rounded-3xl shadow-sm border border-[#e5e7eb] overflow-hidden mb-8">
            <View className="bg-slate-50 border-b border-[#e5e7eb] p-4 flex-row items-center">
              <Feather name="lock" color="#F59E0B" size={20} />
              <Text className="text-lg font-black text-textPrimary ml-3">Security</Text>
            </View>
            <View className="p-5 space-y-4">
              <View>
                <Text className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-1.5">New Password</Text>
                <TextInput 
                  className="bg-primary rounded-xl px-4 py-3 text-textPrimary font-bold border border-[#e5e7eb]"
                  value={passwords.newPass}
                  onChangeText={(text) => setPasswords({...passwords, newPass: text})}
                  secureTextEntry
                  placeholder="••••••••"
                />
              </View>
              <View>
                <Text className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-1.5">Confirm Password</Text>
                <TextInput 
                  className="bg-primary rounded-xl px-4 py-3 text-textPrimary font-bold border border-[#e5e7eb]"
                  value={passwords.confirm}
                  onChangeText={(text) => setPasswords({...passwords, confirm: text})}
                  secureTextEntry
                  placeholder="••••••••"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity 
            className="bg-accent rounded-2xl py-4 flex-row justify-center items-center shadow-lg shadow-accent/30 mb-10"
            onPress={saveSettings}
          >
            <Feather name="save" color="#ffffff" size={20} />
            <Text className="text-white font-black text-lg ml-2">Save Preferences</Text>
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
