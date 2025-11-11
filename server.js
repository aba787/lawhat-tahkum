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
        res.status(503).json({
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