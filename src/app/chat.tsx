import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://10.207.127.9:5000/api';

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello! I'm the MediCareX Health Assistant. I answer general health questions based on WHO guidelines.\n\nHow can I help you today?\n\n⚕️ General health information only — not a substitute for professional medical advice.",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    const updatedMessages = [...messages, { role: "user", text: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const history = updatedMessages
        .slice(1) // skip welcome message
        .slice(0, -1) // skip current message
        .map((msg) => ({ role: msg.role, text: msg.text }));

      let token = null;
      if (user?.uid) {
        token = await user.getIdToken();
      }

      const headers: any = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: userMessage, history }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, I couldn't connect. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "bot",
        text: "Hello! I'm the MediCareX Health Assistant. I answer general health questions based on WHO guidelines.\n\nHow can I help you today?\n\n⚕️ General health information only — not a substitute for professional medical advice.",
      }
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      {/* Header */}
      <View className="bg-[#0b5ed7] px-4 py-3 flex-row items-center shadow-md">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Feather name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View className="w-10 h-10 bg-white rounded-full items-center justify-center overflow-hidden">
          <MaterialCommunityIcons name="shield-plus" color="#0b5ed7" size={24} />
        </View>
        
        <View className="ml-3 flex-1">
          <Text className="text-white font-bold text-base">Health Assistant</Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 bg-green-400 rounded-full mr-1"></View>
            <Text className="text-blue-200 text-xs">WHO Guidelines Only</Text>
          </View>
        </View>

        <TouchableOpacity onPress={clearChat} className="p-2">
          <Feather name="trash-2" size={20} color="#ffffff" />
        </TouchableOpacity>
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
          {messages.map((msg, index) => (
            <View 
              key={index} 
              className={`flex-row mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'bot' && (
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2 mt-1">
                  <MaterialCommunityIcons name="robot" color="#0b5ed7" size={16} />
                </View>
              )}
              
              <View 
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-[#0b5ed7] rounded-br-sm' 
                    : 'bg-white border border-[#e5e7eb] rounded-bl-sm'
                }`}
              >
                <Text 
                  className={`${msg.role === 'user' ? 'text-white' : 'text-textPrimary'} text-sm leading-5`}
                >
                  {msg.role === 'bot' && msg.text.includes("⚕️") ? (
                    <>
                      {msg.text.replace(/⚕️.*$/, "")}
                      <Text className="text-[10px] text-textSecondary italic mt-2">
                        {"\n\n"}⚕️ This is general health information only. It is not a substitute for professional medical advice.
                      </Text>
                    </>
                  ) : (
                    msg.text
                  )}
                </Text>
              </View>
            </View>
          ))}
          
          {isLoading && (
            <View className="flex-row justify-start mb-4">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2 mt-1">
                <MaterialCommunityIcons name="robot" color="#0b5ed7" size={16} />
              </View>
              <View className="bg-white border border-[#e5e7eb] px-4 py-3 rounded-2xl rounded-bl-sm flex-row items-center">
                <ActivityIndicator size="small" color="#0b5ed7" />
              </View>
            </View>
          )}
        </ScrollView>

        <View className="p-3 bg-white border-t border-[#e5e7eb] flex-row items-center">
          <TextInput 
            value={input}
            onChangeText={setInput}
            placeholder="Describe your symptoms..."
            className="flex-1 bg-primary rounded-full px-4 py-3 border border-[#e5e7eb] text-textPrimary mr-2"
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            onPress={sendMessage}
            disabled={isLoading || !input.trim()}
            className={`w-12 h-12 rounded-full items-center justify-center ${(!input.trim() || isLoading) ? 'bg-blue-300' : 'bg-[#0b5ed7]'}`}
          >
            <Feather name="send" color="#ffffff" size={20} style={{ marginLeft: -2, marginTop: 2 }} />
          </TouchableOpacity>
        </View>
        <Text className="text-center text-[10px] text-textSecondary pb-2 pt-1 bg-white">
          For emergencies, call your local emergency number immediately
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
