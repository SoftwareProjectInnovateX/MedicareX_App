import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { syncPurchasePoints } from '../utils/loyaltySync';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc, writeBatch, increment } from 'firebase/firestore';
import { DISTRICTS_CITIES } from '../constants/locations';
import * as Crypto from 'expo-crypto';

export default function RxCheckoutScreen() {
  const router = useRouter();
  const { rxId, amount, items: itemsStr } = useLocalSearchParams<{ rxId: string, amount: string, items: string }>();
  const items = React.useMemo(() => { try { return itemsStr ? JSON.parse(decodeURIComponent(itemsStr)) : []; } catch(e) { return []; } }, [itemsStr]);
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: (user as any)?.fullName?.split(' ')[0] || '',
    lastName: (user as any)?.fullName?.split(' ').slice(1).join(' ') || '',
    district: '',
    city: '',
    houseNumber: '',
    laneStreet: '',
    phone: (user as any)?.phone || '',

    secondaryPhone: '',
    orderNotes: '',
    paymentMethod: 'ONLINE', // or 'COD'
    agreeTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [availablePoints, setAvailablePoints] = useState(0);
  const [redeemedPoints, setRedeemedPoints] = useState('');
  const [pointsError, setPointsError] = useState('');
  
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [saveAddressToBook, setSaveAddressToBook] = useState(false);
  
  // For custom dropdowns
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  useEffect(() => {
    // If user is loaded and we have their uid, fetch additional profile data if any
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData(prev => ({
              ...prev,
              district: prev.district || data.district || '',
              city: prev.city || data.city || '',
              houseNumber: prev.houseNumber || data.houseNumber || '',
              laneStreet: prev.laneStreet || data.laneStreet || '',
              phone: prev.phone || data.phone || '',
            }));
            setAvailablePoints(data.loyaltyPoints || 0);
            
            if (data.savedAddresses && Array.isArray(data.savedAddresses)) {
              setSavedAddresses(data.savedAddresses);
            }
          }
        } catch (err) {
          console.log("Error fetching user data", err);
        }
      }
    };
    fetchUserData();
  }, [user]);

  const subtotal = Number(amount) || 0;
  const shippingCharge = 400;
  
  const parsedRedeemed = Number(redeemedPoints) || 0;
  const totalAmount = Math.max(0, subtotal + shippingCharge - parsedRedeemed);

  const handleRedeemedPointsChange = (text: string) => {
    const val = text.replace(/[^0-9]/g, '');
    setRedeemedPoints(val);
    const num = Number(val);
    if (num > availablePoints) {
      setPointsError(`You only have ${availablePoints} points available.`);
    } else if (num > subtotal + shippingCharge) {
      setPointsError(`Cannot redeem more than the total bill amount.`);
    } else {
      setPointsError('');
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.district) newErrors.district = "District is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.houseNumber) newErrors.houseNumber = "House Number is required";
    if (!formData.laneStreet) newErrors.laneStreet = "Lane/Street is required";
    
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^(?:0|\+94)\d{9}$/.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = "Must be a valid Sri Lankan number";
    }

    if (!formData.agreeTerms) newErrors.agreeTerms = "Please accept the terms and conditions";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Error', 'No items found in prescription.');
      return;
    }

    if (!rxId) {
      Alert.alert('Error', 'Invalid prescription order.');
      return;
    }

    if (pointsError) {
      Alert.alert('Error', 'Please fix the points redemption error.');
      return;
    }

    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields correctly.');
      return;
    }

    setLoading(true);

    try {
      if (!rxId) throw new Error("No Prescription ID found");

      const orderId = formData.paymentMethod === 'ONLINE' ? "MCX" + Date.now() : "COD_" + Date.now();
      
      const orderData = {
        orderId: orderId,
        rxId: rxId,
        isRxOrder: true,
        userId: user?.uid || 'guest',
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        customerName: formData.firstName + " " + formData.lastName,
        district: formData.district,
        city: formData.city,
        houseNumber: formData.houseNumber,
        laneStreet: formData.laneStreet,
        address: formData.houseNumber + ", " + formData.laneStreet + ", " + formData.city + ", " + formData.district,
        phone: formData.phone,
        secondaryPhone: formData.secondaryPhone,
        orderNotes: formData.orderNotes,
        orderStatus: formData.paymentMethod === 'ONLINE' ? 'Pending' : 'Ready to Collect',
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'pending',
        totalAmount: totalAmount,
        subtotal: subtotal,
        shippingCharge: shippingCharge,
        redeemedPoints: parsedRedeemed,
        totalnumber: items.length,
        items: items.map((item: any) => ({
          id: item.productId || item.id || '',
          productId: item.productId || item.id || '',
          stockId: item.stockId || '',
          name: item.name,
          price: item.price,
          quantity: item.qty,
          imageUrl: item.imageUrl || '',
          category: item.category || ''
        })),
        createdAt: serverTimestamp(),
      };

      if (user?.uid && saveAddressToBook) {
        try {
          const newAddress = {
            id: Date.now().toString(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            district: formData.district,
            city: formData.city,
            houseNumber: formData.houseNumber,
            laneStreet: formData.laneStreet,
          };
          
          setSavedAddresses(prev => [...prev, newAddress]);
          
          await setDoc(doc(db, 'users', user.uid), {
            savedAddresses: [...savedAddresses, newAddress]
          }, { merge: true });
        } catch (err) {
          console.error("Error saving address:", err);
        }
      }

      if (formData.paymentMethod === 'COD') {
        const batch = writeBatch(db);
        
        // 1. Update prescription doc
        const rxRef = doc(db, 'prescriptions', rxId as string);
        batch.update(rxRef, {
          status: 'Ready to Collect',
          customerConfirmed: true,
          paymentMethod: 'COD',
          confirmedAt: serverTimestamp(),
          customerAddress: orderData.address,
          customerName: orderData.customerName,
          customerPhone: orderData.phone
        });
        
        // 2. Create order doc
        const newOrderRef = doc(collection(db, 'CustomerOrders'));
        batch.set(newOrderRef, orderData);

        // 3. Update points
        if (parsedRedeemed > 0 && user?.uid) {
          const userRef = doc(db, 'users', user.uid);
          batch.update(userRef, { loyaltyPoints: increment(-parsedRedeemed) });
        }

        await batch.commit();

        const dispensePayload = {
          rxId: rxId,
          patientName: orderData.customerName,
          verifiedPatient: orderData.customerName,
          phone: orderData.phone,
          address: orderData.address,
          orderItems: items,
          total: totalAmount,
          paymentStatus: 'COD',
          paymentMethod: 'COD',
          status: 'pending',
          createdAt: new Date().toISOString(),
          finalized: false
        };
        
        await addDoc(collection(db, 'pharmacistDispensed'), dispensePayload);

        router.replace({
          pathname: '/success' as any,
          params: {
            orderId: orderId,
            orderData: JSON.stringify(orderData),
            isCOD: 'true'
          }
        });
      } else {
        // ONLINE PAYMENT - PayHere
        const merchantId = process.env.EXPO_PUBLIC_PAYHERE_MERCHANT_ID || "1236634";
        const merchantSecret = process.env.EXPO_PUBLIC_PAYHERE_SECRET || "NjAxODA2NjkyMzEzNzk4NTUwMTM4ODQ0MjM5NTM1MjUyNTY0NjA=";
        
        const hashedSecret = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.MD5,
          merchantSecret
        );
        const amountFormatted = totalAmount.toFixed(2);
        const currency = "LKR";
        
        const hashString = merchantId + orderId + amountFormatted + currency + hashedSecret.toUpperCase();
        
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.MD5,
          hashString
        );

        const payhereConfig = {
          merchant_id: merchantId,
          return_url: 'https://sandbox.payhere.lk/medicarex/success',
          cancel_url: 'https://sandbox.payhere.lk/medicarex/cancel',
          notify_url: 'https://sandbox.payhere.lk/medicarex/notify',
          order_id: orderId,
          items: "MediCareX Prescription",
          currency: currency,
          amount: amountFormatted,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.houseNumber + ", " + formData.laneStreet,
          city: formData.city,
          country: "Sri Lanka",
          hash: hash.toUpperCase(),
        };

        router.push({
          pathname: '/payment' as any,
          params: { 
            config: JSON.stringify(payhereConfig),
            orderData: JSON.stringify(orderData)
          }
        });
      }
    } catch (err: any) {
      console.error('Error placing order:', err);
      Alert.alert('Checkout Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderError = (field: string) => {
    return errors[field] ? <Text className="text-red-500 text-xs mt-1 font-bold">{errors[field]}</Text> : null;
  };

  const districts = Object.keys(DISTRICTS_CITIES).sort();
  const cities = formData.district ? DISTRICTS_CITIES[formData.district] || [] : [];

  return (
    <SafeAreaView className="flex-1 bg-[#f1f5f9] dark:bg-gray-900">
      <View className="flex-row items-center p-4 bg-white dark:bg-gray-800 border-b border-[#e5e7eb] dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
          <Feather name="arrow-left" size={24} color={colorScheme === 'dark' ? '#f1f5f9' : '#0f2a5e'} />
        </TouchableOpacity>
        <View>
          <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Secure Payment</Text>
          <Text className="text-xl font-black text-slate-800 dark:text-gray-300">Checkout</Text>
        </View>
      </View>
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 60 }}>
          
          {/* Saved Addresses Section */}
          {savedAddresses.length > 0 && (
            <View className="mb-6">
              <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Address Book</Text>
              <Text className="font-black text-slate-800 dark:text-gray-300 text-xl mb-4">Saved Addresses</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible pb-2 -mx-4 px-4">
                {savedAddresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-[#e5e7eb] dark:border-gray-700 shadow-sm mr-4 w-64"
                    onPress={() => {
                      setFormData(prev => ({
                        ...prev,
                        firstName: addr.firstName || prev.firstName,
                        lastName: addr.lastName || prev.lastName,
                        phone: addr.phone || prev.phone,
                        district: addr.district || prev.district,
                        city: addr.city || prev.city,
                        houseNumber: addr.houseNumber || prev.houseNumber,
                        laneStreet: addr.laneStreet || prev.laneStreet,
                      }));
                      setSaveAddressToBook(false); // No need to save if picking an existing one
                    }}
                  >
                    <View className="flex-row items-center mb-2">
                      <Feather name="map-pin" size={16} color={colorScheme === 'dark' ? '#f1f5f9' : '#1E293B'} />
                      <Text className="font-bold text-slate-800 dark:text-gray-300 ml-2" numberOfLines={1}>
                        {addr.firstName} {addr.lastName}
                      </Text>
                    </View>
                    <Text className="text-slate-800 dark:text-gray-300 text-xs mb-1" numberOfLines={2}>
                      {addr.houseNumber}, {addr.laneStreet}, {addr.city}
                    </Text>
                    <Text className="text-slate-800 dark:text-gray-300 text-xs">{addr.phone}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Billing Details */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
            <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Information</Text>
            <Text className="font-black text-slate-800 dark:text-gray-300 text-xl mb-6">Billing Details</Text>
            
            <View className="mb-4">
              <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">Email address *</Text>
              <TextInput 
                placeholder="Enter your email" 
                className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-blue-200/60'} text-slate-800 dark:text-gray-300 font-medium`}
                value={formData.email}
                onChangeText={(val) => handleInputChange('email', val)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {renderError('email')}
            </View>

            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">First Name *</Text>
                <TextInput 
                  className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border ${errors.firstName ? 'border-red-500' : 'border-blue-200/60'} text-slate-800 dark:text-gray-300 font-medium`}
                  value={formData.firstName}
                  onChangeText={(val) => handleInputChange('firstName', val)}
                />
                {renderError('firstName')}
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">Last Name *</Text>
                <TextInput 
                  className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border ${errors.lastName ? 'border-red-500' : 'border-blue-200/60'} text-slate-800 dark:text-gray-300 font-medium`}
                  value={formData.lastName}
                  onChangeText={(val) => handleInputChange('lastName', val)}
                />
                {renderError('lastName')}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">District *</Text>
              <TouchableOpacity 
                className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border ${errors.district ? 'border-red-500' : 'border-blue-200/60'} flex-row justify-between items-center`}
                onPress={() => setDistrictModalVisible(true)}
              >
                <Text className={`font-medium ${formData.district ? 'text-slate-800 dark:text-gray-300' : 'text-slate-400'}`}>
                  {formData.district || 'Select District'}
                </Text>
                <Feather name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
              {renderError('district')}
            </View>

            <View className="mb-4">
              <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">Main City *</Text>
              <TouchableOpacity 
                className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border ${errors.city ? 'border-red-500' : 'border-blue-200/60'} flex-row justify-between items-center ${!formData.district ? 'opacity-50' : ''}`}
                onPress={() => formData.district && setCityModalVisible(true)}
                disabled={!formData.district}
              >
                <Text className={`font-medium ${formData.city ? 'text-slate-800 dark:text-gray-300' : 'text-slate-400'}`}>
                  {formData.city || 'Select City'}
                </Text>
                <Feather name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
              {renderError('city')}
            </View>

            <View className="mb-4">
              <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">Street Address *</Text>
              <TextInput 
                placeholder="House Number / Name" 
                className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border ${errors.houseNumber ? 'border-red-500' : 'border-blue-200/60'} text-slate-800 dark:text-gray-300 font-medium mb-3`}
                value={formData.houseNumber}
                onChangeText={(val) => handleInputChange('houseNumber', val)}
              />
              {renderError('houseNumber')}
              <TextInput 
                placeholder="Lane / Street" 
                className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border ${errors.laneStreet ? 'border-red-500' : 'border-blue-200/60'} text-slate-800 dark:text-gray-300 font-medium`}
                value={formData.laneStreet}
                onChangeText={(val) => handleInputChange('laneStreet', val)}
              />
              {renderError('laneStreet')}
            </View>

            <View className="mb-4">
              <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">Primary Phone *</Text>
              <TextInput 
                placeholder="07xxxxxx" 
                className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-blue-200/60'} text-slate-800 dark:text-gray-300 font-medium`}
                value={formData.phone}
                onChangeText={(val) => handleInputChange('phone', val)}
                keyboardType="phone-pad"
              />
              {renderError('phone')}
            </View>

            <View className="mb-4">
              <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">Secondary Phone (Optional)</Text>
              <TextInput 
                placeholder="Alternative contact" 
                className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border border-blue-200/60 text-slate-800 dark:text-gray-300 font-medium`}
                value={formData.secondaryPhone}
                onChangeText={(val) => handleInputChange('secondaryPhone', val)}
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-2">
              <Text className="text-[12px] font-bold mb-2 text-slate-800 dark:text-gray-300 uppercase tracking-wider">Order Notes (Optional)</Text>
              <TextInput 
                placeholder="Special notes for delivery..." 
                className={`bg-slate-50 dark:bg-gray-800 px-4 py-3 rounded-xl border border-blue-200/60 text-slate-800 dark:text-gray-300 font-medium h-24`}
                value={formData.orderNotes}
                onChangeText={(val) => handleInputChange('orderNotes', val)}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Save Address Toggle */}
            {user?.uid && (
              <TouchableOpacity 
                className={`flex-row items-center mt-2 p-4 rounded-xl border ${saveAddressToBook ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200' : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700'}`}
                onPress={() => setSaveAddressToBook(!saveAddressToBook)}
              >
                <View className={`w-5 h-5 rounded border items-center justify-center mr-3 ${saveAddressToBook ? 'bg-accent border-accent' : 'border-slate-300 bg-white dark:bg-gray-800'}`}>
                  {saveAddressToBook && <Feather name="check" size={14} color="#ffffff" />}
                </View>
                <Text className="flex-1 text-slate-800 dark:text-gray-300 font-medium">Save this address to my Address Book</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Order Summary */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-[#e5e7eb] dark:border-gray-700 mb-6">
            <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Summary</Text>
            <Text className="font-black text-slate-800 dark:text-gray-300 text-xl mb-6">Your order</Text>
            
            <View className="space-y-4 mb-4">
              {items.map((item: any, index: number) => (
                <View key={item.id || index} className="flex-row justify-between items-start">
                  <View className="flex-row flex-1">
                    <View className="w-12 h-12 bg-slate-100 dark:bg-gray-800 rounded-xl mr-3 items-center justify-center border border-slate-200 dark:border-gray-700">
                      <Text className="text-slate-400 font-bold">{item.name.charAt(0)}</Text>
                    </View>
                    <View className="flex-1 justify-center pr-2">
                      <Text className="text-blue-900 dark:text-blue-400 font-bold text-sm leading-tight">{item.name}</Text>
                      <View className="flex-row items-center mt-1">
                        <View className="bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded mr-2">
                          <Text className="text-[10px] font-bold text-slate-800 dark:text-gray-300">QTY: {item.qty}</Text>
                        </View>
                        <Text className="text-[10px] font-medium text-slate-400">× Rs. {item.price.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                  <Text className="font-black text-blue-900 dark:text-blue-400">
                    Rs. {(item.price * item.qty).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View className="border-t border-slate-200 dark:border-gray-700 py-4 flex-row justify-between">
              <Text className="text-slate-800 dark:text-gray-300 font-medium">Subtotal</Text>
              <Text className="font-bold text-slate-800 dark:text-gray-300">Rs. {subtotal.toFixed(2)}</Text>
            </View>

            <View className="border-t border-slate-200 dark:border-gray-700 py-4 flex-row justify-between items-center">
              <View>
                <Text className="text-emerald-600 font-medium flex-row items-center">
                  Shipping Charge <Text className="text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold ml-1 uppercase">Flat Rate</Text>
                </Text>
                {formData.city ? <Text className="text-xs text-emerald-600/70 mt-1 font-medium">To {formData.city}</Text> : null}
              </View>
              <Text className="font-bold text-emerald-600">Rs. {shippingCharge.toFixed(2)}</Text>
            </View>

            <View className="border-t border-slate-200 dark:border-gray-700 py-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-slate-800 dark:text-gray-300 font-medium flex-row items-center">
                  <Feather name="award" size={16} color="#1a87e1" /> <Text className="ml-1">Use Loyalty Points</Text>
                </Text>
                <Text className="text-xs font-bold text-blue-600">Available: {availablePoints}</Text>
              </View>
              <TextInput
                className={`bg-slate-50 dark:bg-gray-800 p-3 rounded-xl border ${pointsError ? 'border-red-500' : 'border-slate-200 dark:border-gray-700'} text-slate-800 dark:text-white`}
                placeholder="Enter points to redeem"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={redeemedPoints}
                onChangeText={handleRedeemedPointsChange}
              />
              {pointsError ? (
                <Text className="text-red-500 text-xs mt-1 font-bold">{pointsError}</Text>
              ) : null}
              {parsedRedeemed > 0 && !pointsError ? (
                <Text className="text-emerald-600 text-xs mt-1 font-bold">- Rs. {parsedRedeemed.toFixed(2)} will be deducted</Text>
              ) : null}
            </View>

            <View className="border-t border-slate-200 dark:border-gray-700 py-4">
              <Text className="mb-4 text-blue-900 dark:text-blue-400 font-bold uppercase text-[10px] tracking-widest">Select Payment Method</Text>
              
              <TouchableOpacity 
                className={`flex-row items-center p-4 rounded-xl border-2 mb-3 ${formData.paymentMethod === 'ONLINE' ? 'border-blue-600 bg-blue-50' : 'border-slate-50 dark:border-gray-700'}`}
                onPress={() => handleInputChange('paymentMethod', 'ONLINE')}
              >
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-4 ${formData.paymentMethod === 'ONLINE' ? 'border-blue-600' : 'border-slate-300'}`}>
                  {formData.paymentMethod === 'ONLINE' && <View className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                </View>
                <View>
                  <Text className="font-bold text-blue-900 dark:text-blue-400">Online Payment</Text>
                  <Text className="text-[10px] text-slate-800 dark:text-gray-300 uppercase">Visa / Master / Koko / Mintpay</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                className={`flex-row items-center p-4 rounded-xl border-2 ${formData.paymentMethod === 'COD' ? 'border-blue-600 bg-blue-50' : 'border-slate-50 dark:border-gray-700'}`}
                onPress={() => handleInputChange('paymentMethod', 'COD')}
              >
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-4 ${formData.paymentMethod === 'COD' ? 'border-blue-600' : 'border-slate-300'}`}>
                  {formData.paymentMethod === 'COD' && <View className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                </View>
                <View>
                  <Text className="font-bold text-blue-900 dark:text-blue-400">Cash on Delivery</Text>
                  <Text className="text-[10px] text-slate-800 dark:text-gray-300 uppercase">Pay when you receive the order</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View className="border-t border-slate-200 dark:border-gray-700 py-6 flex-row justify-between items-center">
              <Text className="text-2xl font-black text-blue-900 dark:text-blue-400">Total</Text>
              <View className="items-end">
                <Text className="text-xl font-black text-blue-900 dark:text-blue-400">Rs. {totalAmount.toFixed(2)}</Text>
                {parsedRedeemed > 0 ? (
                  <Text className="text-[10px] text-emerald-600 font-bold">Includes Points Discount</Text>
                ) : null}
              </View>
            </View>

            <View className="border-t border-slate-200 dark:border-gray-700 py-4">
              <TouchableOpacity 
                className="flex-row items-center"
                onPress={() => handleInputChange('agreeTerms', !formData.agreeTerms)}
              >
                <View className={`w-5 h-5 rounded mr-3 items-center justify-center border ${errors.agreeTerms ? 'border-red-500' : formData.agreeTerms ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                  {formData.agreeTerms && <Feather name="check" size={14} color="white" />}
                </View>
                <Text className="text-xs text-slate-800 dark:text-gray-300 flex-1">
                  I have read and agree to the website 
                  <Text onPress={() => setTermsModalVisible(true)} className="text-blue-600 font-bold ml-1"> terms and conditions *</Text>
                </Text>
              </TouchableOpacity>
              {renderError('agreeTerms')}
            </View>

            <TouchableOpacity 
              className={`w-full py-4 rounded-xl items-center justify-center flex-row mt-4 ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={handlePlaceOrder}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-bold text-white uppercase tracking-wider text-xs">Place order</Text>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* District Modal */}
      <Modal visible={districtModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl h-2/3">
            <View className="p-4 border-b border-slate-200 dark:border-gray-700 flex-row justify-between items-center">
              <Text className="font-black text-lg text-slate-800 dark:text-gray-300">Select District</Text>
              <TouchableOpacity onPress={() => setDistrictModalVisible(false)} className="p-2">
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList 
              data={districts}
              keyExtractor={(item) => item}
              renderItem={({item}) => (
                <TouchableOpacity 
                  className="p-4 border-b border-slate-50 dark:border-gray-700"
                  onPress={() => {
                    handleInputChange('district', item);
                    handleInputChange('city', ''); // Reset city
                    setDistrictModalVisible(false);
                  }}
                >
                  <Text className={`font-medium ${formData.district === item ? 'text-blue-600' : 'text-slate-800 dark:text-gray-300'}`}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* City Modal */}
      <Modal visible={cityModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl h-2/3">
            <View className="p-4 border-b border-slate-200 dark:border-gray-700 flex-row justify-between items-center">
              <Text className="font-black text-lg text-slate-800 dark:text-gray-300">Select City</Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)} className="p-2">
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList 
              data={cities}
              keyExtractor={(item) => item}
              renderItem={({item}) => (
                <TouchableOpacity 
                  className="p-4 border-b border-slate-50 dark:border-gray-700"
                  onPress={() => {
                    handleInputChange('city', item);
                    setCityModalVisible(false);
                  }}
                >
                  <Text className={`font-medium ${formData.city === item ? 'text-blue-600' : 'text-slate-800 dark:text-gray-300'}`}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal visible={termsModalVisible} animationType="fade" transparent={true}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white dark:bg-gray-800 rounded-3xl w-full max-h-[80%] overflow-hidden">
            <View className="p-6 border-b border-slate-200 dark:border-gray-700 flex-row justify-between items-center">
              <Text className="font-black text-xl text-slate-800 dark:text-gray-300">Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)} className="p-2 bg-slate-100 dark:bg-gray-800 rounded-full">
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-6">
              <Text className="font-bold text-blue-900 dark:text-blue-400 mb-2">Order Confirmation</Text>
              <Text className="text-slate-800 dark:text-gray-300 text-sm mb-6">By placing an order, you agree that all information provided is accurate. Prescription orders will only be processed after verification by our qualified pharmacists.</Text>
              
              <Text className="font-bold text-blue-900 dark:text-blue-400 mb-2">Return & Refund Policy</Text>
              <Text className="text-slate-800 dark:text-gray-300 text-sm mb-6">Due to health and safety regulations, medicinal products cannot be returned once delivered unless they are damaged or incorrect. Shipping charges (Rs. 400) are non-refundable.</Text>
            </ScrollView>
            <View className="p-6 border-t border-slate-200 dark:border-gray-700">
              <TouchableOpacity 
                className="w-full py-4 bg-blue-600 rounded-xl items-center"
                onPress={() => {
                  handleInputChange('agreeTerms', true);
                  setTermsModalVisible(false);
                }}
              >
                <Text className="font-bold text-white uppercase text-xs tracking-wider">I Agree</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

