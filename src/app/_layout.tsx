import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

import '../global.css';

import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../context/AuthContext';

// Keep the splash screen visible while we fetch resources
// SplashScreen.preventAutoHideAsync();

import { useCartStore } from '../stores/cartStore';
import { useNotificationListener } from '../hooks/useNotifications';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartInitializer>
        <NotificationInitializer>
          <RootLayoutInner />
        </NotificationInitializer>
      </CartInitializer>
    </AuthProvider>
  );
}

function CartInitializer({ children }: { children: React.ReactNode }) {
  const fetchItems = useCartStore(state => state.fetchItems);
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      fetchItems();
    } else {
      useCartStore.setState({ items: [] });
    }
  }, [user, fetchItems]);

  return <>{children}</>;
}

function NotificationInitializer({ children }: { children: React.ReactNode }) {
  useNotificationListener();
  return <>{children}</>;
}

function RootLayoutInner() {
  const { loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);



  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
