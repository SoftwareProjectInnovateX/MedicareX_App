import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Linking, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Globe, Tag, CheckCircle, Search, Bot, Verified, Lightbulb, ExternalLink, Stethoscope, Pill } from 'lucide-react-native';

const API_BASE = 'http://10.207.127.9:5000/api';

const globalBrandCatalog = [
  { name: 'Pfizer', category: 'Vaccines & respiratory', tagline: 'Leading global vaccine and wellness manufacturer', external: true },
  { name: 'Johnson & Johnson', category: 'Health & consumer care', tagline: 'Trusted solutions across consumer health and medical devices', external: true },
  { name: 'Novartis', category: 'Pharmaceutical innovation', tagline: 'Global medicines for specialty and primary care', external: true },
  { name: 'Bayer', category: 'Health & nutrition', tagline: 'Worldwide leader in healthcare and wellness products', external: true },
  { name: 'Sanofi', category: 'Specialty care', tagline: 'Vaccine and treatment expertise for global health', external: true },
  { name: 'Roche', category: 'Diagnostics & pharma', tagline: 'Precision diagnostics and medicine for modern healthcare', external: true },
];

const brandUrls: Record<string, string> = {
  Pfizer: 'https://www.pfizer.com',
  'Johnson & Johnson': 'https://www.jnj.com',
  Novartis: 'https://www.novartis.com',
  Bayer: 'https://www.bayer.com',
  Sanofi: 'https://www.sanofi.com',
  Roche: 'https://www.roche.com',
};

const whoLinks: Record<string, string> = {
  'Pain relief': 'https://www.who.int/news-room/fact-sheets/detail/pain-management',
  'Immune support': 'https://www.who.int/health-topics/immunization',
  'Digestive care': 'https://www.who.int/health-topics/diarrhoeal-disease',
  'Cold & flu': 'https://www.who.int/health-topics/influenza',
  'Daily wellness': 'https://www.who.int/health-topics/healthy-diet',
  'Diabetes care': 'https://www.who.int/health-topics/diabetes',
  'Mental wellness': 'https://www.who.int/health-topics/mental-health',
  "Women's health": 'https://www.who.int/health-topics/women-s-health',
  'Child health': 'https://www.who.int/health-topics/child-health',
  'Heart health': 'https://www.who.int/health-topics/cardiovascular-diseases',
};

const whoFacts = [
  'Regular physical activity reduces the risk of noncommunicable diseases like heart disease and diabetes.',
  'Vaccines are one of the safest and most effective ways to prevent illness and save lives.',
  'Balanced nutrition supports immune function and lowers the risk of chronic disease.',
  'Mental health is just as important as physical health; early support improves outcomes.',
  'Protecting children with routine health checks improves long-term growth and development.',
];

const topicMap = [ 
  { keywords: ['pain', 'ache', 'headache', 'fever'], label: 'Pain relief' },
  { keywords: ['immune', 'immunity', 'wellness', 'vitamin'], label: 'Immune support' },
  { keywords: ['digestive', 'stomach', 'acid', 'bloating'], label: 'Digestive care' },
  { keywords: ['cold', 'flu', 'cough', 'throat'], label: 'Cold & flu' },
  { keywords: ['daily', 'wellness', 'health', 'energy'], label: 'Daily wellness' },
  { keywords: ['sleep', 'insomnia', 'rest'], label: 'Sleep support' },
  { keywords: ['diabetes', 'blood sugar', 'glucose', 'insulin'], label: 'Diabetes care' },
  { keywords: ['mental', 'stress', 'anxiety', 'mood'], label: 'Mental wellness' },
  { keywords: ['women', 'female', 'pregnancy', 'menstrual'], label: "Women's health" },
  { keywords: ['child', 'kid', 'pediatric', 'infant'], label: 'Child health' },
  { keywords: ['heart', 'cardio', 'blood pressure'], label: 'Heart health' },
];

const PRESETS = ['Pain relief', 'Immune support', 'Digestive care', 'Cold & flu', 'Daily wellness', 'Diabetes care', "Women's health", 'Child health'];

