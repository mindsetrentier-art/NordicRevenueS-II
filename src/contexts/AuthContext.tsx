import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { User, OperationType } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  googleAccessToken: string | null;
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
            const errStr = error instanceof Error ? error.message : (error && typeof (error as any).message === 'string' ? (error as any).message : String(error));
            if (errStr.toLowerCase().includes('offline')) {
              console.warn("User is offline, using fallback profile");
              setUserProfile({
                  uid: user.uid, 
                  role: 'manager', 
                  establishmentIds: [], 
                  displayName: user.displayName || '', 
                  email: user.email || '', 
                  createdAt: new Date()
              } as User);
              setLoading(false);
              return;
            }
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
                const errStr = error instanceof Error ? error.message : (error && typeof (error as any).message === 'string' ? (error as any).message : String(error));
                if (errStr.toLowerCase().includes('offline')) {
                  console.warn("User is offline, skipping email check");
                } else {
                  handleFirestoreError(error, OperationType.GET, `users/${user.email.toLowerCase()}`);
                  throw error;
                }
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
              const errStr = error instanceof Error ? error.message : (error && typeof (error as any).message === 'string' ? (error as any).message : String(error));
              if (errStr.toLowerCase().includes('offline')) {
                console.warn("User is offline, skipping user profile creation in firestore");
              } else {
                handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
                throw error;
              }
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
          const errStr = error instanceof Error ? error.message : (error && typeof (error as any).message === 'string' ? (error as any).message : String(error));
          try {
            // If it wasn't already handled and thrown as a FirestoreErrorInfo
            if (!errStr.includes('authInfo')) {
               handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            }
          } catch (handledError) {
            setAuthError(handledError as Error);
          }
          if (errStr.includes('authInfo')) {
             setAuthError(error instanceof Error ? error : new Error(errStr));
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

  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const logout = async () => {
    await auth.signOut();
    setGoogleAccessToken(null);
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (userProfile) {
      setUserProfile({ ...userProfile, ...updates });
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    googleAccessToken,
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
