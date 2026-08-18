import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  sendPasswordResetEmail
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
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  userRole: string | null;
  loading: boolean;
  register: (userData: any) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  loginWithGoogleCredential: (idToken: string) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
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
      console.log('Register step 1: starting');
      const { fullName, email, password, phone } = userData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Register step 2: user created', userCredential.user.uid);
      const newUser = userCredential.user;

      console.log('Register step 3: fetching users collection');
      // Find the highest existing customerId
      const snapshot = await getDocs(collection(db, 'users'));
      console.log('Register step 4: got snapshot');
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
        loyaltyPoints: 10,
        loyaltyTier: 'Silver',
      };

      console.log('Register step 5: setting user doc');
      await setDoc(doc(db, 'users', newUser.uid), savedUserData);
      console.log('Register step 5.1: setting loyaltyCustomers doc');
      await setDoc(doc(db, 'loyaltyCustomers', newUser.uid), {
        uid: newUser.uid,
        name: fullName,
        email: email,
        phone: phone || '',
        totalSpent: 0,
        totalPoints: 10,
        level: 'Silver',
        joinDate: Timestamp.now(),
        lastPurchase: Timestamp.now(),
        purchaseCount: 0,
        averageOrderValue: 0,
        refillConsistency: 0,
        engagementScore: 50,
        predictedChurnRisk: 20,
        recommendedOffers: [],
        updatedAt: Timestamp.now(),
      });
      console.log('Register step 6: setting async storage');
      await AsyncStorage.setItem('userId',    newUser.uid);
      await AsyncStorage.setItem('userRole',  'customer');
      await AsyncStorage.setItem('userName',  fullName);
      await AsyncStorage.setItem('userEmail', email);
      setUserRole('customer');

      console.log('Register step 7: success');
      return {
        success: true,
        user: { uid: newUser.uid, ...savedUserData },
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
      console.log('Login step 1: starting');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login step 2: signed in', userCredential.user.uid);
      const loggedInUser = userCredential.user;

      console.log('Login step 3: fetching user doc');
      const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));
      console.log('Login step 4: got user doc');
      
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

      console.log('Login step 5: updating last login');
      
      // Retroactive loyalty points for existing users
      let updatedData = { ...userData, lastLogin: Timestamp.now() };
      if (userData.loyaltyPoints === undefined) {
        updatedData.loyaltyPoints = 10;
        updatedData.loyaltyTier = 'Silver';
      }

      await setDoc(doc(db, 'users', loggedInUser.uid), updatedData, { merge: true });

      console.log('Login step 6: setting async storage');
      await AsyncStorage.setItem('userId', loggedInUser.uid);
      await AsyncStorage.setItem('userRole', actualRole);
      await AsyncStorage.setItem('userName', userData.fullName || userData.name);
      await AsyncStorage.setItem('userEmail', userData.email);

      setUserRole(actualRole);
      console.log('Login step 7: success');
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

  // Google Login (Web)
  const loginWithGoogle = async () => {
    try {

      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return handleGoogleUser(userCredential.user);
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Google login failed');
    }
  };

  // Google Login (Mobile/Credential)
  const loginWithGoogleCredential = async (idToken: string) => {
    try {

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      return handleGoogleUser(userCredential.user);
    } catch (error: any) {
      console.error('Google credential login error:', error);
      throw new Error(error.message || 'Google login failed');
    }
  };

  // Helper for Google user DB logic
  const handleGoogleUser = async (loggedInUser: User) => {
    const userDocRef = doc(db, 'users', loggedInUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    let actualRole = 'customer';
    let userData: any = {
      fullName: loggedInUser.displayName || '',
      email: loggedInUser.email,
      phone: loggedInUser.phoneNumber || '',
      role: 'customer',
      status: 'active',
      loyaltyPoints: 10,
      loyaltyTier: 'Silver',
    };

    if (!userDoc.exists()) {
      // Find highest customerId
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
      
      userData.customerId = customerId;
      userData.createdAt = Timestamp.now();
      userData.updatedAt = Timestamp.now();
      userData.lastLogin = Timestamp.now();
      
      await setDoc(userDocRef, userData);
    } else {
      const existingData = userDoc.data();
      actualRole = existingData.role;
      if (actualRole !== 'customer') {
        await signOut(auth);
        throw new Error('Only customers can log in to this app.');
      }
      userData = { ...existingData, lastLogin: Timestamp.now() };
      if (existingData.loyaltyPoints === undefined) {
        userData.loyaltyPoints = 10;
        userData.loyaltyTier = 'Silver';
      }
      await setDoc(userDocRef, userData, { merge: true });
    }

    await AsyncStorage.setItem('userId', loggedInUser.uid);
    await AsyncStorage.setItem('userRole', actualRole);
    await AsyncStorage.setItem('userName', userData.fullName || userData.name || '');
    await AsyncStorage.setItem('userEmail', userData.email || '');

    setUserRole(actualRole);
    return { 
      success: true, 
      user: { uid: loggedInUser.uid, ...userData }
    };
  };

  // Password Reset
  const resetPassword = async (email: string) => {
    try {

      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      console.error('Reset password error:', error);
      let message = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') message = 'No user found with this email';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      throw new Error(message);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userEmail');
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
            
            // Background check for loyalty points
            try {
              const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.loyaltyPoints === undefined) {
                  await setDoc(doc(db, 'users', authenticatedUser.uid), {
                    loyaltyPoints: 10,
                    loyaltyTier: 'Silver'
                  }, { merge: true });
                }
              }
            } catch (err) {
              console.log('Background loyalty check failed:', err);
            }
            return;
          }
          
          try {
            const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
            if (userDoc.exists()) {
              if (userDoc.data().role === 'customer') {
                let userData = userDoc.data();
                setUserRole('customer');
                
                // Check loyalty points
                if (userData.loyaltyPoints === undefined) {
                  userData.loyaltyPoints = 10;
                  userData.loyaltyTier = 'Silver';
                  await setDoc(doc(db, 'users', authenticatedUser.uid), {
                    loyaltyPoints: 10,
                    loyaltyTier: 'Silver'
                  }, { merge: true });
                }

                await AsyncStorage.setItem('userId', authenticatedUser.uid);
                await AsyncStorage.setItem('userRole', 'customer');
                await AsyncStorage.setItem('userName', userData.fullName || '');
                await AsyncStorage.setItem('userEmail', userData.email || '');
              } else {
                 await signOut(auth);
                 setUser(null);
                 setCurrentUser(null);
                 setUserRole(null);
              }
            } else {
              // It's a new user being registered. We don't sign out.
              // The register() function will handle creating the document.
              console.log("User doc doesn't exist yet, likely a new registration.");
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
    loginWithGoogle,
    loginWithGoogleCredential,
    resetPassword,
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
