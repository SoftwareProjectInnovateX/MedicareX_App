import { Tabs, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useCartStore } from '../../stores/cartStore';

export default function TabsLayout() {
  const router = useRouter();
  const cartItems = useCartStore(state => state.items);
  const cartCount = cartItems.length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a87e1', // Accent Blue
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb', // gray-200
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <Feather name="search" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat-tab"
        options={{
          title: 'Chat',
          tabBarIcon: ({ size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color="#1a87e1" />,
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault(); // prevent default behavior
            router.push('/chat'); // route to full screen chat
          },
        })}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <Feather name="shopping-cart" color={color} size={size} />,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
