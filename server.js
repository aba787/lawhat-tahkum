const express = require('express');
const cors = require('cors');
const path = require('path');
const {
    initializeDatabase,
    addEmployee,
    getAllEmployees,
    getEmployeeStats,
    seedDatabase,
    db,
    closeDatabase
} = require('./database');

// Import Firebase and storage helper functions
const { initializeApp } = require('firebase/app');
const { getStorage } = require('firebase/storage');
const multer = require('multer'); // For handling file uploads

// Import storage helpers from firebase-config
const { storageHelpers } = require('./firebase-config');

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBBbtr_lbPaFU3Amy0hovgQILN0GSlGPuE",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "lohthkm.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "lohthkm",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "lohthkm.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "563619887961",
    appId: process.env.FIREBASE_APP_ID || "1:563619887961:web:b22d973a3bb6754364ea48",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-MKCZNVHVC4"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

// Configure Multer for in-memory file storage
const storageConfig = multer.memoryStorage();
const upload = multer(storageConfig);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// خدمة الملفات الثابتة مع معالجة أفضل للأخطاء
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    etag: false
}));

// إضافة خدمة الملفات المرفوعة محلياً
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware لتسجيل الطلبات
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// Initialize database
initializeDatabase().then(() => {
    console.log('تم تهيئة قاعدة البيانات SQLite بنجاح');
    console.log('قاعدة البيانات جاهزة للاستخدام');
}).catch((error) => {
    console.error('خطأ في تهيئة قاعدة البيانات:', error.message);
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// مسارات إضافية للتأكد من عمل التطبيق
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Catch-all handler لضمان عمل SPA
app.get('*', (req, res, next) => {
    // إذا كان الطلب لـ API، تمريره للمعالج التالي
    if (req.path.startsWith('/api')) {
        return next();
    }
    
    // إذا كان طلب ملف ثابت، تمريره للمعالج التالي
    if (req.path.includes('.')) {
        return next();
    }
    
    // إرجاع index.html للمسارات الأخرى
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload file endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        // التحقق من وجود الملف
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'لم يتم العثور على ملف للرفع'
            });
        }

        const { employeeId, fileType } = req.body;

        // التحقق من صحة البيانات المطلوبة
        if (!employeeId || !fileType) {
            return res.status(400).json({
                success: false,
                error: 'رقم الموظف ونوع الملف مطلوبان'
            });
        }

        // التحقق من صحة معرف الموظف
        if (isNaN(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'معرف الموظف غير صحيح'
            });
        }

        // التحقق من وجود الموظف في قاعدة البيانات
        const employeeCheck = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM employees WHERE id = ?', [employeeId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!employeeCheck) {
            return res.status(404).json({
                success: false,
                error: 'الموظف غير موجود'
            });
        }

        // التحقق من نوع الملف المسموح
        const allowedFileTypes = ['photo', 'resume', 'document', 'certificate', 'contract'];
        if (!allowedFileTypes.includes(fileType)) {
            return res.status(400).json({
                success: false,
                error: 'نوع الملف غير مسموح'
            });
        }

        // التحقق من نوع الملف حسب النوع المحدد
        const allowedMimeTypes = {
            'photo': [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'
            ],
            'resume': [
                'application/pdf', 
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/rtf',
                'text/rtf'
            ],
            'contract': [
                'application/pdf', 
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/rtf',
                'text/rtf'
            ],
            'certificate': [
                'application/pdf', 
                'image/jpeg', 
                'image/jpg', 
                'image/png', 
                'image/gif',
                'image/webp',
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ],
            'document': [
                'application/pdf', 
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/rtf',
                'text/rtf',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ]
        };

        if (allowedMimeTypes[fileType] && !allowedMimeTypes[fileType].includes(req.file.mimetype)) {
            console.log('نوع الملف المرفوع:', req.file.mimetype);
            console.log('الأنواع المسموحة للنوع', fileType, ':', allowedMimeTypes[fileType]);
            return res.status(400).json({
                success: false,
                error: `نوع الملف "${req.file.mimetype}" غير مسموح لهذا النوع من الملفات`
            });
        }

        // التحقق من حجم الملف (5MB كحد أقصى)
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxFileSize) {
            return res.status(400).json({
                success: false,
                error: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت'
            });
        }

        let uploadResult;

        // رفع الملف حسب نوعه مع معالجة الأخطاء
        try {
            switch (fileType) {
                case 'photo':
                    uploadResult = await storageHelpers.uploadEmployeePhoto(employeeId, req.file.buffer);
                    break;
                case 'resume':
                    uploadResult = await storageHelpers.uploadResume(employeeId, {
                        name: req.file.originalname || 'resume',
                        buffer: req.file.buffer
                    });
                    break;
                default:
                    uploadResult = await storageHelpers.uploadDocument(employeeId, {
                        name: req.file.originalname || 'document',
                        buffer: req.file.buffer
                    }, fileType);
                    break;
            }
        } catch (uploadError) {
            console.error('خطأ في رفع الملف إلى Firebase:', uploadError);
            return res.status(500).json({
                success: false,
                error: 'فشل في رفع الملف',
                details: 'تعذر الاتصال بخدمة التخزين السحابي'
            });
        }

        // التأكد من نجاح الرفع
        if (!uploadResult) {
            return res.status(500).json({
                success: false,
                error: 'فشل في رفع الملف'
            });
        }

        const fileUrl = typeof uploadResult === 'string' ? uploadResult : uploadResult.url;

        if (!fileUrl) {
            return res.status(500).json({
                success: false,
                error: 'لم يتم الحصول على رابط الملف'
            });
        }

        // إرجاع النتيجة الناجحة
        res.json({
            success: true,
            fileUrl: fileUrl,
            fileName: req.file.originalname || 'file',
            fileType,
            employeeId: parseInt(employeeId),
            fileSize: req.file.size,
            uploadDate: new Date().toISOString()
        });

    } catch (error) {
        console.error('خطأ عام في رفع الملف:', error);
        res.status(500).json({
            success: false,
            error: 'خطأ داخلي في الخادم',
            details: process.env.NODE_ENV === 'development' ? error.message : 'حدث خطأ غير متوقع'
        });
    }
});

