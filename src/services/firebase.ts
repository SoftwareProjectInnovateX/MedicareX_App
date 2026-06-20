import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase config from mediFront
const firebaseConfig = {
  apiKey: "AIzaSyC64IrEovMCJi6mNKMAb4WPNDKGeubsuVM",
  authDomain: "supplier-management-70b81.firebaseapp.com",
  projectId: "supplier-management-70b81",
  storageBucket: "supplier-management-70b81.firebasestorage.app",
  messagingSenderId: "109245280482",
  appId: "1:109245280482:web:d0c1df43c6628fd5f36ebb",
  measurementId: "G-NLMV8D63XD"
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
let firebaseAuth;
try {
  firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  firebaseAuth = getAuth(app);
}
export const auth = firebaseAuth;
