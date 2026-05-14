import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  sendEmailVerification,
  setPersistence,
  signOut,
  onAuthStateChanged,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();
const ALLOWED_EMAIL_DOMAINS = ['gtu.edu.tr', 'ogr.gtu.edu.tr'];
const ADMIN_EMAIL_ALLOWLIST = ['ybatuhan4175@gmail.com'];

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function isAllowedGtuEmail(email = '') {
  const domain = normalizeEmail(email).split('@')[1] || '';
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

function isAllowedLoginEmail(email = '') {
  const normalizedEmail = normalizeEmail(email);
  return isAllowedGtuEmail(normalizedEmail) || ADMIN_EMAIL_ALLOWLIST.includes(normalizedEmail);
}

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
    const normalizedEmail = normalizeEmail(email);
    if (!isAllowedGtuEmail(normalizedEmail)) {
      throw new Error('Gönüllü kaydı için GTÜ e-posta adresi kullanmalısınız.');
    }

    const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    await updateAuthProfile(result.user, { displayName: name });
    await sendEmailVerification(result.user);

    // Firestore'da kullanıcı profili oluştur
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      name,
      email: normalizedEmail,
      role: 'volunteer',
      level: 'Sage Level',
      totalMinutesRead: 0,
      booksCompleted: 0,
      createdAt: new Date()
    });

    return result;
  }

  async function updateUserProfile(updates) {
    if (!currentUser) throw new Error('Oturum bulunamadı.');

    const nextProfile = {
      ...userProfile,
      ...updates,
      updatedAt: serverTimestamp(),
    };

    if (updates.name && updates.name !== currentUser.displayName) {
      await updateAuthProfile(currentUser, { displayName: updates.name });
    }

    await setDoc(doc(db, 'users', currentUser.uid), nextProfile, { merge: true });
    setUserProfile({ ...nextProfile, updatedAt: new Date() });
  }

  // Giriş yap
  async function login(email, password) {
    const normalizedEmail = normalizeEmail(email);
    if (!isAllowedLoginEmail(normalizedEmail)) {
      throw new Error('Sadece GTÜ e-posta adresiyle giriş yapılabilir.');
    }

    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    if (!result.user.emailVerified && !ADMIN_EMAIL_ALLOWLIST.includes(normalizedEmail)) {
      await signOut(auth);
      throw new Error('Lütfen e-posta adresinize gelen doğrulama bağlantısını onaylayın.');
    }

    return result;
  }

  // Çıkış yap
  function logout() {
    return signOut(auth);
  }

  // Kullanıcı durumunu izle
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
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

  const value = { currentUser, userProfile, register, login, logout, updateUserProfile, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