export default function BrandsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const [brands, setBrands] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [healthGoal, setHealthGoal] = useState('');
  const [recommendation, setRecommendation] = useState({ title: '', summary: '', brands: [] as any[] });
  const [topic, setTopic] = useState('');
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch(`${API_BASE}/brands`);
        const data = await res.json();
        setBrands(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch brands:', err);
      }
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % whoFacts.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(brands.map((b) => b.category).filter(Boolean)));
    return ['All', ...unique];
  }, [brands]);

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return brands.filter((brand) => {
      const matchesQuery = !q || [brand.name, brand.tagline, brand.category, brand.description]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === 'All' || brand.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [brands, searchQuery, selectedCategory]);

  const handleRecommendBrands = () => {
    const normalized = healthGoal.trim().toLowerCase();
    if (!normalized) {
      setTopic('');
      setRecommendation({
        title: 'Try an AI health query',
        summary: 'Enter a health goal to get brand recommendations tailored to your need, including trusted global names.',
        brands: [],
      });
      return;
    }
    const matchedTopic = topicMap.find((item) => item.keywords.some((kw) => normalized.includes(kw)));
    const localMatches = brands
      .filter((brand) => {
        const s = [brand.name, brand.tagline, brand.category, brand.description].filter(Boolean).join(' ').toLowerCase();
        return normalized.split(/\s+/).some((t) => t && s.includes(t));
      })
      .map((brand) => ({ ...brand, external: false }));
    const globalMatches = globalBrandCatalog.filter((brand) => {
      const s = [brand.name, brand.tagline, brand.category].join(' ').toLowerCase();
      return normalized.split(/\s+/).some((t) => t && s.includes(t));
    });
    const topicMatches = matchedTopic
      ? globalBrandCatalog.filter((brand) =>
          brand.category.toLowerCase().includes(matchedTopic.label.toLowerCase()) ||
          brand.tagline.toLowerCase().includes(matchedTopic.label.toLowerCase()))
      : [];
    const combined = [...localMatches, ...globalMatches, ...topicMatches];
    const unique = combined.filter((item, i, self) => self.findIndex((o) => o.name === item.name) === i).slice(0, 6);
    setTopic(matchedTopic?.label || '');
    if (unique.length === 0) {
      setRecommendation({
        title: `No exact match for "${healthGoal}"`,
        summary: 'We still found trusted global healthcare brands that align with broader health categories. Try another phrase to narrow your results.',
        brands: globalBrandCatalog.slice(0, 4),
      });
      return;
    }
    setRecommendation({
      title: matchedTopic ? `${matchedTopic.label} brands` : `Smart matches for "${healthGoal}"`,
      summary: 'These suggestions combine your brand catalog with respected worldwide health brands.',
      brands: unique,
    });
  };

  const BrandCard = ({ brand }: { brand: any }) => (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-[#e5e7eb] dark:border-gray-700 shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-xs uppercase font-bold text-accent mb-1">{brand.category || 'Health brand'}</Text>
          <Text className="text-lg font-bold text-textPrimary dark:text-white">{brand.name}</Text>
          <Text className="text-sm text-textSecondary dark:text-gray-300 mt-1">{brand.tagline || brand.description?.slice(0, 65)}</Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${brand.external ? 'bg-blue-100' : 'bg-green-100'}`}>
          <Text className={`text-[10px] font-bold ${brand.external ? 'text-blue-700' : 'text-green-700'}`}>
            {brand.external ? 'Global' : 'Local'}
          </Text>
        </View>
      </View>
      {brand.external && brandUrls[brand.name] && (
        <TouchableOpacity 
          className="mt-3 flex-row items-center"
          onPress={() => Linking.openURL(brandUrls[brand.name])}
        >
          <ExternalLink size={14} color="#1a87e1" />
          <Text className="text-accent font-semibold ml-1 text-xs">Visit official site</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      <View className="flex-row items-center p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0f2a5e'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-textPrimary dark:text-white">Explore Brands</Text>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* HERO SECTION */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm border border-[#e5e7eb] dark:border-gray-700">
          <View className="bg-accentLight dark:bg-gray-800 self-start px-3 py-1 rounded-full mb-3">
            <Text className="text-accent text-[10px] font-bold uppercase tracking-widest">Trusted Medical Brands</Text>
          </View>
          <Text className="text-2xl font-bold text-textPrimary dark:text-white leading-tight">
            Explore medicine brands with{'\n'}
            <Text className="text-accent">AI-powered guidance.</Text>
          </Text>
          <Text className="text-sm text-textSecondary dark:text-gray-300 mt-2 leading-5">
            Compare trusted global names with local catalog recommendations. Every brand is verified for your health needs.
          </Text>
          
          <View className="flex-row flex-wrap gap-2 mt-4">
            <View className="bg-accentLight dark:bg-gray-800 px-3 py-1.5 rounded-full flex-row items-center border border-accentMid mr-2 mb-2">
              <Globe size={12} color="#1a87e1" />
              <Text className="text-xs font-semibold text-accent ml-1">Global brands</Text>
            </View>
            <View className="bg-accentLight dark:bg-gray-800 px-3 py-1.5 rounded-full flex-row items-center border border-accentMid mr-2 mb-2">
              <Bot size={12} color="#1a87e1" />
              <Text className="text-xs font-semibold text-accent ml-1">AI matching</Text>
            </View>
            <View className="bg-accentLight dark:bg-gray-800 px-3 py-1.5 rounded-full flex-row items-center border border-accentMid mr-2 mb-2">
              <Verified size={12} color="#1a87e1" />
              <Text className="text-xs font-semibold text-accent ml-1">Verified</Text>
            </View>
          </View>
        </View>

        {/* AI ADVISOR */}
        <View className="rounded-3xl p-6 mb-6 border border-[#bfdbfe]" style={{ backgroundColor: '#eff6ff' }}>
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-blue-200 rounded-full items-center justify-center mr-3">
              <Bot size={20} color="#1d4ed8" />
            </View>
            <View>
              <Text className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">AI Health Advisor</Text>
              <Text className="text-lg font-bold text-slate-900">Easy health guidance</Text>
            </View>
          </View>

          <Text className="font-semibold text-slate-900 mb-2">What do you need help with?</Text>
          <View className="bg-white dark:bg-gray-800 rounded-2xl flex-row items-center px-4 py-3 border border-[#bfdbfe] mb-3">
            <TextInput 
              placeholder="e.g. immune support, pain relief"
              className="flex-1 text-slate-900"
              placeholderTextColor="#94a3b8"
              value={healthGoal}
              onChangeText={setHealthGoal}
              onSubmitEditing={handleRecommendBrands}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                onPress={() => setHealthGoal(preset)}
                className={`mr-2 px-4 py-2 rounded-full border ${healthGoal === preset ? 'bg-accent border-accent' : 'bg-white dark:bg-gray-800 border-blue-200'}`}
              >
                <Text className={`text-xs font-semibold ${healthGoal === preset ? 'text-white' : 'text-accent'}`}>{preset}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="flex-row gap-2 mb-4">
            <TouchableOpacity 
              className="flex-1 bg-accent rounded-2xl py-3 items-center justify-center"
              onPress={handleRecommendBrands}
            >
              <Text className="text-white font-bold text-sm">Recommend brands</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="bg-white dark:bg-gray-800 border border-blue-300 rounded-2xl py-3 px-4 items-center justify-center"
              onPress={() => { setHealthGoal(''); setRecommendation({ title: '', summary: '', brands: [] }); setTopic(''); }}
            >
              <Text className="text-blue-700 font-bold text-sm">Reset</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-blue-200">
            {!recommendation.title ? (
              <View>
                <Text className="font-bold text-slate-900 mb-1">Try a quick health goal</Text>
                <Text className="text-sm text-slate-600 mb-3 leading-5">Our AI will match you with the most relevant brands from your catalog and trusted global names.</Text>
                <View className="flex-row bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <Lightbulb size={16} color="#d97706" className="mr-2 mt-0.5" />
                  <Text className="text-xs text-slate-700 flex-1 leading-5"><Text className="font-bold">WHO Fact:</Text> {whoFacts[factIndex]}</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">Recommendation</Text>
                <Text className="font-bold text-slate-900 text-base mt-1">{recommendation.title}</Text>
                <Text className="text-sm text-slate-600 mt-1 mb-3">{recommendation.summary}</Text>
                
                {recommendation.brands.length > 0 ? (
                  recommendation.brands.map((brand) => (
                    <BrandCard key={brand.name} brand={brand} />
                  ))
                ) : (
                  <Text className="text-slate-600 text-sm italic">No exact match yet. Try another keyword.</Text>
                )}

                {topic && whoLinks[topic] && (
                  <TouchableOpacity onPress={() => Linking.openURL(whoLinks[topic])} className="mt-2 flex-row items-center justify-center py-2 bg-blue-50 rounded-xl border border-blue-100">
                    <Stethoscope size={14} color="#1d4ed8" />
                    <Text className="text-blue-700 font-bold text-xs ml-2">Read WHO guidance on {topic}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* SEARCH & FILTERS */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
          <Text className="text-xs uppercase font-bold text-textMuted tracking-wider mb-3">Search & Filter</Text>
          <View className="flex-row bg-primary dark:bg-gray-900 rounded-xl px-4 py-3 border border-[#e5e7eb] dark:border-gray-700 mb-4 items-center">
            <Search size={18} color="#94a3b8" />
            <TextInput 
              placeholder="Search brands..."
              className="flex-1 ml-3 text-textPrimary dark:text-white"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className={`mr-2 px-4 py-2 rounded-full border ${selectedCategory === cat ? 'bg-accent border-accent' : 'bg-primary dark:bg-gray-900 border-accentMid'}`}
              >
                <Text className={`text-xs font-semibold ${selectedCategory === cat ? 'text-white' : 'text-textSecondary dark:text-gray-300'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* BRAND LIST */}
        <View className="flex-row justify-between items-center mb-4 px-1">
          <Text className="font-bold text-textPrimary dark:text-white text-lg">All Brands <Text className="text-sm font-normal text-textMuted">({filteredBrands.length})</Text></Text>
          {(searchQuery || selectedCategory !== 'All') && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
              <Text className="text-accent text-xs font-semibold underline">Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredBrands.length > 0 ? (
          filteredBrands.map((brand) => (
            <BrandCard key={brand.id || brand.name} brand={{...brand, external: false}} />
          ))
        ) : (
          <View className="bg-white dark:bg-gray-800 rounded-2xl py-12 px-6 items-center border border-[#e5e7eb] dark:border-gray-700">
            <Search size={40} color="#cbd5e1" className="mb-3" />
            <Text className="font-bold text-textPrimary dark:text-white text-base">No brands found</Text>
            <Text className="text-textSecondary dark:text-gray-300 text-sm text-center mt-1">Try a different search term or category.</Text>
            <TouchableOpacity 
              className="mt-4 bg-accent px-6 py-2 rounded-full"
              onPress={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            >
              <Text className="text-white font-bold text-sm">Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
