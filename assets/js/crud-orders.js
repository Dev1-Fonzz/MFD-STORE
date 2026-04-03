// assets/js/crud-orders.js
import { 
  db, collection, addDoc, getDoc, doc, updateDoc, 
  query, where, orderBy, onSnapshot, serverTimestamp, increment 
} from './firebase-config.js';
import { generateOrderCode } from './firebase-config.js';

// 🛒 Create Order (Customer Checkout)
export const createOrder = async (orderData) => {
  try {
    const orderCode = generateOrderCode();
    
    const order = {
      ...orderData,
      orderCode,
      status: 'To Pay',
      paymentStatus: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timeline: [{
        status: 'Created',
        timestamp: serverTimestamp(),
        note: 'Order created'
      }]
    };
    
    const docRef = await addDoc(collection(db, "orders"), order);
    
    // Update customer stats
    await updateDoc(doc(db, "users", orderData.customerId), {
      totalOrders: increment(1),
      totalSpent: increment(orderData.total)
    });
    
    // Update vendor stats
    await updateDoc(doc(db, "vendors", orderData.vendorId), {
      totalOrders: increment(1)
    });
    
    // Update product sold count
    await updateDoc(doc(db, "products", orderData.productId), {
      sold: increment(orderData.qty)
    });
    
    return { success: true, orderId: docRef.id, orderCode };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
// 📋 Subscribe to Customer Orders (Real-time)
export const subscribeCustomerOrders = (customerId, callback) => {
  const q = query(
    collection(db, "orders"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.(),
      timeline: doc.data().timeline?.map(t => ({
        ...t,
        timestamp: t.timestamp?.toDate?.()
      }))
    }));
    callback(orders);
  });
};

// 📋 Subscribe to Vendor Orders (Real-time)
export const subscribeVendorOrders = (vendorId, callback) => {
  const q = query(
    collection(db, "orders"),
    where("vendorId", "==", vendorId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()
    }));
    callback(orders);
  });
};

// ✅ Update Order Status (With Timeline)
export const updateOrderStatus = async (orderId, newStatus, note = '', actorId) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    const orderDoc = await getDoc(orderRef);
    const order = orderDoc.data();
    
    // Validate status transition
    const validTransitions = {
      'To Pay': ['To Ship', 'Cancelled'],      'To Ship': ['To Receive', 'Cancelled'],
      'To Receive': ['Completed', 'Return'],
      'Completed': [],
      'Cancelled': [],
      'Return': ['Completed', 'Cancelled']
    };
    
    if (!validTransitions[order.status]?.includes(newStatus) && newStatus !== order.status) {
      return { success: false, error: `Invalid status transition: ${order.status} → ${newStatus}` };
    }
    
    // Update order
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      timeline: arrayUnion({
        status: newStatus,
        timestamp: serverTimestamp(),
        note,
        actorId
      })
    });
    
    // If completed, update revenue
    if (newStatus === 'Completed') {
      await updateDoc(doc(db, "vendors", order.vendorId), {
        totalSales: increment(order.total)
      });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 📤 Add Tracking Number
export const addTracking = async (orderId, trackingNo, courier) => {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      trackingNo,
      courier,
      status: 'To Receive',
      updatedAt: serverTimestamp(),
      timeline: arrayUnion({
        status: 'Shipped',
        timestamp: serverTimestamp(),
        note: `Tracking: ${trackingNo} (${courier})`
      })
    });    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🔄 Subscribe to Admin Order Verification Queue
export const subscribePendingOrders = (callback) => {
  const q = query(
    collection(db, "orders"),
    where("paymentStatus", "==", "Pending"),
    where("status", "==", "To Pay"),
    orderBy("createdAt", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(orders);
  });
};

// ✅ Admin Verify Payment
export const verifyPayment = async (orderId, adminId, paymentProof) => {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      paymentStatus: 'Verified',
      paymentProof,
      verifiedBy: adminId,
      verifiedAt: serverTimestamp(),
      timeline: arrayUnion({
        status: 'Payment Verified',
        timestamp: serverTimestamp(),
        note: 'Payment confirmed by admin',
        actorId: adminId
      })
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
