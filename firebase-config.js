
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
  async uploadEmployeePhoto(employeeId, fileBuffer) {
    try {
      // التحقق من صحة المعطيات
      if (!employeeId || !fileBuffer) {
        throw new Error('معرف الموظف والملف مطلوبان');
      }

      if (typeof employeeId !== 'string' && typeof employeeId !== 'number') {
        throw new Error('معرف الموظف غير صحيح');
      }

      const fileName = `photo_${Date.now()}.jpg`;
      const storageRef = ref(storage, `employees/${employeeId}/photos/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, fileBuffer);
      
      if (!snapshot) {
        throw new Error('فشل في رفع الصورة');
      }
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      if (!downloadURL) {
        throw new Error('فشل في الحصول على رابط الصورة');
      }
      
      return downloadURL;
    } catch (error) {
      console.error('خطأ في رفع صورة الموظف:', error.message);
      throw new Error(`فشل في رفع صورة الموظف: ${error.message}`);
    }
  },

  // رفع سيرة ذاتية
  async uploadResume(employeeId, file) {
    try {
      if (!employeeId || !file || !file.name) {
        throw new Error('معرف الموظف وبيانات الملف مطلوبة');
      }

      // تنظيف اسم الملف
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9\u0600-\u06FF.-]/g, '_');
      const fileName = `${employeeId}_resume_${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, `employees/${employeeId}/resumes/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file.buffer || file);
      
      if (!snapshot) {
        throw new Error('فشل في رفع السيرة الذاتية');
      }
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      if (!downloadURL) {
        throw new Error('فشل في الحصول على رابط السيرة الذاتية');
      }
      
      return { 
        url: downloadURL, 
        fileName: cleanFileName,
        originalName: file.name,
        uploadDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('خطأ في رفع السيرة الذاتية:', error.message);
      throw new Error(`فشل في رفع السيرة الذاتية: ${error.message}`);
    }
  },

  // رفع مستندات عامة
  async uploadDocument(employeeId, file, documentType) {
    try {
      if (!employeeId || !file || !file.name || !documentType) {
        throw new Error('جميع البيانات مطلوبة للرفع');
      }

      // التحقق من نوع المستند المسموح
      const allowedDocTypes = ['certificate', 'contract', 'document', 'id_copy', 'other'];
      if (!allowedDocTypes.includes(documentType)) {
        throw new Error('نوع المستند غير مسموح');
      }

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9\u0600-\u06FF.-]/g, '_');
      const fileName = `${employeeId}_${documentType}_${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, `employees/${employeeId}/documents/${documentType}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file.buffer || file);
      
      if (!snapshot) {
        throw new Error('فشل في رفع المستند');
      }
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      if (!downloadURL) {
        throw new Error('فشل في الحصول على رابط المستند');
      }
      
      return { 
        url: downloadURL, 
        fileName: cleanFileName,
        type: documentType,
        originalName: file.name,
        uploadDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('خطأ في رفع المستند:', error.message);
      throw new Error(`فشل في رفع المستند: ${error.message}`);
    }
  },

  // حذف ملف
  async deleteFile(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('مسار الملف مطلوب');
      }

      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
      return true;
    } catch (error) {
      // إذا كان الملف غير موجود، لا نعتبر هذا خطأ
      if (error.code === 'storage/object-not-found') {
        console.log('الملف غير موجود، قد يكون محذوف مسبقاً');
        return true;
      }
      
      console.error('خطأ في حذف الملف:', error.message);
      throw new Error(`فشل في حذف الملف: ${error.message}`);
    }
  }
};

module.exports = {
  app,
  storage,
  storageHelpers
};
