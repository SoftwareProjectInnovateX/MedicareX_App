import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, Share, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

// Simple Markdown Renderer for React Native
const SimpleMarkdown = ({ content }: { content: string }) => {
  if (!content) return null;
  
  // Clean AI artifacts
  let cleaned = content.replace(/^\s*#\s+[^\n]+\n+/, '');
  cleaned = cleaned.replace(/(\*?\*?Disclaimer:?[\s\S]*)/i, '');
  cleaned = cleaned.replace(/(\*?\*?Image\s?Prompt:?[\s\S]*)/i, '');
  
  const paragraphs = cleaned.split('\n\n').filter(p => p.trim().length > 0);
  
  return (
    <View className="mt-4">
      {paragraphs.map((p, index) => {
        const text = p.trim();
        if (text.startsWith('# ')) {
          return <Text key={index} className="text-3xl font-extrabold text-textPrimary dark:text-white mt-6 mb-4 leading-tight">{text.replace(/^# /, '').replace(/\*\*/g, '')}</Text>;
        } else if (text.startsWith('## ')) {
          return <Text key={index} className="text-2xl font-bold text-textPrimary dark:text-white mt-6 mb-3 leading-tight">{text.replace(/^## /, '').replace(/\*\*/g, '')}</Text>;
        } else if (text.startsWith('### ')) {
          return <Text key={index} className="text-xl font-bold text-textPrimary dark:text-white mt-4 mb-2 leading-tight">{text.replace(/^### /, '').replace(/\*\*/g, '')}</Text>;
        } else if (text.startsWith('- ') || text.startsWith('* ')) {
          // List
          const items = text.split('\n');
          return (
            <View key={index} className="mb-4 ml-2">
              {items.map((item, i) => (
                <View key={i} className="flex-row mb-2 pr-4">
                  <Text className="text-textPrimary dark:text-white mr-2 text-lg">•</Text>
                  <Text className="text-base text-textSecondary dark:text-gray-300 leading-relaxed flex-1">{item.replace(/^[-*] /, '').replace(/\*\*/g, '')}</Text>
                </View>
              ))}
            </View>
          );
        } else {
          const cleanText = text.replace(/\*\*/g, '');
          return <Text key={index} className="text-base text-textSecondary dark:text-gray-300 mb-4 leading-relaxed">{cleanText}</Text>;
        }
      })}
    </View>
  );
};

export default function BlogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  const getHostIp = () => {
    if (Platform.OS === 'web') return 'localhost';
    let ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    if (Constants?.expoConfig?.hostUri) {
      ip = Constants.expoConfig.hostUri.split(':')[0];
    } else if ((Constants as any)?.manifest?.hostUri) {
      ip = (Constants as any).manifest.hostUri.split(':')[0];
    }
    return ip;
  };
  
  const formatImageUrl = (url?: string) => {
    if (!url) return undefined;
    const hostIp = getHostIp();
    return url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'blogs', id as string);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error("Not found");
        const data = docSnap.data();
        setBlog({ id: docSnap.id, ...data });
        setLikes(data.likes || 0);
        
        // Fetch comments
        try {
          const q = query(collection(db, 'comments'), where('blogId', '==', id));
          const commentsSnap = await getDocs(q);
          const commentsData = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          commentsData.sort((a: any, b: any) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          setComments(commentsData);
        } catch(e) {
          console.log("Error fetching comments", e);
        }
        
      } catch (error) {
        console.error("Error fetching blog:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    }
  }, [id]);
  
  const handleLike = async () => {
    if (hasLiked) return;
    setHasLiked(true);
    setLikes(prev => prev + 1);
    try {
      const docRef = doc(db, 'blogs', id as string);
      await updateDoc(docRef, { likes: increment(1) });
    } catch (error) {
      console.error("Error liking blog", error);
    }
  };
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this health insight: ${blog?.title}\nRead more on MediCareX app!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const storedName = await AsyncStorage.getItem('userName');
      const userName = storedName || user?.displayName || 'App User';
      const commentObj = {
        blogId: id,
        userName,
        text: newComment,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'comments'), commentObj);
      setComments([{ id: docRef.id, ...commentObj }, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#1a87e1" />
      </View>
    );
  }

  if (!blog) {
    return (
      <View className="flex-1 bg-primary dark:bg-gray-900 justify-center items-center px-6">
        <Text className="text-xl font-bold text-textPrimary dark:text-white mb-4">Article Not Found</Text>
        <TouchableOpacity 
          className="bg-accent px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rawTitle = (blog.title || '').replace(/\*\*/g, '');
  const titleParts = rawTitle.split(':');
  const hasKicker = titleParts.length > 1;
  const kickerText = hasKicker ? titleParts[0].trim() : '';
  const mainTitleText = hasKicker ? titleParts.slice(1).join(':').trim() : rawTitle;
  const fallbackImg = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80";
  const dateStr = blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : "Just now";

  return (
    <View className="flex-1 bg-primary dark:bg-gray-900">
      {/* Header */}
      <View className="pt-14 pb-4 px-4 bg-white dark:bg-gray-800 flex-row items-center shadow-sm z-10 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity 
          className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colorScheme === 'dark' ? '#f1f5f9' : '#0f172a'} />
        </TouchableOpacity>
        <View className="flex-1 items-center mr-10">
          <Text className="text-lg font-bold text-textPrimary dark:text-white" numberOfLines={1}>Health Insight</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Banner Image */}
        <View className="w-full h-64 bg-gray-200">
          <Image 
            source={{ uri: formatImageUrl(blog.imageUrl) || formatImageUrl(blog.fallbackImageUrl) || fallbackImg }} 
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        <View className="px-6 py-8">
          {hasKicker && (
            <View className="mb-4 self-start">
              <View className="w-8 h-1 bg-brand mb-2 rounded-full opacity-80"></View>
              <Text className="text-brand font-bold uppercase tracking-widest text-xs">
                {kickerText}
              </Text>
            </View>
          )}
          
          <Text className="text-3xl font-extrabold text-textPrimary dark:text-white mb-6 leading-tight">
            {mainTitleText}
          </Text>

          {/* Author & Interaction Row */}
          <View className="flex-row items-center justify-between py-4 border-y border-gray-100 dark:border-gray-700 mb-6">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 items-center justify-center">
                <Text className="font-bold text-brand text-xs">MX</Text>
              </View>
              <View className="ml-3">
                <Text className="font-bold text-sm text-textPrimary dark:text-white">MediCareX Health</Text>
                <Text className="text-xs text-textSecondary dark:text-gray-400">{dateStr} • 4 min read</Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-4">
              <TouchableOpacity onPress={handleLike} className="flex-row items-center">
                <Ionicons name={hasLiked ? "heart" : "heart-outline"} size={22} color={hasLiked ? "#ef4444" : "#94a3b8"} />
                <Text className={`text-sm font-semibold ml-1 ${hasLiked ? 'text-red-500' : 'text-gray-400'}`}>{likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} className="ml-3">
                <Feather name="share-2" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Article Content */}
          <SimpleMarkdown content={blog.content} />

          {/* Medical Disclaimer */}
          <View className="mt-12 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Text className="text-xs italic text-textSecondary dark:text-gray-400 text-center leading-relaxed">
              "This article follows WHO health guidelines. However, it should not replace professional medical consultation."
            </Text>
          </View>

          {/* Comments Section Header */}
          <View className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700">
            <Text className="text-2xl font-bold text-textPrimary dark:text-white mb-6">Join the Discussion</Text>
            
            <View className="mb-8 p-1 rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex-row items-center">
              <TextInput 
                className="flex-1 px-4 py-3 text-base text-textPrimary dark:text-white"
                placeholder="Share your thoughts..."
                placeholderTextColor="#94a3b8"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity 
                className={`w-10 h-10 rounded-full mr-1 items-center justify-center ${isSubmitting || !newComment.trim() ? 'bg-gray-300 dark:bg-gray-600' : 'bg-blue-600'}`}
                onPress={handleAddComment}
                disabled={isSubmitting || !newComment.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="send" size={16} color="white" style={{ marginLeft: -2, marginTop: 2 }} />
                )}
              </TouchableOpacity>
            </View>
            
            {comments.length === 0 ? (
              <View className="items-center py-8 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Feather name="message-circle" size={32} color="#cbd5e1" className="mb-3" />
                <Text className="text-gray-500 dark:text-gray-400 font-medium">Be the first to comment on this article.</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm bg-white dark:bg-gray-800 mb-4">
                  <View className="flex-row items-center mb-3">
                    <View className="w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase text-xs bg-gray-100 dark:bg-gray-700 text-textPrimary dark:text-white">
                      <Text className="font-bold">{comment.userName ? comment.userName.charAt(0) : 'G'}</Text>
                    </View>
                    <View className="ml-3">
                      <Text className="font-bold text-textPrimary dark:text-white">{comment.userName}</Text>
                      <Text className="text-[10px] text-textSecondary dark:text-gray-400">{new Date(comment.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>
                  <Text className="text-textSecondary dark:text-gray-300">{comment.text}</Text>
                </View>
              ))
            )}
          </View>
          
        </View>
      </ScrollView>
    </View>
  );
}
