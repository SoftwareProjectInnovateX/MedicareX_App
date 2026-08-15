import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Image as RNImage } from 'react-native';

export default function SupportChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user?.email) return;

    // Fetch documents matching user's email. We sort them locally to avoid needing a Firestore composite index.
    const q = query(
      collection(db, 'contactMessages'),
      where('email', '==', user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt ? data.createdAt.toMillis() : Date.now();
        
        // The user's original message
        if (!data.userDeletedMessage && (data.message || data.imageUrl || data.deletedForEveryone)) {
          fetchedMessages.push({
            id: docSnap.id + '_user',
            docId: docSnap.id,
            role: 'user',
            text: data.deletedForEveryone ? "🚫 This message was deleted" : (data.message || ''),
            imageUrl: data.deletedForEveryone ? null : data.imageUrl,
            createdAt: createdAt,
            status: data.status,
            isDeleted: !!data.deletedForEveryone
          });
        }
        // The pharmacist's reply (if any)
        if (data.reply && !data.replyDeletedForUser) {
          // We add a tiny delay to the pharmacist's message timestamp so it sorts after the user's message
          fetchedMessages.push({
            id: docSnap.id + '_pharmacist',
            docId: docSnap.id,
            role: 'pharmacist',
            text: data.reply,
            createdAt: createdAt + 1,
            isDeleted: false
          });
        }
      });
      
      // Sort messages by timestamp ascending
      fetchedMessages.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [user?.email]);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleLongPress = (msg: any) => {
    if (msg.isDeleted) return;

    if (msg.role === 'pharmacist') {
      Alert.alert("Delete Message", "Do you want to delete this message for yourself?", [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete for me", 
          style: "destructive", 
          onPress: async () => {
            const ref = doc(db, 'contactMessages', msg.docId);
            await updateDoc(ref, { replyDeletedForUser: true });
          } 
        }
      ]);
    } else {
      Alert.alert("Delete Message", "What would you like to do?", [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete for me", 
          onPress: async () => {
            const ref = doc(db, 'contactMessages', msg.docId);
            await updateDoc(ref, { userDeletedMessage: true });
          } 
        },
        { 
          text: "Delete for everyone", 
          style: "destructive",
          onPress: async () => {
            const ref = doc(db, 'contactMessages', msg.docId);
            await updateDoc(ref, { deletedForEveryone: true });
          } 
        }
      ]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !user?.email || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      await addDoc(collection(db, 'contactMessages'), {
        name: (user as any)?.fullName || user?.displayName || 'Customer',
        email: user.email,
        message: userMessage,
        status: 'unread',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      {/* Header */}
      <View className="bg-[#0f2a5e] px-4 py-3 flex-row items-center shadow-md">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Feather name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View className="w-8 h-8 bg-white rounded-full items-center justify-center overflow-hidden">
          <MaterialCommunityIcons name="doctor" color="#0f2a5e" size={20} />
        </View>
        
        <View className="ml-3 flex-1">
          <Text className="text-white font-semibold text-sm">Live Pharmacist</Text>
          <Text className="text-blue-200 text-xs">Customer Support</Text>
        </View>

        <View className="flex-row items-center">
          <View className="flex-row items-center mr-2">
            <View className="w-2 h-2 bg-green-400 rounded-full mr-1"></View>
            <Text className="text-blue-200 text-xs">Online</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 p-4" 
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View className="flex-row justify-start mb-4">
               <View className="w-7 h-7 bg-blue-100 dark:bg-blue-900/40 rounded-full items-center justify-center mr-2 mt-1">
                  <MaterialCommunityIcons name="doctor" color={colorScheme === 'dark' ? '#bfdbfe' : '#0f2a5e'} size={16} />
               </View>
               <View className="max-w-[80%] px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 rounded-bl-sm">
                 <Text className="text-textPrimary dark:text-white text-sm leading-5">
                   Hello! I'm your pharmacist. How can I help you today?
                 </Text>
               </View>
            </View>
          )}

          {messages.map((msg, index) => (
            <View 
              key={msg.id || index} 
              className={`flex-row mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'pharmacist' && (
                <View className="w-7 h-7 bg-blue-100 dark:bg-blue-900/40 rounded-full items-center justify-center mr-2 mt-1">
                  <MaterialCommunityIcons name="doctor" color={colorScheme === 'dark' ? '#bfdbfe' : '#0f2a5e'} size={16} />
                </View>
              )}
              
              <TouchableOpacity 
                activeOpacity={0.8}
                onLongPress={() => handleLongPress(msg)}
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-[#1a87e1] rounded-br-sm' 
                    : 'bg-white dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 rounded-bl-sm'
                }`}
              >
                {msg.imageUrl && (
                  <RNImage 
                    source={{ uri: msg.imageUrl }} 
                    style={{ width: 200, height: 200, borderRadius: 8, marginBottom: msg.text ? 8 : 0 }} 
                    resizeMode="cover"
                  />
                )}
                {!!msg.text && (
                  <Text 
                    className={`${msg.role === 'user' ? 'text-white' : 'text-textPrimary dark:text-white'} ${msg.isDeleted ? 'italic opacity-80' : ''} text-sm leading-5`}
                  >
                    {msg.text}
                  </Text>
                )}
                {msg.role === 'user' && !msg.isDeleted && (
                  <View className="flex-row justify-end items-center mt-1">
                    <Text className="text-[10px] text-blue-100 mr-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <MaterialCommunityIcons 
                      name="check-all" 
                      size={14} 
                      color={msg.status === 'read' ? '#1e3a8a' : '#93c5fd'} 
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}
          
          {isLoading && (
            <View className="flex-row justify-end mb-4">
              <ActivityIndicator size="small" color="#1a87e1" className="mr-2" />
            </View>
          )}
        </ScrollView>

        <View className="p-3 bg-white dark:bg-gray-900 border-t border-[#e5e7eb] dark:border-gray-800 flex-row items-center">
          <TextInput 
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor={colorScheme === 'dark' ? '#6b7280' : '#9ca3af'}
            className="flex-1 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 border-2 border-[#e5e7eb] dark:border-gray-700 text-textPrimary dark:text-white mr-2"
            multiline
            maxLength={500}
            style={{ minHeight: 44, maxHeight: 100 }}
          />
          <TouchableOpacity 
            onPress={sendMessage}
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2.5 rounded-xl items-center justify-center ${(!input.trim() || isLoading) ? 'bg-blue-300' : 'bg-[#1a87e1]'}`}
          >
            <Feather name="send" color="#ffffff" size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
