import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kayıt ol
  async function register(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });

    // Firestore'da kullanıcı profili oluştur
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      name,
      email,
      role: 'volunteer',
      level: 'Sage Level',
      totalMinutesRead: 0,
      booksCompleted: 0,
      createdAt: new Date()
    });

    return result;
  }

  // Giriş yap
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Çıkış yap
  function logout() {
    return signOut(auth);
  }

  // Kullanıcı durumunu izle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, userProfile, register, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
