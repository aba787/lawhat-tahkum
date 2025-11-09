
const { Pool } = require('pg');

// إعداد اتصال قاعدة البيانات
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
    console.log('تم الاتصال بقاعدة البيانات بنجاح');
});

pool.on('error', (err) => {
    console.error('خطأ في اتصال قاعدة البيانات:', err);
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
            // الأقسام الإدارية والمالية الأساسية
            'الموارد البشرية',
            'المحاسبة والمالية', 
            'الإدارة العامة',
            'التأمين والمخاطر',
            'المبيعات والتسويق',
            'العمليات والإنتاج',
            'الشؤون القانونية',
            'خدمة العملاء',
            'التطوير والبحث',
            'الشؤون الإدارية',
            'التخطيط الاستراتيجي',
            'إدارة المشاريع',
            'الجودة والتطوير',
            
            // الأقسام التقنية المتخصصة
            'تكنولوجيا المعلومات',
            'تطوير التطبيقات',
            'هندسة البرمجيات',
            'تطوير الواجهات الأمامية Frontend',
            'تطوير الواجهات الخلفية Backend',
            'تطوير Full Stack',
            'تطوير تطبيقات الجوال',
            'أمن المعلومات والسايبر',
            'الشبكات والبنية التحتية',
            'إدارة قواعد البيانات',
            'الذكاء الاصطناعي وتعلم الآلة',
            'علوم البيانات والتحليل',
            'هندسة البيانات Data Engineering',
            'الأنظمة السحابية AWS/Azure',
            'DevOps والأتمتة',
            'اختبار وضمان الجودة QA',
            'واجهات المستخدم UX/UI Design',
            'إنترنت الأشياء IoT',
            'تقنية البلوك تشين Blockchain',
            'الواقع الافتراضي والمعزز VR/AR',
            'الروبوتيك والأتمتة الذكية',
            'أمن التطبيقات Application Security',
            'هندسة الأنظمة Systems Engineering',
            'إدارة المشاريع التقنية',
            'البحث والتطوير R&D',
            'التدريب التقني والتطوير',
            'الدعم التقني والصيانة',
            'إدارة التقنية والابتكار'
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
            // المناصب الإدارية والقيادية
            'المدير التنفيذي', 'نائب المدير التنفيذي', 'مدير عام', 'نائب المدير العام',
            'رئيس قسم', 'نائب رئيس القسم', 'مدير إدارة', 'مساعد مدير',
            'مشرف أول', 'مشرف', 'منسق عام', 'منسق إداري',
            
            // المناصب المالية والمحاسبية
            'مدير مالي', 'محاسب قانوني', 'محاسب أول', 'محاسب', 'مساعد محاسب',
            'محلل مالي أول', 'محلل مالي', 'أخصائي مخاطر', 'مسؤول تأمين', 'مدقق داخلي',
            
            // مناصب الموارد البشرية
            'مدير موارد بشرية', 'أخصائي موارد بشرية أول', 'أخصائي موارد بشرية',
            'أخصائي تدريب وتطوير', 'أخصائي رواتب ومزايا', 'منسق توظيف',
            
            // المناصب التقنية المتخصصة
            'كبير مهندسي البرمجيات', 'مهندس برمجيات أول', 'مهندس برمجيات',
            'مطور Full Stack أول', 'مطور Full Stack', 'مطور Frontend أول', 'مطور Frontend',
            'مطور Backend أول', 'مطور Backend', 'مطور تطبيقات الجوال أول', 'مطور تطبيقات الجوال',
            
            // مناصب الذكاء الاصطناعي وعلوم البيانات
            'كبير علماء البيانات', 'عالم بيانات أول', 'عالم بيانات', 'محلل بيانات أول', 'محلل بيانات',
            'مهندس ذكاء اصطناعي أول', 'مهندس ذكاء اصطناعي', 'مختص تعلم الآلة أول', 'مختص تعلم الآلة',
            'مهندس بيانات أول', 'مهندس بيانات', 'محلل ذكاء أعمال',
            
            // مناصب الأنظمة السحابية والبنية التحتية
            'مهندس أنظمة سحابية أول', 'مهندس أنظمة سحابية', 'مهندس AWS معتمد', 'مهندس Azure معتمد',
            'مهندس DevOps أول', 'مهندس DevOps', 'مختص Kubernetes', 'مهندس Docker',
            'مدير بنية تحتية', 'مهندس شبكات أول', 'مهندس شبكات', 'مدير خوادم',
            
            // مناصب الأمن السيبراني
            'مدير أمن المعلومات', 'محلل أمن سيبراني أول', 'محلل أمن سيبراني',
            'مختص أمن التطبيقات', 'مهندس أمن شبكات', 'محقق جرائم سيبرانية',
            'مختص اختبار الاختراق', 'مسؤول أمان أنظمة',
            
            // مناصب قواعد البيانات
            'مدير قواعد البيانات أول', 'مدير قواعد البيانات', 'مطور قواعد بيانات',
            'محلل قواعد البيانات', 'مهندس Big Data',
            
            // مناصب التصميم وتجربة المستخدم
            'مدير تصميم UX/UI', 'مصمم UX/UI أول', 'مصمم UX/UI', 'مختص تجربة المستخدم',
            'مصمم جرافيك رقمي', 'مصمم واجهات تفاعلية',
            
            // مناصب ضمان الجودة والاختبار
            'مدير ضمان الجودة', 'مهندس QA أول', 'مهندس QA', 'مختص اختبار أتمتة',
            'محلل اختبارات', 'مهندس اختبار أداء',
            
            // مناصب التقنيات الناشئة
            'مختص بلوك تشين أول', 'مهندس بلوك تشين', 'مطور ألعاب أول', 'مطور ألعاب',
            'مهندس واقع افتراضي', 'مختص واقع معزز', 'مهندس إنترنت الأشياء أول',
            'مطور إنترنت الأشياء', 'مهندس روبوتيك', 'مختص أتمتة ذكية',
            
            // مناصب الدعم والصيانة
            'فني دعم تقني أول', 'فني دعم تقني', 'مختص صيانة أنظمة',
            'مدير مركز البيانات', 'فني شبكات'
        ];
        const educationLevels = [
            // المؤهلات الأكاديمية التقليدية
            'دكتوراه في علوم الحاسب', 'دكتوراه في هندسة البرمجيات', 'دكتوراه في الذكاء الاصطناعي',
            'ماجستير علوم حاسب', 'ماجستير هندسة برمجيات', 'ماجستير ذكاء اصطناعي', 
            'ماجستير علوم البيانات', 'ماجستير أمن سيبراني', 'ماجستير إدارة أعمال MBA',
            'بكالوريوس علوم حاسب', 'بكالوريوس هندسة برمجيات', 'بكالوريوس أمن سيبراني',
            'بكالوريوس نظم معلومات', 'بكالوريوس هندسة حاسب', 'بكالوريوس رياضيات تطبيقية',
            
            // الشهادات السحابية المعتمدة
            'AWS Solutions Architect Professional', 'AWS Solutions Architect Associate',
            'AWS Developer Associate', 'AWS SysOps Administrator', 'AWS DevOps Engineer',
            'Microsoft Azure Architect Expert', 'Azure Administrator Associate', 'Azure Developer Associate',
            'Google Cloud Professional Architect', 'Google Cloud Data Engineer',
            
            // شهادات أمن المعلومات
            'CISSP - أمن نظم المعلومات', 'CISM - إدارة أمن المعلومات',
            'CEH - هاكر أخلاقي معتمد', 'OSCP - اختبار الاختراق',
            'CompTIA Security+', 'CISA - مراجع نظم المعلومات',
            
            // شهادات الشبكات والبنية التحتية
            'CCNP - سيسكو متخصص', 'CCNA - سيسكو مشارك',
            'MCSE - مهندس نظم مايكروسوفت', 'VMware VCP',
            'Kubernetes Administrator CKA', 'Docker Certified Associate',
            
            // شهادات إدارة المشاريع
            'PMP - إدارة المشاريع المعتمدة', 'Scrum Master معتمد', 'Agile Coach',
            'ITIL Foundation', 'Prince2 Foundation',
            
            // شهادات علوم البيانات والذكاء الاصطناعي
            'Google Data Analytics Certificate', 'IBM Data Science Professional',
            'Microsoft AI Engineer Associate', 'TensorFlow Developer Certificate',
            
            // شهادات البرمجة والتطوير
            'Oracle Java Certified Professional', 'Microsoft C# Developer',
            'Red Hat Certified Engineer', 'MongoDB Developer',
            'Salesforce Developer', 'ServiceNow Developer',
            
            // التعليم التقني المكثف
            'Coding Bootcamp - Full Stack', 'Data Science Bootcamp',
            'Cybersecurity Bootcamp', 'UX/UI Design Bootcamp',
            'DevOps Engineering Bootcamp', 'AI/ML Intensive Course',
            
            // الدبلومات المتخصصة
            'دبلوم عالي في أمن المعلومات', 'دبلوم عالي في علوم البيانات',
            'دبلوم تقني في الشبكات', 'دبلوم البرمجة والتطوير',
            'دبلوم التصميم الرقمي', 'دبلوم إدارة المشاريع التقنية'
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
