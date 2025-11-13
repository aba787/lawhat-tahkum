
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// إعداد قاعدة البيانات SQLite
const dbPath = path.join(__dirname, 'hr_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', err);
    } else {
        console.log('تم الاتصال بقاعدة البيانات بنجاح');
    }
});

// تمكين Foreign Keys في SQLite
db.run('PRAGMA foreign_keys = ON');

// وظائف مساعدة للتعامل مع SQLite
const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

const getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

const allAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// إنشاء الجداول المطلوبة
async function initializeDatabase() {
    try {
        // جدول الأقسام
        await runAsync(`
            CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // جدول الموظفين
        await runAsync(`
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                department_id INTEGER,
                position TEXT,
                hire_date DATE NOT NULL,
                education TEXT,
                age INTEGER,
                salary REAL,
                gender TEXT,
                is_active BOOLEAN DEFAULT 1,
                absence_days INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(id)
            )
        `);

        // إنشاء فهارس لتحسين الأداء
        await runAsync('CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date)');
        await runAsync('CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active)');

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
            try {
                await runAsync('INSERT OR IGNORE INTO departments (name) VALUES (?)', [dept]);
            } catch (error) {
                // تجاهل أخطاء التكرار
                console.log(`القسم "${dept}" موجود بالفعل`);
            }
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

        // التحقق من وجود القسم
        const deptResult = await getAsync('SELECT id FROM departments WHERE name = ?', [department]);
        
        if (!deptResult) {
            throw new Error(`القسم "${department}" غير موجود`);
        }
        
        const departmentId = deptResult.id;

        // التحقق من عدم وجود موظف بنفس الاسم في نفس القسم
        const duplicateCheck = await getAsync(
            'SELECT id FROM employees WHERE name = ? AND department_id = ? AND is_active = 1', 
            [name, departmentId]
        );
        
        if (duplicateCheck) {
            throw new Error('يوجد موظف بنفس الاسم في هذا القسم');
        }

        // إضافة الموظف
        const result = await runAsync(`
            INSERT INTO employees (name, department_id, position, hire_date, education, age, salary, gender)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, departmentId, position || '', hireDate, education || '', age, salary, gender || '']);

        // جلب الموظف المضاف
        const newEmployee = await getAsync('SELECT * FROM employees WHERE id = ?', [result.id]);
        
        if (!newEmployee) {
            throw new Error('فشل في إضافة الموظف');
        }
        
        return newEmployee;
        
    } catch (error) {
        console.error('خطأ في إضافة الموظف:', error.message);
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
            query += ` AND e.department_id = ?`;
        }

        if (filters.dateFrom) {
            params.push(filters.dateFrom);
            query += ` AND e.hire_date >= ?`;
        }

        if (filters.dateTo) {
            params.push(filters.dateTo);
            query += ` AND e.hire_date <= ?`;
        }

        if (filters.departmentName) {
            params.push(filters.departmentName);
            query += ` AND d.name = ?`;
        }

        query += ' ORDER BY e.created_at DESC';

        const result = await allAsync(query, params);
        return result;
    } catch (error) {
        console.error('خطأ في جلب الموظفين:', error);
        throw error;
    }
}

// جلب إحصائيات الموظفين
async function getEmployeeStats(filters = {}) {
    try {
        // إجمالي الموظفين النشطين
        const activeStats = await getAsync(`
            SELECT 
                COUNT(*) as total_active,
                AVG(age) as avg_age,
                AVG(absence_days) as avg_absence
            FROM employees e
            WHERE e.is_active = 1
        `);

        // معدل دوران الموظفين
        const turnoverStats = await getAsync(`
            SELECT 
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as left_employees,
                COUNT(*) as total_employees
            FROM employees e
            WHERE hire_date >= date('now', '-1 year')
        `);

        // توزيع الأقسام
        const deptStats = await allAsync(`
            SELECT d.name, COUNT(e.id) as count
            FROM departments d
            LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = 1
            GROUP BY d.id, d.name
        `);

        // توزيع المؤهلات
        const educationStats = await allAsync(`
            SELECT education, COUNT(*) as count
            FROM employees
            WHERE is_active = 1 AND education IS NOT NULL AND education != ''
            GROUP BY education
        `);

        return {
            active: activeStats || { total_active: 0, avg_age: 0, avg_absence: 0 },
            turnover: turnoverStats || { left_employees: 0, total_employees: 0 },
            departments: deptStats || [],
            education: educationStats || []
        };
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        throw error;
    }
}

// إضافة بيانات تجريبية
async function seedDatabase() {
    try {
        const count = await getAsync('SELECT COUNT(*) as count FROM employees');
        if (count && count.count > 0) {
            console.log('قاعدة البيانات تحتوي على بيانات بالفعل');
            return;
        }

        const departments = await allAsync('SELECT * FROM departments');
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
            'مدير قواعد البيانات أول', 'مدير قواعد البيانات', 'مطور قواعد البيانات',
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
            const dept = departments[Math.floor(Math.random() * departments.length)];
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

            if (education.includes('دكتوراه')) baseSalary += 2000;
            else if (education.includes('ماجستير')) baseSalary += 1000;

            await runAsync(`
                INSERT INTO employees (name, department_id, position, hire_date, education, age, salary, gender, absence_days)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                names[Math.floor(Math.random() * names.length)],
                dept.id,
                position,
                hireDate.toISOString().split('T')[0],
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

// إغلاق قاعدة البيانات بأمان
function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('تم إغلاق قاعدة البيانات');
                resolve();
            }
        });
    });
}

module.exports = {
    db,
    initializeDatabase,
    addEmployee,
    getAllEmployees,
    getEmployeeStats,
    seedDatabase,
    closeDatabase,
    // للتوافق مع الكود الحالي
    pool: {
        query: async (sql, params = []) => {
            if (sql.includes('SELECT 1')) {
                return { rows: [{ '?column?': 1 }] };
            }
            return { rows: await allAsync(sql, params) };
        }
    }
};
