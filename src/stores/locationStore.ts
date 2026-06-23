import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LocationState {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  setLocation: (address: string, coordinates?: { latitude: number; longitude: number }) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      address: 'Colombo, Sri Lanka', // Default address
      coordinates: null,
      setLocation: (address, coordinates) => set({ address, coordinates: coordinates || null }),
    }),
    {
      name: 'location-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
