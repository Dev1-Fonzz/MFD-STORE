// assets/js/crud-products.js
import { 
  db, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, storage, 
  ref, uploadBytes, getDownloadURL 
} from './firebase-config.js';

// 📦 Fetch Products by Vendor (Real-time)
export const subscribeVendorProducts = (vendorId, callback) => {
  const q = query(
    collection(db, "products"), 
    where("vendorId", "==", vendorId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()
    }));
    callback(products);
  });
};

// 📦 Fetch Public Products (For Customer Storefront)
export const subscribePublicProducts = (filters = {}, callback) => {
  let q = query(collection(db, "products"), where("status", "==", "Public"));
  
  if (filters.eventTag) {
    q = query(q, where("eventTags", "array-contains", filters.eventTag));
  }
  if (filters.minPrice) {
    q = query(q, where("price", ">=", filters.minPrice));
  }
  if (filters.maxPrice) {
    q = query(q, where("price", "<=", filters.maxPrice));
  }
  
  q = query(q, orderBy("sold", "desc"), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()
    }));
    callback(products);
  });
};
// ➕ Add New Product (With Image Upload)
export const addProduct = async (productData, imageFile) => {
  try {
    let imageUrl = '';
    
    // Upload image if provided
    if (imageFile) {
      const storageRef = ref(storage, `products/${productData.vendorId}/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    }
    
    // Get vendor payment config as default
    const vendorDoc = await getDoc(doc(db, "vendors", productData.vendorId));
    const vendorPayment = vendorDoc.data()?.paymentConfig || {};
    
    const product = {
      ...productData,
      image: imageUrl,
      paymentInfo: productData.paymentInfo || vendorPayment,
      sold: 0,
      rating: 0,
      reviewCount: 0,
      views: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "products"), product);
    
    // Update vendor product count
    await updateDoc(doc(db, "vendors", productData.vendorId), {
      productCount: increment(1)
    });
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding product:", error);
    return { success: false, error: error.message };
  }
};

// ✏️ Update Product
export const updateProduct = async (productId, updates) => {
  try {
    await updateDoc(doc(db, "products", productId), {
      ...updates,
      updatedAt: serverTimestamp()
    });    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 🗑️ Delete Product (Soft Delete)
export const deleteProduct = async (productId, vendorId) => {
  try {
    // Soft delete: update status instead of hard delete
    await updateDoc(doc(db, "products", productId), {
      status: 'Deleted',
      deletedAt: serverTimestamp(),
      deletedBy: vendorId
    });
    
    await updateDoc(doc(db, "vendors", vendorId), {
      productCount: increment(-1)
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 📊 Get Product Stats
export const getProductStats = async (vendorId) => {
  try {
    const q = query(collection(db, "products"), where("vendorId", "==", vendorId));
    const snapshot = await getDocs(q);
    
    let totalRevenue = 0;
    let totalSold = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalSold += data.sold || 0;
      totalRevenue += (data.sold || 0) * (data.price || 0);
    });
    
    return {
      totalProducts: snapshot.size,
      totalSold,
      totalRevenue,
      averageRating: snapshot.docs.reduce((acc, doc) => acc + (doc.data().rating || 0), 0) / snapshot.size || 0
    };
  } catch (error) {
    return { error: error.message };
  }};
