import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const syncPurchasePoints = async (userId: string, orderAmount: number) => {
  try {
    const earnedPoints = Math.floor(orderAmount * 0.01);
    const loyaltyRef = doc(db, 'loyaltyCustomers', userId);
    const loyaltyDoc = await getDoc(loyaltyRef);
    
    if (loyaltyDoc.exists()) {
      const data = loyaltyDoc.data();
      const newTotalSpent = (data.totalSpent || 0) + orderAmount;
      const newTotalPoints = (data.totalPoints || 0) + earnedPoints;
      let newLevel = 'Silver';
      if (newTotalPoints >= 1000) newLevel = 'Platinum';
      else if (newTotalPoints >= 500) newLevel = 'Gold';
      
      await updateDoc(loyaltyRef, {
        totalSpent: newTotalSpent,
        totalPoints: newTotalPoints,
        level: newLevel,
        purchaseCount: (data.purchaseCount || 0) + 1,
        lastPurchase: new Date(),
        updatedAt: new Date(),
      });
      
      await updateDoc(doc(db, 'users', userId), {
        loyaltyPoints: newTotalPoints,
        loyaltyTier: newLevel
      });
    }
  } catch (err) {
    console.error('Error syncing points in app:', err);
  }
};
