// assets/js/firebase-config.js
// 🔥 Firebase SDK v10 (Modular) - Production Ready
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, 
  deleteDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp,
  setDoc, arrayUnion, arrayRemove, increment 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ⚠️ GANTI DENGAN CONFIG ANDA DARI FIREBASE CONSOLE
const firebaseConfig = {
            apiKey: "AIzaSyDMrexlgTwauuqmZ2kZECwqqEYmwtj7Zrs",
            authDomain: "mfd-store.firebaseapp.com",
            projectId: "mfd-store",
            storageBucket: "mfd-store.firebasestorage.app",
            messagingSenderId: "1039564529069",            appId: "1:1039564529069:web:bc7c752f3618e6cb879524"
        };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// 🎯 Export semua untuk modular import
export { 
  app, auth, db, storage, googleProvider,
  // Auth functions
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile,
  // Firestore functions  
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove, increment,
  // Storage functions
  ref, uploadBytes, getDownloadURL
};

// 🛡️ Helper: Generate UAC (User Account Code)
export const generateUAC = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'UAC-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 🛡️ Helper: Generate Unique Order Code
export const generateOrderCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// 🛡️ Helper: Risk Score Calculator (Auto-enforcement)
export const calculateRiskScore = (userData) => {
  let score = 0;
  if (userData.demeritPoints) score += userData.demeritPoints;
  if (userData.cancellationRate > 0.1) score += 20;
  if (userData.failedDeliveries > 3) score += 15;
  if (userData.disputeCount > 2) score += 10;
  return Math.min(score, 100); // Cap at 100
};
