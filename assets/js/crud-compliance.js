// assets/js/crud-compliance.js
import { 
  db, collection, addDoc, getDoc, doc, updateDoc, 
  query, where, orderBy, serverTimestamp, increment 
} from './firebase-config.js';
import { calculateRiskScore } from './firebase-config.js';

// ⚖️ Violation Types (From your UI)
export const VIOLATION_TYPES = {
  FAILED_DELIVERY: 'Kegagalan Menghantar',
  FAKE_PRODUCT: 'Produk Palsu/IP',
  SPAM_SCAM: 'Spam / Scam', 
  REFUND_ABUSE: 'Penyalahgunaan Refund',
  MANUAL_ADMIN: 'Manual Admin'
};

// 🚨 Log Violation & Auto-Calculate Risk
export const logViolation = async ({ userId, violationType, demeritPoints = 10, note, adminId }) => {
  try {
    // Add to compliance_logs
    await addDoc(collection(db, "compliance_logs"), {
      userId,
      violationType,
      demeritPoints,
      note,
      adminId,
      createdAt: serverTimestamp(),
      resolved: false
    });
    
    // Update user demerit
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    
    const newDemerit = (userData.demeritPoints || 0) + demeritPoints;
    const newRisk = calculateRiskScore({ ...userData, demeritPoints: newDemerit });
    
    await updateDoc(userRef, {
      demeritPoints: newDemerit,
      riskScore: newRisk,
      lastViolation: serverTimestamp(),
      logCache: arrayUnion({
        type: violationType,
        points: demeritPoints,
        timestamp: serverTimestamp()
      })
    });
    
    // Auto-enforcement: Check thresholds    let actionTaken = null;
    
    if (newRisk >= 70) {
      // Auto-ban high risk
      await updateDoc(userRef, { status: 'Blocked' });
      actionTaken = 'AUTO_BLOCK_HIGH_RISK';
    } else if (newDemerit >= 100) {
      // Max demerit reached
      await updateDoc(userRef, { status: 'Suspended' });
      actionTaken = 'AUTO_SUSPEND_MAX_DEMERIT';
    }
    
    return { 
      success: true, 
      newDemerit, 
      newRisk, 
      actionTaken,
      status: actionTaken ? 'Auto-enforced' : 'Logged'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 📋 Get Compliance History
export const getComplianceHistory = async (userId) => {
  try {
    const q = query(
      collection(db, "compliance_logs"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()
    }));
  } catch (error) {
    return { error: error.message };
  }
};

// 🚫 Add to Blacklist
export const addToBlacklist = async ({ userId, reason, duration = 'Permanent', adminId }) => {
  try {
    // Add to blacklist collection
    await setDoc(doc(db, "blacklist", userId), {
      userId,      reason,
      duration,
      addedBy: adminId,
      addedAt: serverTimestamp(),
      expiresAt: duration === 'Permanent' ? null : new Date(Date.now() + parseDuration(duration)),
      irreversible: true
    });
    
    // Block user account
    await updateDoc(doc(db, "users", userId), {
      status: 'Blacklisted',
      blacklistReason: reason
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper: Parse duration string to ms
const parseDuration = (duration) => {
  const map = {
    '1 Hari': 24 * 60 * 60 * 1000,
    '3 Hari': 3 * 24 * 60 * 60 * 1000,
    '7 Hari': 7 * 24 * 60 * 60 * 1000,
    '14 Hari': 14 * 24 * 60 * 60 * 1000,
    '30 Hari': 30 * 24 * 60 * 60 * 1000,
    'Permanent': Infinity
  };
  return map[duration] || 0;
};

// 📱 Device Risk Tracking
export const trackDevice = async ({ deviceId, userId, ip, platform }) => {
  try {
    const deviceRef = doc(db, "devices", deviceId);
    const deviceDoc = await getDoc(deviceRef);
    
    const now = serverTimestamp();
    
    if (deviceDoc.exists()) {
      // Update existing device
      await updateDoc(deviceRef, {
        lastSeen: now,
        ip: ip,
        loginCount: increment(1),
        linkedUac: arrayUnion(userId)
      });
    } else {      // New device
      await setDoc(deviceRef, {
        deviceId,
        ip,
        platform,
        riskScore: 0, // Start neutral
        firstSeen: now,
        lastSeen: now,
        loginCount: 1,
        linkedUac: [userId],
        status: 'Active'
      });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