// Update employee with file info
app.post('/api/employees/:id/files', async (req, res) => {
    try {
        const { id } = req.params;
        const { fileUrl, fileType, uploadDate } = req.body;

        // هنا يمكنك إضافة منطق لحفظ معلومات الملف في قاعدة البيانات
        // مثلاً إنشاء جدول منفصل للملفات أو إضافة عمود للملفات في جدول الموظفين

        res.json({
            success: true,
            message: 'تم تحديث بيانات الموظف بنجاح'
        });

    } catch (error) {
        console.error('خطأ في تحديث بيانات الموظف:', error);
        res.status(500).json({
            error: 'خطأ في تحديث بيانات الموظف',
            details: error.message
        });
    }
});


// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // فحص بسيط لقاعدة البيانات SQLite
        db.get('SELECT 1 as test', (err, row) => {
            if (err) {
                console.error('Database health check failed:', err);
                res.status(500).json({
                    status: 'unhealthy',
                    database: 'غير متصل',
                    error: err.message,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.json({
                    status: 'healthy',
                    database: 'connected',
                    timestamp: new Date().toISOString()
                });
            }
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            database: 'غير متصل',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get all employees with optional filters
app.get('/api/employees', async (req, res) => {
    try {
        const filters = {
            departmentId: req.query.departmentId,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            departmentName: req.query.departmentName
        };

        const employees = await getAllEmployees(filters);
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            error: 'خطأ في جلب بيانات الموظفين',
            details: error.message
        });
    }
});

// Add new employee
app.post('/api/employees', async (req, res) => {
    try {
        const employeeData = req.body;

        // التحقق الشامل من صحة البيانات
        const validationErrors = [];

        // التحقق من الحقول المطلوبة
        if (!employeeData.name || employeeData.name.trim() === '') {
            validationErrors.push('اسم الموظف مطلوب');
        }
        if (!employeeData.department || employeeData.department.trim() === '') {
            validationErrors.push('القسم مطلوب');
        }
        if (!employeeData.hireDate) {
            validationErrors.push('تاريخ التعيين مطلوب');
        }

        // التحقق من صحة الأسماء (يقبل العربية والإنجليزية)
        if (employeeData.name && !/^[\u0600-\u06FFa-zA-Z\s]+$/.test(employeeData.name.trim())) {
            validationErrors.push('الاسم يجب أن يحتوي على حروف فقط');
        }

        // التحقق من صحة العمر
        if (employeeData.age) {
            const age = parseInt(employeeData.age);
            if (isNaN(age) || age < 18 || age > 65) {
                validationErrors.push('العمر يجب أن يكون بين 18 و 65 سنة');
            }
        }

        // التحقق من صحة الراتب
        if (employeeData.salary) {
            const salary = parseFloat(employeeData.salary);
            if (isNaN(salary) || salary < 0) {
                validationErrors.push('الراتب يجب أن يكون رقماً موجباً');
            }
        }

        // التحقق من صحة تاريخ التعيين
        if (employeeData.hireDate) {
            const hireDate = new Date(employeeData.hireDate);
            const today = new Date();
            const minDate = new Date('1970-01-01'); // تاريخ أدنى منطقي
            
            if (isNaN(hireDate.getTime())) {
                validationErrors.push('تنسيق تاريخ التعيين غير صحيح');
            } else if (hireDate > today) {
                validationErrors.push('تاريخ التعيين لا يمكن أن يكون في المستقبل');
            } else if (hireDate < minDate) {
                validationErrors.push('تاريخ التعيين قديم جداً');
            }
        }

        // التحقق من صحة الجنس
        if (employeeData.gender && !['ذكر', 'أنثى'].includes(employeeData.gender)) {
            validationErrors.push('الجنس يجب أن يكون ذكر أو أنثى');
        }

        // إرجاع أخطاء التحقق إن وجدت
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'بيانات غير صحيحة',
                details: validationErrors
            });
        }

        // تنظيف البيانات
        const cleanEmployeeData = {
            name: employeeData.name.trim(),
            department: employeeData.department.trim(),
            position: employeeData.position ? employeeData.position.trim() : '',
            hireDate: employeeData.hireDate,
            education: employeeData.education ? employeeData.education.trim() : '',
            age: employeeData.age ? parseInt(employeeData.age) : null,
            salary: employeeData.salary ? parseFloat(employeeData.salary) : null,
            gender: employeeData.gender || null
        };

        const newEmployee = await addEmployee(cleanEmployeeData);

        if (!newEmployee) {
            return res.status(500).json({
                success: false,
                error: 'فشل في إضافة الموظف'
            });
        }

        res.status(201).json({
            success: true,
            employee: newEmployee,
            message: 'تم إضافة الموظف بنجاح'
        });

    } catch (error) {
        console.error('خطأ في إضافة الموظف:', error);

        // معالجة أخطاء قاعدة البيانات المحددة
        if (error.code === '23505') { // duplicate key error
            return res.status(400).json({
                success: false,
                error: 'الموظف موجود مسبقاً',
                details: 'يوجد موظف بنفس البيانات'
            });
        }

        if (error.code === '23503') { // foreign key constraint error
            return res.status(400).json({
                success: false,
                error: 'القسم المحدد غير موجود',
                details: 'يرجى اختيار قسم صحيح'
            });
        }

        res.status(500).json({
            success: false,
            error: 'خطأ داخلي في الخادم',
            details: process.env.NODE_ENV === 'development' ? error.message : 'حدث خطأ غير متوقع'
        });
    }
});

// Get employee statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getEmployeeStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            error: 'خطأ في جلب الإحصائيات',
            details: error.message
        });
    }
});

// Seed database with sample data
app.post('/api/seed', async (req, res) => {
    try {
        await seedDatabase();
        res.json({
            message: 'تم إدراج البيانات التجريبية بنجاح',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error seeding database:', error);
        res.status(500).json({
            error: 'خطأ في إدراج البيانات التجريبية',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'خطأ داخلي في الخادم',
        details: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'المسار غير موجود'
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
    console.log(`يمكن الوصول إليه على: http://0.0.0.0:${PORT}`);
    console.log('الخادم جاهز لاستقبال الطلبات');
});

// تحسين معالجة الأخطاء للخادم
server.on('error', (err) => {
    console.error('خطأ في الخادم:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('إيقاف الخادم...');
    try {
        await closeDatabase();
    } catch (error) {
        console.error('خطأ في إغلاق قاعدة البيانات:', error);
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('إيقاف الخادم...');
    try {
        await closeDatabase();
    } catch (error) {
        console.error('خطأ في إغلاق قاعدة البيانات:', error);
    }
    process.exit(0);
});