
// Import Firebase Admin SDK instead of client SDK
const admin = require('firebase-admin');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBbtr_lbPaFU3Amy0hovgQILN0GSlGPuE",
  authDomain: "lohthkm.firebaseapp.com",
  projectId: "lohthkm",
  storageBucket: "lohthkm.appspot.com",
  messagingSenderId: "563619887961",
  appId: "1:563619887961:web:b22d973a3bb6754364ea48",
  measurementId: "G-MKCZNVHVC4"
};

// Initialize Firebase Admin (only if not already initialized)
let app;
try {
  if (!admin.apps.length) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        // For production, use service account key
        // For now, we'll use application default credentials
      }),
      storageBucket: firebaseConfig.storageBucket
    });
  } else {
    app = admin.app();
  }
} catch (error) {
  console.log('تحذير: لا يمكن تهيئة Firebase Admin SDK، سيتم استخدام طريقة بديلة');
  app = null;
}

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

      console.log('محاولة رفع صورة للموظف:', employeeId);

      // استخدام طريقة بديلة للرفع في حالة عدم توفر Firebase
      if (!app) {
        // حفظ الملف محلياً كحل مؤقت
        const fs = require('fs');
        const path = require('path');
        
        const uploadsDir = path.join(__dirname, 'uploads', 'photos');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const fileName = `photo_${employeeId}_${Date.now()}.jpg`;
        const filePath = path.join(uploadsDir, fileName);
        
        fs.writeFileSync(filePath, fileBuffer);
        
        // إرجاع رابط محلي
        return `/uploads/photos/${fileName}`;
      }

      const bucket = admin.storage().bucket();
      const fileName = `employees/${employeeId}/photos/photo_${Date.now()}.jpg`;
      const file = bucket.file(fileName);

      await file.save(fileBuffer, {
        metadata: {
          contentType: 'image/jpeg'
        }
      });

      // جعل الملف قابل للقراءة العامة
      await file.makePublic();

      return `https://storage.googleapis.com/${firebaseConfig.storageBucket}/${fileName}`;
      
    } catch (error) {
      console.error('خطأ في رفع صورة الموظف:', error.message);
      
      // طريقة احتياطية - حفظ محلي
      try {
        const fs = require('fs');
        const path = require('path');
        
        const uploadsDir = path.join(__dirname, 'uploads', 'photos');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const fileName = `photo_${employeeId}_${Date.now()}.jpg`;
        const filePath = path.join(uploadsDir, fileName);
        
        fs.writeFileSync(filePath, fileBuffer);
        
        console.log('تم حفظ الصورة محلياً:', fileName);
        return `/uploads/photos/${fileName}`;
        
      } catch (localError) {
        console.error('خطأ في الحفظ المحلي أيضاً:', localError);
        throw new Error(`فشل في رفع صورة الموظف: ${error.message}`);
      }
    }
  },

  // رفع سيرة ذاتية
  async uploadResume(employeeId, file) {
    try {
      if (!employeeId || !file || !file.name) {
        throw new Error('معرف الموظف وبيانات الملف مطلوبة');
      }

      console.log('محاولة رفع سيرة ذاتية للموظف:', employeeId);

      // طريقة احتياطية - حفظ محلي
      const fs = require('fs');
      const path = require('path');
      
      const uploadsDir = path.join(__dirname, 'uploads', 'resumes');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9\u0600-\u06FF.-]/g, '_');
      const fileName = `${employeeId}_resume_${Date.now()}_${cleanFileName}`;
      const filePath = path.join(uploadsDir, fileName);
      
      fs.writeFileSync(filePath, file.buffer || file);
      
      console.log('تم حفظ السيرة الذاتية محلياً:', fileName);
      
      return { 
        url: `/uploads/resumes/${fileName}`, 
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

      console.log('محاولة رفع مستند للموظف:', employeeId, 'نوع:', documentType);

      // طريقة احتياطية - حفظ محلي
      const fs = require('fs');
      const path = require('path');
      
      const uploadsDir = path.join(__dirname, 'uploads', 'documents', documentType);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9\u0600-\u06FF.-]/g, '_');
      const fileName = `${employeeId}_${documentType}_${Date.now()}_${cleanFileName}`;
      const filePath = path.join(uploadsDir, fileName);
      
      fs.writeFileSync(filePath, file.buffer || file);
      
      console.log('تم حفظ المستند محلياً:', fileName);
      
      return { 
        url: `/uploads/documents/${documentType}/${fileName}`, 
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

      // حذف محلي
      const fs = require('fs');
      const path = require('path');
      
      const localFilePath = path.join(__dirname, filePath);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log('تم حذف الملف محلياً:', filePath);
      }
      
      return true;
    } catch (error) {
      console.error('خطأ في حذف الملف:', error.message);
      throw new Error(`فشل في حذف الملف: ${error.message}`);
    }
  }
};

module.exports = {
  app,
  storageHelpers
};
