import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';

export default function SuccessScreen() {
  const router = useRouter();
  const { orderId, orderData, isCOD } = useLocalSearchParams();
  const { colorScheme } = useColorScheme();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Parse order data
  let parsedData: any = {};
  try {
    parsedData = orderData ? JSON.parse(orderData as string) : {};
  } catch (e) {}

  const isCashOnDelivery = isCOD === 'true';

  const htmlContent = useMemo(() => {
    const displayAmount = parsedData.totalAmount || 0;
    const shippingCharge = 400;
    const subTotal = displayAmount > shippingCharge ? displayAmount - shippingCharge : displayAmount;
    
    const itemsHtml = parsedData.items && parsedData.items.length > 0
      ? parsedData.items.map((item: any) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${item.name || item.productName || 'Item'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${item.qty || 1}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e3a8a; font-weight: bold;">Rs. ${Number((item.price || item.total || 0) * (item.qty || 1)).toFixed(2)}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">Medicine Order Items</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">1</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e3a8a; font-weight: bold;">Rs. ${subTotal.toFixed(2)}</td>
          </tr>
        `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; background-color: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
          .logo { font-size: 20px; font-weight: bold; color: #1e3a8a; margin: 0; }
          .tagline { font-size: 8px; color: #64748b; margin-top: 4px; }
          .invoice-title { font-size: 16px; font-weight: bold; color: #0f172a; margin: 0; text-align: right; }
          .details-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .details-left { color: #64748b; font-size: 9px; line-height: 1.4; }
          .details-right { text-align: right; font-size: 9px; color: #64748b; }
          .details-right span { font-weight: bold; color: #1e3a8a; margin-left: 4px; font-size: 9px; }
          .divider { height: 1px; background-color: #1e3a8a; margin-bottom: 20px; }
          .bill-to-title { font-size: 9px; color: #64748b; margin-bottom: 4px; }
          .bill-to-name { font-size: 11px; font-weight: bold; color: #1e3a8a; margin-bottom: 4px; }
          .bill-to-address { font-size: 9px; color: #334155; line-height: 1.4; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9px; }
          th { background-color: #1e3a8a; color: white; text-align: left; padding: 8px; font-weight: bold; }
          th.center { text-align: center; }
          th.right { text-align: right; }
          .totals-container { width: 100%; display: flex; justify-content: flex-end; }
          .totals-table { width: 200px; }
          .totals-table td { padding: 6px; border-bottom: none; }
          .totals-table .label { color: #64748b; font-weight: bold; text-align: right; }
          .totals-table .value { color: #334155; font-weight: bold; text-align: right; }
          .totals-table .total-row { border-top: 1px solid #e2e8f0; }
          .totals-table .total-label { color: #0f172a; font-size: 11px; padding-top: 8px; }
          .totals-table .total-value { color: #1e3a8a; font-size: 12px; padding-top: 8px; }
          .footer { margin-top: 30px; text-align: center; font-size: 8px; color: #64748b; }
          .footer h4 { color: #1e3a8a; font-size: 11px; margin-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="logo">MediCareX</h1>
            <div class="tagline">Your Smart Pharmacy Solution<br/>Colombo, Sri Lanka</div>
          </div>
          <div>
            <h1 class="invoice-title">INVOICE</h1>
          </div>
        </div>

        <div class="details-grid">
          <div class="details-left">
            <div class="bill-to-title">BILL TO</div>
            <div class="bill-to-name">${parsedData.firstName || ''} ${parsedData.lastName || ''}</div>
            <div class="bill-to-address">
              ${parsedData.houseNumber ? parsedData.houseNumber + ', ' : ''}${parsedData.laneStreet || ''}<br/>
              ${parsedData.city || ''}<br/>
              Tel: ${parsedData.phone || 'N/A'}
            </div>
          </div>
          <div class="details-right">
            <div>Invoice No: <span>#${orderId || 'N/A'}</span></div><br/>
            <div>Date: <span>${new Date().toLocaleDateString('en-GB')}</span></div><br/>
            <div>Status: <span style="color: ${isCashOnDelivery ? '#ea580c' : '#16a34a'}">${isCashOnDelivery ? 'UNPAID' : 'PAID'}</span></div>
          </div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th class="center">QTY</th>
              <th class="right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals-container">
          <table class="totals-table">
            <tr>
              <td class="label">Subtotal</td>
              <td class="value">Rs. ${subTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="label">Shipping Charge</td>
              <td class="value">Rs. 400.00</td>
            </tr>
            <tr class="total-row">
              <td class="label total-label">Total Amount</td>
              <td class="value total-value">Rs. ${displayAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <h4>Thank You for Your Business!</h4>
        </div>
      </body>
      </html>
    `;
  }, [parsedData, isCashOnDelivery, orderId]);

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // By using printAsync, we trigger the system's native PDF generation and "Save As" flow directly!
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Could not generate PDF invoice.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f1f5f9] dark:bg-gray-900">
      {/* Custom Header to allow going back Home */}
      <View className="flex-row items-center p-4 bg-white dark:bg-gray-800 border-b border-[#e5e7eb] dark:border-gray-700">
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} className="mr-4 p-2">
          <Feather name="x" size={24} color={colorScheme === 'dark' ? '#f1f5f9' : '#0f2a5e'} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900 dark:text-white">Order Confirmed</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        
        <View className="items-center mb-6 mt-4">
          <Feather name="check-circle" size={60} color="#22c55e" className="mb-3" />
          <Text className="text-2xl font-black text-slate-900 dark:text-white mb-1">Success!</Text>
          <Text className="text-sm text-slate-500 dark:text-gray-300 text-center px-4 leading-relaxed">
            {isCashOnDelivery 
              ? "Your order has been placed successfully. Please pay at the time of delivery." 
              : "Your payment was processed successfully."}
          </Text>
        </View>

        {/* Invoice Preview */}
        <View className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden mb-6" style={{ height: 350 }}>
          <WebView 
            source={{ html: htmlContent }} 
            style={{ flex: 1 }}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Download Button */}
        <TouchableOpacity 
          onPress={downloadPDF}
          disabled={isGeneratingPDF}
          className="w-full bg-[#1a87e1] py-4 rounded-xl flex-row items-center justify-center shadow-sm mb-8"
        >
          {isGeneratingPDF ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Feather name="download" size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold uppercase tracking-wider text-sm">Download PDF Invoice</Text>
            </>
          )}
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}
