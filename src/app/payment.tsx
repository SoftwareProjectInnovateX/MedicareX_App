import React, { useState } from 'react';
import { View, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { db } from '../services/firebase';
import { syncPurchasePoints } from '../utils/loyaltySync';
import { collection, addDoc, serverTimestamp, doc, writeBatch, increment, updateDoc } from 'firebase/firestore';
import { useCartStore } from '../stores/cartStore';
import { Feather } from '@expo/vector-icons';

export default function PaymentScreen() {
  const router = useRouter();
  const { config, orderData } = useLocalSearchParams();
  const { clearCart } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const { colorScheme } = useColorScheme();

  const isProcessed = React.useRef(false);

  if (!config || !orderData) {
    Alert.alert('Error', 'Missing payment configuration.');
    router.back();
    return null;
  }

  const payhereConfig = JSON.parse(config as string);
  const parsedOrderData = JSON.parse(orderData as string);

  // HTML to auto-submit the form to PayHere
  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background-color: ${colorScheme === 'dark' ? '#1e293b' : '#f1f5f9'}; }
          .loader { border: 4px solid ${colorScheme === 'dark' ? '#334155' : '#f3f3f3'}; border-radius: 50%; border-top: 4px solid #3498db; width: 40px; height: 40px; -webkit-animation: spin 1s linear infinite; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          h3 { color: ${colorScheme === 'dark' ? '#f1f5f9' : '#0f2a5e'}; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div style="text-align: center;">
          <div class="loader" style="margin: 0 auto;"></div>
          <h3>Redirecting to Secure Payment...</h3>
        </div>
        <form id="payhere-form" method="POST" action="https://sandbox.payhere.lk/pay/checkout">
          <input type="hidden" name="merchant_id" value="${payhereConfig.merchant_id}">
          <input type="hidden" name="return_url" value="${payhereConfig.return_url}">
          <input type="hidden" name="cancel_url" value="${payhereConfig.cancel_url}">
          <input type="hidden" name="notify_url" value="${payhereConfig.notify_url}">
          <input type="hidden" name="order_id" value="${payhereConfig.order_id}">
          <input type="hidden" name="items" value="${payhereConfig.items}">
          <input type="hidden" name="currency" value="${payhereConfig.currency}">
          <input type="hidden" name="amount" value="${payhereConfig.amount}">
          <input type="hidden" name="first_name" value="${payhereConfig.first_name}">
          <input type="hidden" name="last_name" value="${payhereConfig.last_name}">
          <input type="hidden" name="email" value="${payhereConfig.email}">
          <input type="hidden" name="phone" value="${payhereConfig.phone}">
          <input type="hidden" name="address" value="${payhereConfig.address}">
          <input type="hidden" name="city" value="${payhereConfig.city}">
          <input type="hidden" name="country" value="${payhereConfig.country}">
          <input type="hidden" name="hash" value="${payhereConfig.hash}">
        </form>
        <script>
          document.getElementById('payhere-form').submit();
        </script>
      </body>
    </html>
  `;

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    const { url } = navState;


    if (url.includes('sandbox.payhere.lk/medicarex/success')) {
      if (isProcessed.current) return;
      isProcessed.current = true;
      setPaymentProcessing(true);

      // Payment successful
      try {
        if (parsedOrderData.isRxOrder) {
          // Prescription Payment
          const rxRef = doc(db, 'prescriptions', parsedOrderData.rxId);
          await updateDoc(rxRef, {
            status: 'Paid',
            customerConfirmed: true,
            paymentMethod: 'ONLINE',
            paidAt: serverTimestamp(),
            confirmedAt: serverTimestamp(),
            customerAddress: parsedOrderData.address,
            customerName: parsedOrderData.customerName,
            customerPhone: parsedOrderData.phone
          });

          const dispensePayload = {
            rxId: parsedOrderData.rxId,
            patientName: parsedOrderData.customerName,
            verifiedPatient: parsedOrderData.customerName,
            phone: parsedOrderData.phone,
            address: parsedOrderData.address,
            orderItems: parsedOrderData.items,
            total: parsedOrderData.totalAmount,
            paymentStatus: 'Paid',
            paymentMethod: 'ONLINE',
            status: 'pending',
            createdAt: new Date().toISOString(),
            finalized: false
          };
          
          await addDoc(collection(db, 'pharmacistDispensed'), dispensePayload);
        } else {
          // Normal Cart Payment
          const batch = writeBatch(db);
          const orderRef = doc(collection(db, 'CustomerOrders'));
          batch.set(orderRef, {
            ...parsedOrderData,
            orderStatus: 'Paid',
            paymentStatus: 'success',
            createdAt: serverTimestamp(),
          });
          await batch.commit();
          clearCart();
        }

        router.replace({
          pathname: '/success' as any,
          params: {
            orderId: payhereConfig.order_id,
            orderData: orderData,
            isCOD: 'false'
          }
        });
      } catch (err) {
        console.error('Error saving paid order:', err);
        Alert.alert('Error', 'Payment was successful but we could not save your order. Please contact support.');
      }
    } else if (url.includes('sandbox.payhere.lk/medicarex/cancel')) {
      if (isProcessed.current) return;
      isProcessed.current = true;
      setPaymentProcessing(true);
      // Payment cancelled
      Alert.alert('Payment Cancelled', 'You cancelled the payment process.', [
        { text: 'Try Again', onPress: () => router.back() }
      ]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f1f5f9' }}>
      <View className="flex-row items-center p-4 bg-white dark:bg-gray-800 border-b border-[#e5e7eb] dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
          <Feather name="x" size={24} color={colorScheme === 'dark' ? '#f1f5f9' : '#0f2a5e'} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate- dark:text-gray-300">Secure Payment</Text>
      </View>
      <View style={{ flex: 1 }}>
        <WebView
          style={{ display: paymentProcessing ? 'none' : 'flex' }}
          source={{ html: htmlContent, baseUrl: 'http://localhost:3000' }}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          injectedJavaScript={colorScheme === 'dark' ? `
            setTimeout(function() {
              var style = document.createElement('style');
              style.innerHTML = 'body, html { background-color: #0f172a !important; } .container, .ph-container, .card, .main-container, .list-group-item { background-color: #0f172a !important; border-color: #1e293b !important; } input, select, textarea { background-color: #1e293b !important; color: #f8fafc !important; border: 1px solid #334155 !important; } label, p, span:not(.badge), h1, h2, h3, h4, h5, h6, div { color: #f8fafc !important; } .text-muted, .text-dark { color: #94a3b8 !important; } .bg-light { background-color: #1e293b !important; } .alert-warning { background-color: #422006 !important; color: #fde047 !important; border: none !important; }';
              document.head.appendChild(style);
            }, 100);
            true;
          ` : undefined}
          renderError={() => <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f1f5f9' }} />}
        />
        {(loading || paymentProcessing) && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f1f5f9', zIndex: 10 }}>
            <ActivityIndicator size="large" color="#1a87e1" />
            {paymentProcessing && (
              <Text className="mt-4 font-bold text-slate-800 dark:text-gray-300">Processing Payment...</Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
