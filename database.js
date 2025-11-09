
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
            'الموارد البشرية',
            'المحاسبة والمالية', 
            'الإدارة العامة',
            'التأمين والمخاطر',
            'تكنولوجيا المعلومات',
            'المبيعات والتسويق',
            'العمليات والإنتاج',
            'الشؤون القانونية',
            'خدمة العملاء',
            'التطوير والبحث',
            'تطوير التطبيقات',
            'أمن المعلومات',
            'الشبكات والبنية التحتية',
            'الذكاء الاصطناعي',
            'علوم البيانات',
            'هندسة البرمجيات',
            'إدارة المشاريع التقنية',
            'الأنظمة السحابية',
            'DevOps والأتمتة',
            'اختبار البرمجيات',
            'واجهات المستخدم UX/UI',
            'إنترنت الأشياء IoT'
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
        const names = [
            'أحمد محمد الأحمدي', 'فاطمة علي السعدي', 'محمود حسن القحطاني', 
            'نورا سعد العتيبي', 'خالد أحمد المطيري', 'سارة عبدالله الدوسري',
            'عبدالعزيز محمد الزهراني', 'هدى عبدالرحمن الشهري', 'يوسف علي الغامدي',
            'ريم خالد العنزي', 'عمر عبدالله الحربي', 'نادية محمد الجهني',
            'إبراهيم سعد البقمي', 'منى حسن الفيصل', 'طارق عبدالعزيز السبيعي'
        ];
        const positions = [
            'مدير عام', 'نائب المدير', 'رئيس قسم', 'مدير إدارة', 'نائب رئيس القسم',
            'أخصائي أول', 'أخصائي', 'محاسب أول', 'محاسب', 'مطور أول', 'مطور',
            'مستشار قانوني', 'أخصائي مخاطر', 'محلل مالي', 'مسؤول تأمين', 'منسق إداري',
            'مطور Full Stack', 'مطور Frontend', 'مطور Backend', 'مهندس أنظمة',
            'محلل أمن سيبراني', 'مختص أمن المعلومات', 'مهندس شبكات', 'مدير قواعد البيانات',
            'مختص ذكاء اصطناعي', 'عالم بيانات', 'محلل بيانات', 'مهندس Machine Learning',
            'مهندس DevOps', 'مختص أنظمة سحابية', 'مهندس AWS/Azure', 'مختص Kubernetes',
            'مصمم UX/UI', 'مختص تجربة المستخدم', 'مطور تطبيقات الجوال', 'مهندس QA',
            'مختص إنترنت الأشياء', 'مهندس Blockchain', 'مطور ألعاب', 'مختص الواقع الافتراضي'
        ];
        const educationLevels = [
            'دكتوراه', 'ماجستير', 'بكالوريوس', 'دبلوم عالي', 'دبلوم',
            'بكالوريوس علوم حاسب', 'بكالوريوس هندسة برمجيات', 'بكالوريوس أمن سيبراني',
            'ماجستير ذكاء اصطناعي', 'ماجستير علوم البيانات', 'شهادة AWS المعتمدة',
            'شهادة Azure المعتمدة', 'شهادة Google Cloud', 'شهادات أمن المعلومات',
            'bootcamp البرمجة', 'دبلوم تقني متخصص'
        ];

        for (let i = 0; i < 100; i++) {
            const dept = departments.rows[Math.floor(Math.random() * departments.rows.length)];
            const hireDate = new Date(2020 + Math.floor(Math.random() * 4), 
                                    Math.floor(Math.random() * 12), 
                                    Math.floor(Math.random() * 28));
            
            // تنويع الراتب حسب المنصب والمؤهل
            const position = positions[Math.floor(Math.random() * positions.length)];
            const education = educationLevels[Math.floor(Math.random() * educationLevels.length)];
            let baseSalary = 4000;
            
            if (position.includes('مدير')) baseSalary = 12000;
            else if (position.includes('رئيس') || position.includes('أول')) baseSalary = 8000;
            else if (position.includes('أخصائي')) baseSalary = 6000;
            
            if (education === 'دكتوراه') baseSalary += 2000;
            else if (education === 'ماجستير') baseSalary += 1000;

            await pool.query(`
                INSERT INTO employees (name, department_id, position, hire_date, education, age, salary, gender, absence_days)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                names[Math.floor(Math.random() * names.length)],
                dept.id,
                position,
                hireDate,
                education,
                22 + Math.floor(Math.random() * 38), // أعمار من 22 إلى 60
                baseSalary + Math.floor(Math.random() * 3000), // تنويع في الراتب
                Math.random() > 0.55 ? 'ذكر' : 'أنثى', // توزيع أكثر توازناً
                Math.floor(Math.random() * 25) // أيام غياب من 0 إلى 24
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
