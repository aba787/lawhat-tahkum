const express = require('express');
const cors = require('cors');
const path = require('path');
const {
    initializeDatabase,
    addEmployee,
    getAllEmployees,
    getEmployeeStats,
    seedDatabase,
    pool
} = require('./database');

// Import Firebase and storage helper functions
const { initializeApp } = require('firebase/app');
const { getStorage } = require('firebase/storage');
const multer = require('multer'); // For handling file uploads

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

// Helper functions for Firebase Storage (assuming these are in a separate file or defined here)
const storageHelpers = {
    uploadEmployeePhoto: async (employeeId, buffer) => {
        const fileName = `employees/${employeeId}/photo.jpg`; // Example naming convention
        const storageRef = storage.ref(fileName);
        await storageRef.put(buffer);
        return storageRef.getDownloadURL();
    },
    uploadResume: async (employeeId, fileData) => {
        const fileName = `employees/${employeeId}/resumes/${fileData.name}`;
        const storageRef = storage.ref(fileName);
        await storageRef.put(fileData.buffer);
        return storageRef.getDownloadURL();
    },
    uploadDocument: async (employeeId, fileData, fileType) => {
        const fileName = `employees/${employeeId}/documents/${fileType}/${fileData.name}`;
        const storageRef = storage.ref(fileName);
        await storageRef.put(fileData.buffer);
        return storageRef.getDownloadURL();
    }
};

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
initializeDatabase().then(() => {
    console.log('تم تهيئة قاعدة البيانات');
}).catch((error) => {
    console.error('خطأ في تهيئة قاعدة البيانات:', error.message);
    console.log('يرجى إنشاء قاعدة البيانات PostgreSQL في Replit أولاً');
    console.log('اضغط على + في الشريط الجانبي > Database > PostgreSQL');
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload file endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم العثور على ملف للرفع' });
        }

        const { employeeId, fileType } = req.body;

        if (!employeeId || !fileType) {
            return res.status(400).json({ error: 'رقم الموظف ونوع الملف مطلوبان' });
        }

        let uploadResult;

        // رفع الملف حسب نوعه
        switch (fileType) {
            case 'photo':
                uploadResult = await storageHelpers.uploadEmployeePhoto(employeeId, req.file.buffer);
                break;
            case 'resume':
                uploadResult = await storageHelpers.uploadResume(employeeId, {
                    name: req.file.originalname,
                    buffer: req.file.buffer
                });
                break;
            default:
                uploadResult = await storageHelpers.uploadDocument(employeeId, {
                    name: req.file.originalname,
                    buffer: req.file.buffer
                }, fileType);
                break;
        }

        res.json({
            success: true,
            fileUrl: typeof uploadResult === 'string' ? uploadResult : uploadResult.url,
            fileName: req.file.originalname,
            fileType,
            employeeId
        });

    } catch (error) {
        console.error('خطأ في رفع الملف:', error);
        res.status(500).json({
            error: 'خطأ في رفع الملف',
            details: error.message
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
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
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

        // Basic validation
        if (!employeeData.name || !employeeData.department) {
            return res.status(400).json({
                error: 'اسم الموظف والقسم مطلوبان'
            });
        }

        const newEmployee = await addEmployee(employeeData);
        res.status(201).json(newEmployee);
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({
            error: 'خطأ في إضافة الموظف',
            details: error.message
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
    console.log(`يمكن الوصول إليه على: http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('إيقاف الخادم...');
    if (pool) {
        pool.end();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('إيقاف الخادم...');
    if (pool) {
        pool.end();
    }
    process.exit(0);
});