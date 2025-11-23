import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthChange, convertFirebaseUser } from '../lib/firebase/auth';
import { getUser } from '../lib/firebase/firestore';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        // Try to get user data from Firestore first
        const userData = await getUser(firebaseUser.uid);
        
        if (userData) {
          setUser(userData);
        } else {
          // If user doesn't exist in Firestore, create from Firebase auth
          const convertedUser = await convertFirebaseUser(firebaseUser);
          setUser(convertedUser);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, firebaseUser, loading };
};

