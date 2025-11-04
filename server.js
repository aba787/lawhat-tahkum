
const express = require('express');
const cors = require('cors');
const path = require('path');
const { 
    initializeDatabase, 
    getAllEmployees, 
    getEmployeeStats, 
    addEmployee, 
    seedDatabase 
} = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// تهيئة قاعدة البيانات عند بدء الخادم
initializeDatabase().then(() => {
    console.log('تم تهيئة قاعدة البيانات');
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API لجلب جميع الموظفين
app.get('/api/employees', async (req, res) => {
    try {
        const filters = {};
        if (req.query.departmentId) filters.departmentId = req.query.departmentId;
        if (req.query.dateFrom) filters.dateFrom = req.query.dateFrom;
        if (req.query.dateTo) filters.dateTo = req.query.dateTo;

        const employees = await getAllEmployees(filters);
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب البيانات' });
    }
});

// API لجلب الإحصائيات
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getEmployeeStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
    }
});

// API لإضافة موظف جديد
app.post('/api/employees', async (req, res) => {
    try {
        const employee = await addEmployee(req.body);
        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في إضافة الموظف' });
    }
});

// API لإضافة بيانات تجريبية
app.post('/api/seed', async (req, res) => {
    try {
        await seedDatabase();
        res.json({ message: 'تم إدراج البيانات التجريبية بنجاح' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في إدراج البيانات التجريبية' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
