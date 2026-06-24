import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from "../services/firebase";

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  userRole: string | null;
  loading: boolean;
  register: (userData: any) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<any>;
  getCurrentUserData: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Register new customer user
  const register = async (userData: any) => {
    try {
      const { fullName, email, password, phone } = userData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Find the highest existing customerId
      const snapshot = await getDocs(collection(db, 'users'));
      let maxNum = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.customerId) {
          const num = parseInt(data.customerId.replace('C', ''));
          if (num > maxNum) maxNum = num;
        }
      });
      const customerId = `C${String(maxNum + 1).padStart(3, '0')}`;

      const savedUserData = {
        customerId,
        userId:    newUser.uid,
        fullName,
        email,
        phone:     phone || '',
        role:      'customer',
        status:    'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', newUser.uid), savedUserData);
      await AsyncStorage.setItem('userId',    newUser.uid);
      await AsyncStorage.setItem('userRole',  'customer');
      await AsyncStorage.setItem('userName',  fullName);
      await AsyncStorage.setItem('userEmail', email);
      setUserRole('customer');

      return {
        success: true,
        user: { uid: newUser.uid, email, role: 'customer', ...savedUserData },
      };

    } catch (error: any) {
      console.error('Registration error:', error);
      let message = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') message = 'Email already registered';
      else if (error.code === 'auth/weak-password')   message = 'Password too weak';
      else if (error.code === 'auth/invalid-email')   message = 'Invalid email address';
      throw new Error(message);
    }
  };

  // Login user (strictly customer for this app)
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));
      
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error('Customer profile not found. Please register or contact support.');
      }

      const userData = userDoc.data();
      const actualRole = userData.role;

      if (actualRole !== 'customer') {
        await signOut(auth);
        throw new Error('Only customers can log in to this app.');
      }

      await setDoc(doc(db, 'users', loggedInUser.uid), {
        ...userData,
        lastLogin: Timestamp.now()
      }, { merge: true });

      await AsyncStorage.setItem('userId', loggedInUser.uid);
      await AsyncStorage.setItem('userRole', actualRole);
      await AsyncStorage.setItem('userName', userData.fullName || userData.name);
      await AsyncStorage.setItem('userEmail', userData.email);

      setUserRole(actualRole);
      return { 
        success: true, 
        user: {
          uid: loggedInUser.uid,
          email: loggedInUser.email,
          role: actualRole,
          ...userData
        }
      };
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Login failed';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      } else if (error.message.includes('not found') || error.message.includes('customers')) {
        message = error.message;
      }
      throw new Error(message);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.clear();
      setUser(null);
      setCurrentUser(null);
      setUserRole(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  };

  // Get current user's full data
  const getCurrentUserData = async () => {
    if (!currentUser) return null;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    console.log("AuthContext useEffect running...");
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      console.log("onAuthStateChanged fired! User:", authenticatedUser?.uid);
      try {
        if (authenticatedUser) {
          setUser(authenticatedUser);
          setCurrentUser(authenticatedUser);
          
          const storedRole = await AsyncStorage.getItem('userRole');
          if (storedRole === 'customer') {
            setUserRole(storedRole);
            setLoading(false);
            return;
          }
          
          try {
            const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
            if (userDoc.exists() && userDoc.data().role === 'customer') {
              const userData = userDoc.data();
              setUserRole('customer');
              await AsyncStorage.setItem('userId', authenticatedUser.uid);
              await AsyncStorage.setItem('userRole', 'customer');
              await AsyncStorage.setItem('userName', userData.fullName);
              await AsyncStorage.setItem('userEmail', userData.email);
            } else {
               await signOut(auth);
               setUser(null);
               setCurrentUser(null);
               setUserRole(null);
            }
          } catch (error) {
            console.error('Error fetching user role:', error);
          }
        } else {
          setUser(null);
          setCurrentUser(null);
          setUserRole(null);
          AsyncStorage.clear().catch(err => console.error('Error clearing storage:', err));
        }
      } catch (err) {
        console.error("Error in onAuthStateChanged wrapper:", err);
      } finally {
        console.log("Setting loading to false...");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    currentUser,
    userRole,
    loading,
    register,
    login,
    logout,
    getCurrentUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
