// assets/js/auth.js
import { 
  auth, db, googleProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile,
  doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp 
} from './firebase-config.js';
import { generateUAC, calculateRiskScore } from './firebase-config.js';

// 🎯 Login dengan Email/Password
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch user role & redirect
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
    
    let role = 'customer';
    let profile = {};
    
    if (vendorDoc.exists()) {
      role = 'vendor';
      profile = vendorDoc.data();
    } else if (userDoc.exists()) {
      role = userDoc.data().role || 'customer';
      profile = userDoc.data();
    }
    
    return { success: true, user, role, profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🎯 Register Customer
export const registerCustomer = async (userData) => {
  try {
    const { email, password, username, phone } = userData;
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Generate UAC & create user document
    const uacId = generateUAC();
    await setDoc(doc(db, "users", user.uid), {
      uacId,
      username,
      email,      phone: phone || '',
      role: 'customer',
      status: 'Active',
      demeritPoints: 0,
      riskScore: 0,
      shippingAddresses: [],
      totalOrders: 0,
      totalSpent: 0,
      deviceIds: [],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      logCache: []
    });
    
    await updateProfile(user, { displayName: username });
    
    return { success: true, uacId, uid: user.uid };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🎯 Register Vendor
export const registerVendor = async (vendorData) => {
  try {
    const { email, password, businessName, phone } = vendorData;
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const uacId = generateUAC().replace('UAC', 'VEN');
    
    await setDoc(doc(db, "vendors", user.uid), {
      uacId,
      businessName,
      email,
      phone,
      status: 'Pending', // Require admin approval
      demeritPoints: 0,
      cancellationRate: 0,
      withdrawAllowed: false,
      paymentConfig: {
        paymentLink: '',
        qrUrl: '',
        bankName: '',
        accountNo: '',
        accountName: ''
      },
      totalSales: 0,
      totalOrders: 0,      productCount: 0,
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      logCache: []
    });
    
    await updateProfile(user, { displayName: businessName });
    
    return { success: true, uacId, uid: user.uid, status: 'Pending' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🎯 Google Sign In (Universal)
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user exists in either collection
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
    
    if (vendorDoc.exists()) {
      return { success: true, user, role: 'vendor', profile: vendorDoc.data(), isNew: false };
    } else if (userDoc.exists()) {
      return { success: true, user, role: 'customer', profile: userDoc.data(), isNew: false };
    } else {
      // New user - create customer profile by default
      const uacId = generateUAC();
      await setDoc(doc(db, "users", user.uid), {
        uacId,
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        phone: user.phoneNumber || '',
        role: 'customer',
        status: 'Active',
        demeritPoints: 0,
        riskScore: 0,
        shippingAddresses: [],
        totalOrders: 0,
        totalSpent: 0,
        deviceIds: [],
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        logCache: [],
        isGoogleAccount: true
      });
      return { success: true, user, role: 'customer', isNew: true };    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🎯 Logout + Cleanup
export const logoutUser = async () => {
  try {
    await signOut(auth);
    // Clear localStorage/session
    localStorage.removeItem('mfd_user');
    sessionStorage.clear();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🎯 Auth State Observer (For UI Updates)
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Fetch profile based on role
      const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
      if (vendorDoc.exists()) {
        callback({ user, role: 'vendor', profile: vendorDoc.data() });
      } else {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        callback({ user, role: 'customer', profile: userDoc.exists() ? userDoc.data() : {} });
      }
    } else {
      callback({ user: null, role: null, profile: null });
    }
  });
};

// 🎯 Check Admin Privileges
export const isAdmin = async (uid) => {
  const adminDoc = await getDoc(doc(db, "admin", uid));
  return adminDoc.exists() && adminDoc.data().role === 'super_admin';
};
