import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Modal, FlatList, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.126.76.9:5000/api';
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const prescriptionDrugs = [
  'amoxicillin',
  'azithromycin',
  'metformin',
  'atorvastatin',
  'adipalin',
  'sergey',
];


const BouncingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: any, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View className="flex-row items-center">
      <Animated.View style={{ transform: [{ translateY: dot1 }] }} className="w-2 h-2 bg-blue-400 rounded-full mx-0.5" />
      <Animated.View style={{ transform: [{ translateY: dot2 }] }} className="w-2 h-2 bg-blue-400 rounded-full mx-0.5" />
      <Animated.View style={{ transform: [{ translateY: dot3 }] }} className="w-2 h-2 bg-blue-400 rounded-full mx-0.5" />
    </View>
  );
};

interface Message {
  role: 'user' | 'bot';
  text: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const STORAGE_KEY = '@mediccarex_chat_history';

const defaultMessage: Message = {
  role: "bot",
  text: "Hello! I'm the MediCareX Health Assistant. I answer general health questions based on WHO guidelines.\n\nHow can I help you today?\n\n⚕️ General health information only — not a substitute for professional medical advice.",
};

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([defaultMessage]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);



  const loadChatHistory = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as ChatSession[];
        setChatSessions(parsed);
        if (parsed.length > 0) {
          setCurrentChatId(parsed[0].id);
          setMessages(parsed[0].messages);
        } else {
          startNewChat();
        }
      } else {
        startNewChat();
      }
    } catch (e) {
      console.error('Failed to load history', e);
      startNewChat();
    }
  };

  const saveChatSessions = async (sessions: ChatSession[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      setChatSessions(sessions);
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const startNewChat = () => {
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setMessages([defaultMessage]);
    setIsHistoryModalVisible(false);
  };

  const selectChat = (id: string) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      setCurrentChatId(session.id);
      setMessages(session.messages);
      setIsHistoryModalVisible(false);
    }
  };

  const updateCurrentSession = async (newMessages: Message[]) => {
    let title = "New Chat";
    if (newMessages.length >= 2 && newMessages[1].role === 'user') {
      title = newMessages[1].text.slice(0, 30) + (newMessages[1].text.length > 30 ? '...' : '');
    }

    const session: ChatSession = {
      id: currentChatId || Date.now().toString(),
      title,
      messages: newMessages,
      updatedAt: Date.now(),
    };

    let updatedSessions = [...chatSessions];
    const index = updatedSessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      updatedSessions[index] = session;
    } else {
      updatedSessions.unshift(session);
    }
    
    // Sort by most recent
    updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    
    await saveChatSessions(updatedSessions);
    if (!currentChatId) {
      setCurrentChatId(session.id);
    }
  };

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

    const updatedMessages: Message[] = [...messages, { role: "user", text: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);
    await updateCurrentSession(updatedMessages);

    try {
      const messageLower = userMessage.toLowerCase();
      const foundDrug = prescriptionDrugs.find((drug) =>
        messageLower.includes(drug.toLowerCase()),
      );
      
      if (foundDrug) {
        const replyText = `${foundDrug.charAt(0).toUpperCase() + foundDrug.slice(1)} is a prescription medication. Please consult a licensed doctor.\n\n⚕️ This is general health information only — not a substitute for professional medical advice.`;
        const finalMessages: Message[] = [...updatedMessages, { role: "bot", text: replyText }];
        setMessages(finalMessages);
        await updateCurrentSession(finalMessages);
        setIsLoading(false);
        return;
      }

      let productContext = '';
      try {
        const availKeywords = [
          'thiyanawada', 'thiyenawada', 'tiyanawada', 'tiyenawada',
          'thiyanavada', 'thiyenavada', 'tiyanavada', 'tiyenavada',
          'thiyanawadha', 'tiyeda', 'thiyeda',
          'have', 'available', 'stock', 'sell', 'is there', 'are there', 'do you have'
        ];
        const hasAvailKeyword = availKeywords.some(k => messageLower.includes(k));
        
        if (hasAvailKeyword) {
          const productsRes = await fetch(`${API_BASE}/products`);
          if (productsRes.ok) {
            const products = await productsRes.json();
            const matchedProduct = products.find((p: any) => {
              if (!p.name) return false;
              const words = p.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
              return words.length > 0 && words.some((w: string) => messageLower.includes(w));
            });
            if (matchedProduct) {
              productContext = `SYSTEM ALERT: The user is asking about the availability of the product '${matchedProduct.name}'. We DO have it in stock. Current stock quantity: ${matchedProduct.stock}. Price per unit: Rs. ${matchedProduct.price}. Inform the user about this availability, stock, and price naturally in the language they used.`;
            }
          }
        }
      } catch (e) {
        console.log("Failed to check product catalog", e);
      }

      const history = updatedMessages
        .slice(1) // skip welcome message
        .slice(0, -1) // skip current message
        .map((msg) => ({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text }));

      const systemPrompt = `
You are a health assistant for MediCareX pharmacy.

RULES — follow strictly:
1. For general health and first aid advice, follow WHO (World Health Organization) guidelines only.
   For OTC product advice, you may also refer to NHS (UK National Health Service) and FDA (US Food & Drug Administration) guidelines.
   If none of these sources have guidance on a topic, say: "I don't have verified information on that. Please consult a doctor."
2. NEVER recommend or mention prescription drugs.
   If asked, say: "That requires a prescription. Please consult a licensed doctor."
3. You CAN recommend OTC products approved by WHO, NHS, or FDA: Paracetamol, Ibuprofen, antacids, antihistamines, vitamins, baby care items.
4. Always end responses with:
   "⚕️ This is general health information only. Not a substitute for professional medical advice." (Translate this to Sinhala if replying in Sinhala).
5. If symptoms sound life-threatening (chest pain, difficulty breathing), say:
   "This sounds serious. Please call emergency services or go to a hospital immediately."
6. Formatting rules:
   - NEVER use markdown tables.
   - Limit responses to 2-3 short sentences (a single clean paragraph).
   - Use simple bullet points (maximum 3, if necessary) rather than dense headers or multi-section checklists.
   - Keep the language conversational, brief, and suitable for a compact chat interface.
7. Language rules:
   - If the user asks in Sinhala script OR Singlish (Sinhala words written with English alphabet), you MUST reply entirely in the Sinhala language.
   - If the user asks in English, you MUST reply entirely in English.
`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: productContext ? `${productContext}\n\nUser Message: ${userMessage}` : userMessage },
      ];

      const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages,
          max_tokens: 500,
        }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const data = await response.json();
      const botReply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      
      const finalMessages: Message[] = [...updatedMessages, { role: "bot", text: botReply }];
      setMessages(finalMessages);
      await updateCurrentSession(finalMessages);
    } catch (err: any) {
      console.error("Chat error:", err);
      // Check if it's a timeout or network error
      const errorText = err.name === 'AbortError' 
        ? "Request timed out. Please check your internet connection or try again." 
        : "Sorry, I couldn't connect. Please try again.";
        
      const errorMessages: Message[] = [
        ...updatedMessages,
        { role: "bot", text: errorText },
      ];
      setMessages(errorMessages);
      await updateCurrentSession(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      {/* Header */}
      <View className="bg-[#1a87e1] px-4 py-3 flex-row items-center shadow-md">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Feather name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full items-center justify-center overflow-hidden">
          <MaterialCommunityIcons name="shield-plus" color="#1a87e1" size={20} />
        </View>
        
        <View className="ml-3 flex-1">
          <Text className="text-white font-semibold text-sm">Health Assistant</Text>
          <Text className="text-blue-200 text-xs">WHO Guidelines Only</Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity onPress={startNewChat} className="p-2 mr-1">
            <Feather name="plus" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsHistoryModalVisible(true)} className="p-2">
            <Feather name="clock" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isHistoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl h-[70%]">
            <View className="flex-row justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Chat History</Text>
              <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)} className="p-2">
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={chatSessions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <Text className="text-center text-gray-500 mt-10">No past chats found.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => selectChat(item.id)}
                  className={`p-4 rounded-xl mb-3 border ${
                    currentChatId === item.id 
                      ? 'bg-blue-50 border-blue-200 dark:bg-gray-700 dark:border-gray-600' 
                      : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-900 dark:text-white font-medium flex-1 mr-2" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Feather name="chevron-right" size={16} color={colorScheme === 'dark' ? '#FFFFFF' : '#9ca3af'} />
                  </View>
                  <Text className="text-gray-500 text-xs mt-2">
                    {new Date(item.updatedAt).toLocaleString()} • {item.messages.length - 1} messages
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
                <View className="w-7 h-7 bg-blue-100 rounded-full items-center justify-center mr-2 mt-1">
                  <Text className="text-[#1a87e1] text-sm font-bold">+</Text>
                </View>
              )}
              
              <View 
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-[#1a87e1] rounded-br-sm' 
                    : 'bg-white dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 rounded-bl-sm'
                }`}
              >
                <Text 
                  className={`${msg.role === 'user' ? 'text-white' : 'text-textPrimary dark:text-white'} text-sm leading-5`}
                >
                  {msg.role === 'bot' && msg.text.includes("⚕️") ? (
                    <>
                      {msg.text.replace(/⚕️.*$/, "")}
                      <Text className="text-[10px] text-textSecondary dark:text-gray-300 italic mt-2">
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
              <View className="w-7 h-7 bg-blue-100 rounded-full items-center justify-center mr-2 mt-1">
                <Text className="text-[#1a87e1] text-sm font-bold">+</Text>
              </View>
              <View className="bg-white dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 px-4 py-4 rounded-2xl rounded-bl-sm flex-row items-center">
                <BouncingDots />
              </View>
            </View>
          )}
        </ScrollView>

        <View className="p-3 bg-white dark:bg-gray-800 border-t border-[#e5e7eb] dark:border-gray-700 flex-row items-center">
          <TextInput 
            value={input}
            onChangeText={setInput}
            placeholder="Describe your symptoms..."
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
        <View className="bg-white dark:bg-gray-800 pb-2 pt-1">
          <Text className="text-center text-[10px] text-textSecondary dark:text-gray-300">
            For emergencies, call your local emergency number immediately
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
