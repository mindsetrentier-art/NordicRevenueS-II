import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { User, OperationType } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    if (authError) {
      throw authError;
    }
  }, [authError]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            throw error;
          }
          
          if (userSnap.exists()) {
            setUserProfile({ uid: userSnap.id, ...userSnap.data() } as User);
          } else {
            // Check if a pre-created document exists by email
            let role: 'admin' | 'manager' = 'manager';
            let establishmentIds: string[] = [];
            
            if (user.email) {
              const emailRef = doc(db, 'users', user.email.toLowerCase());
              let emailSnap;
              try {
                emailSnap = await getDoc(emailRef);
              } catch (error) {
                handleFirestoreError(error, OperationType.GET, `users/${user.email.toLowerCase()}`);
                throw error;
              }
              
              if (emailSnap.exists()) {
                const emailData = emailSnap.data();
                role = emailData.role || 'manager';
                establishmentIds = emailData.establishmentIds || [];
              }
            }

            // Create a new user profile
            const newUser: Omit<User, 'uid'> = {
              email: (user.email || '').toLowerCase(),
              displayName: user.displayName || '',
              role,
              establishmentIds,
              createdAt: new Date()
            };
            
            try {
              await setDoc(userRef, {
                ...newUser,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
              throw error;
            }
            
            // Delete the pre-created email document if it existed
            if (user.email) {
              const emailRef = doc(db, 'users', user.email.toLowerCase());
              let emailSnap;
              try {
                emailSnap = await getDoc(emailRef);
              } catch (error) {
                // Ignore get error here, we already got it
              }
              if (emailSnap && emailSnap.exists()) {
                try {
                  await deleteDoc(emailRef);
                } catch (error) {
                  handleFirestoreError(error, OperationType.DELETE, `users/${user.email.toLowerCase()}`);
                  throw error;
                }
              }
            }
            
            setUserProfile({ uid: user.uid, ...newUser } as User);
          }
        } catch (error) {
          try {
            // If it wasn't already handled and thrown as a FirestoreErrorInfo
            if (error instanceof Error && !error.message.includes('authInfo')) {
               handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            }
          } catch (handledError) {
            setAuthError(handledError as Error);
          }
          if (error instanceof Error && error.message.includes('authInfo')) {
             setAuthError(error);
          }
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const logout = () => auth.signOut();

  const updateUserProfile = (updates: Partial<User>) => {
    if (userProfile) {
      setUserProfile({ ...userProfile, ...updates });
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
