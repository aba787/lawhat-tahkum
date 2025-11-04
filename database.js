
const { Pool } = require('pg');

// إعداد اتصال قاعدة البيانات
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10
});

// إنشاء الجداول المطلوبة
async function initializeDatabase() {
    try {
        // جدول الأقسام
        await pool.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // جدول الموظفين
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                department_id INTEGER REFERENCES departments(id),
                position VARCHAR(100),
                hire_date DATE NOT NULL,
                education VARCHAR(50),
                age INTEGER,
                salary DECIMAL(10,2),
                gender VARCHAR(10),
                is_active BOOLEAN DEFAULT TRUE,
                absence_days INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // إدراج الأقسام الأساسية إذا لم تكن موجودة
        const departments = [
            'المبيعات', 'التسويق', 'الموارد البشرية', 
            'تكنولوجيا المعلومات', 'المحاسبة', 'العمليات'
        ];

        for (const dept of departments) {
            await pool.query(
                'INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                [dept]
            );
        }

        console.log('تم إعداد قاعدة البيانات بنجاح');
    } catch (error) {
        console.error('خطأ في إعداد قاعدة البيانات:', error);
    }
}

// إضافة موظف جديد
async function addEmployee(employeeData) {
    try {
        const { name, department, position, hireDate, education, age, salary, gender } = employeeData;
        
        // الحصول على معرف القسم
        const deptResult = await pool.query('SELECT id FROM departments WHERE name = $1', [department]);
        const departmentId = deptResult.rows[0]?.id;

        const result = await pool.query(`
            INSERT INTO employees (name, department_id, position, hire_date, education, age, salary, gender)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [name, departmentId, position, hireDate, education, age, salary, gender]);

        return result.rows[0];
    } catch (error) {
        console.error('خطأ في إضافة الموظف:', error);
        throw error;
    }
}

// جلب جميع الموظفين مع بيانات الأقسام
async function getAllEmployees(filters = {}) {
    try {
        let query = `
            SELECT e.*, d.name as department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.departmentId) {
            params.push(filters.departmentId);
            query += ` AND e.department_id = $${params.length}`;
        }

        if (filters.dateFrom) {
            params.push(filters.dateFrom);
            query += ` AND e.hire_date >= $${params.length}`;
        }

        if (filters.dateTo) {
            params.push(filters.dateTo);
            query += ` AND e.hire_date <= $${params.length}`;
        }

        query += ' ORDER BY e.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('خطأ في جلب الموظفين:', error);
        throw error;
    }
}

// جلب إحصائيات الموظفين
async function getEmployeeStats(filters = {}) {
    try {
        // إجمالي الموظفين النشطين
        const activeQuery = `
            SELECT COUNT(*) as total_active,
                   AVG(age) as avg_age,
                   AVG(absence_days) as avg_absence
            FROM employees e
            WHERE e.is_active = true
        `;

        // معدل دوران الموظفين
        const turnoverQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE is_active = false) as left_employees,
                COUNT(*) as total_employees
            FROM employees e
            WHERE hire_date >= NOW() - INTERVAL '1 year'
        `;

        // توزيع الأقسام
        const deptQuery = `
            SELECT d.name, COUNT(e.id) as count
            FROM departments d
            LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
            GROUP BY d.id, d.name
        `;

        // توزيع المؤهلات
        const educationQuery = `
            SELECT education, COUNT(*) as count
            FROM employees
            WHERE is_active = true
            GROUP BY education
        `;

        const [activeResult, turnoverResult, deptResult, educationResult] = await Promise.all([
            pool.query(activeQuery),
            pool.query(turnoverQuery),
            pool.query(deptQuery),
            pool.query(educationQuery)
        ]);

        return {
            active: activeResult.rows[0],
            turnover: turnoverResult.rows[0],
            departments: deptResult.rows,
            education: educationResult.rows
        };
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        throw error;
    }
}

// إضافة بيانات تجريبية
async function seedDatabase() {
    try {
        const count = await pool.query('SELECT COUNT(*) FROM employees');
        if (parseInt(count.rows[0].count) > 0) {
            console.log('قاعدة البيانات تحتوي على بيانات بالفعل');
            return;
        }

        const departments = await pool.query('SELECT * FROM departments');
        const names = ['أحمد محمد', 'فاطمة علي', 'محمود حسن', 'نورا سعد', 'خالد أحمد'];
        const positions = ['مدير', 'نائب مدير', 'رئيس قسم', 'أخصائي أول', 'أخصائي'];
        const educationLevels = ['دكتوراه', 'ماجستير', 'بكالوريوس', 'دبلوم'];

        for (let i = 0; i < 50; i++) {
            const dept = departments.rows[Math.floor(Math.random() * departments.rows.length)];
            const hireDate = new Date(2020 + Math.floor(Math.random() * 4), 
                                    Math.floor(Math.random() * 12), 
                                    Math.floor(Math.random() * 28));
            
            await pool.query(`
                INSERT INTO employees (name, department_id, position, hire_date, education, age, salary, gender, absence_days)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                names[Math.floor(Math.random() * names.length)] + ' ' + (i + 1),
                dept.id,
                positions[Math.floor(Math.random() * positions.length)],
                hireDate,
                educationLevels[Math.floor(Math.random() * educationLevels.length)],
                25 + Math.floor(Math.random() * 25),
                3000 + Math.floor(Math.random() * 12000),
                Math.random() > 0.6 ? 'ذكر' : 'أنثى',
                Math.floor(Math.random() * 30)
            ]);
        }

        console.log('تم إدراج البيانات التجريبية بنجاح');
    } catch (error) {
        console.error('خطأ في إدراج البيانات التجريبية:', error);
    }
}

module.exports = {
    pool,
    initializeDatabase,
    addEmployee,
    getAllEmployees,
    getEmployeeStats,
    seedDatabase
};
