import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useLocationStore } from '../stores/locationStore';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function LocationSelectorScreen() {
  const router = useRouter();
  const { address: currentAddress, coordinates: currentCoords, setLocation } = useLocationStore();
  const mapRef = useRef<MapView>(null);
  
  const [addressInput, setAddressInput] = useState(currentAddress);
  const [selectedCoords, setSelectedCoords] = useState(currentCoords || {
    latitude: 6.9271, 
    longitude: 79.8612,
  });
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Reverse Geocoding: Get address string from dragged coordinates
  const fetchAddressFromCoordinates = async (latitude: number, longitude: number) => {
    if (!GOOGLE_API_KEY) return;
    
    setLoadingAddress(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address;
        setAddressInput(formattedAddress);
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedCoords({ latitude, longitude });
    fetchAddressFromCoordinates(latitude, longitude);
  };

  const handleSave = () => {
    if (!addressInput.trim()) {
      Alert.alert('Required', 'Please ensure a delivery address is set.');
      return;
    }
    setLocation(addressInput, selectedCoords);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-primary dark:bg-gray-900">
      <View className="flex-row items-center justify-between p-4 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm z-20">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Feather name="arrow-left" size={24} color="#0f2a5e" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-textPrimary dark:text-white">Select Location</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1 flex-col"
      >
        {/* Search Bar / Address Bar */}
        <View className="bg-white dark:bg-gray-800 z-20 shadow-sm rounded-b-3xl px-6 py-4" style={{ height: 160 }}>
          <Text className="text-sm font-bold text-textPrimary dark:text-white mb-2">Delivery Address</Text>
          
          <GooglePlacesAutocomplete
            placeholder={loadingAddress ? 'Fetching address...' : 'Search for a place...'}
            textInputProps={{
              value: addressInput,
              onChangeText: setAddressInput,
              placeholderTextColor: '#94A3B8',
            }}
            onPress={(data, details = null) => {
              if (details?.geometry?.location) {
                const { lat, lng } = details.geometry.location;
                const newCoords = { latitude: lat, longitude: lng };
                setSelectedCoords(newCoords);
                setAddressInput(data.description);
                
                // Animate map to new coords
                mapRef.current?.animateToRegion({
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }, 1000);
              }
            }}
            query={{
              key: GOOGLE_API_KEY,
              language: 'en',
              components: 'country:lk', // Restrict to Sri Lanka for better results
            }}
            fetchDetails={true}
            styles={{
              container: { flex: 1 },
              textInputContainer: {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                paddingHorizontal: 12,
              },
              textInput: {
                backgroundColor: 'transparent',
                height: 48,
                borderRadius: 0,
                paddingVertical: 5,
                paddingHorizontal: 0,
                fontSize: 15,
                flex: 1,
                color: '#0f172a',
              },
              predefinedPlacesDescription: {
                color: '#1faadb',
              },
            }}
            renderLeftButton={() => (
              <Feather name="search" color="#1a87e1" size={18} style={{ marginRight: 8 }} />
            )}
            renderRightButton={() => loadingAddress ? (
              <ActivityIndicator size="small" color="#1a87e1" style={{ marginRight: 8 }} />
            ) : <View />}
          />
        </View>

        {/* Map View */}
        <View className="flex-1 relative overflow-hidden -mt-6">
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: selectedCoords.latitude,
              longitude: selectedCoords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={selectedCoords}
              title="Delivery Location"
              description={addressInput}
              draggable
              onDragEnd={handleDragEnd}
            />
          </MapView>

          {/* Map Overlay Info */}
          {!GOOGLE_API_KEY && (
            <View className="absolute top-10 left-4 right-4 bg-orange-50 p-3 rounded-2xl shadow-sm border border-orange-200 items-center flex-row">
               <Feather name="alert-circle" size={16} color="#f97316" style={{ marginRight: 8 }} />
               <Text className="flex-1 text-xs text-orange-800 font-medium">
                 Google Maps API Key is missing in .env file. Smart search and auto-address won't work until it is added.
               </Text>
            </View>
          )}
        </View>

        {/* Bottom Button */}
        <View className="p-6 bg-white dark:bg-gray-800 border-t border-[#e5e7eb] dark:border-gray-700 z-10">
          <TouchableOpacity 
            className="w-full bg-accent py-4 rounded-xl items-center shadow-sm"
            onPress={handleSave}
          >
            <Text className="text-white font-bold text-lg">Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
