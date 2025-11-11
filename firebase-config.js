
// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBbtr_lbPaFU3Amy0hovgQILN0GSlGPuE",
  authDomain: "lohthkm.firebaseapp.com",
  projectId: "lohthkm",
  storageBucket: "lohthkm.firebasestorage.app",
  messagingSenderId: "563619887961",
  appId: "1:563619887961:web:b22d973a3bb6754364ea48",
  measurementId: "G-MKCZNVHVC4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
const storage = getStorage(app);

// Storage helper functions
const storageHelpers = {
  // رفع صورة موظف
  async uploadEmployeePhoto(employeeId, file) {
    try {
      const storageRef = ref(storage, `employees/photos/${employeeId}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('خطأ في رفع صورة الموظف:', error);
      throw error;
    }
  },

  // رفع سيرة ذاتية
  async uploadResume(employeeId, file) {
    try {
      const fileName = `${employeeId}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `employees/resumes/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { url: downloadURL, fileName };
    } catch (error) {
      console.error('خطأ في رفع السيرة الذاتية:', error);
      throw error;
    }
  },

  // رفع مستندات عامة
  async uploadDocument(employeeId, file, documentType) {
    try {
      const fileName = `${employeeId}_${documentType}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `employees/documents/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { url: downloadURL, fileName, type: documentType };
    } catch (error) {
      console.error('خطأ في رفع المستند:', error);
      throw error;
    }
  },

  // حذف ملف
  async deleteFile(filePath) {
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
      return true;
    } catch (error) {
      console.error('خطأ في حذف الملف:', error);
      throw error;
    }
  }
};

module.exports = {
  app,
  storage,
  storageHelpers
};
