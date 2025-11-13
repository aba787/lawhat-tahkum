/**
 * This script enhances the HR dashboard by improving data handling, error management, and UI feedback.
 * It includes robust filtering, data loading with fallbacks, and better chart rendering.
 */

// Global variables
let employeesData = [];
let filteredData = [];
let charts = {};

// تحديد الـ base URL للـ API
const getApiBaseUrl = () => {
    // في حالة التطوير المحلي
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }
    // في حالة النشر على Replit
    if (location.hostname.includes('replit.app') || location.hostname.includes('repl.co')) {
        return location.origin;
    }
    // الافتراضي
    return '';
};

const API_BASE_URL = getApiBaseUrl();

// API Functions
async function fetchEmployees(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.departmentId) params.append('departmentId', filters.departmentId);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);

        const response = await fetch(`${API_BASE_URL}/api/employees?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('خطأ في جلب الموظفين:', error);
        throw error; // Re-throw to be caught by caller
    }
}

async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        throw error;
    }
}

async function addNewEmployee(employeeData) {
    try {
        console.log('📤 إرسال بيانات الموظف:', employeeData);

        const response = await fetch(`${API_BASE_URL}/api/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(employeeData),
        });

        console.log('📡 استجابة الخادم:', response.status, response.statusText);

        const responseData = await response.json();
        console.log('📋 بيانات الاستجابة:', responseData);

        if (!response.ok) {
            // إظهار تفاصيل الخطأ للمطور
            if (responseData.details && Array.isArray(responseData.details)) {
                console.error('تفاصيل الأخطاء:', responseData.details);
                throw new Error(responseData.details.join(', '));
            }
            throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('❌ خطأ في إضافة الموظف:', error);

        // في حالة عدم وجود اتصال، إضافة الموظف محلياً
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.warn('🔄 لا يوجد اتصال بالخادم، سيتم إضافة الموظف محلياً');

            // إنشاء موظف وهمي للإضافة المحلية
            const localEmployee = {
                id: Math.max(...employeesData.map(emp => emp.id || 0), 0) + 1,
                ...employeeData,
                hire_date: employeeData.hireDate,
                department_name: employeeData.department,
                is_active: true,
                absence_days: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // إضافة إلى البيانات المحلية
            employeesData.push(localEmployee);
            filteredData = [...employeesData];

            return {
                success: true,
                employee: localEmployee,
                message: 'تم إضافة الموظف محلياً (بدون اتصال بالخادم)'
            };
        }

        throw error;
    }
}

async function seedDatabase() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/seed`, { method: 'POST' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('خطأ في إدراج البيانات التجريبية:', error);
        throw error;
    }
}

// Check database health
async function checkDatabaseHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (!response.ok) {
            console.error('خطأ في استجابة الخادم:', response.status, response.statusText);
            return false;
        }

        const healthData = await response.json();
        console.log('✅ فحص صحة قاعدة البيانات:', healthData);

        return healthData.status === 'healthy' && healthData.database === 'connected';
    } catch (error) {
        console.error('❌ خطأ في التحقق من صحة قاعدة البيانات:', error);
        return false;
    }
}

// Initialize dashboard
function initializeDashboard() {
    // Set default date filters
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');

    if (dateFromInput) dateFromInput.value = oneYearAgo.toISOString().split('T')[0];
    if (dateToInput) dateToInput.value = today.toISOString().split('T')[0];

    // Event listeners
    const loadDataBtn = document.getElementById('loadDataBtn');
    if (loadDataBtn) loadDataBtn.addEventListener('click', loadData);

    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportReport);

    // إضافة حدث لزر إضافة موظف جديد
    const addEmployeeBtn = document.createElement('button');
    addEmployeeBtn.className = 'btn btn-secondary';
    addEmployeeBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة موظف';
    addEmployeeBtn.addEventListener('click', showAddEmployeeModal);
    const headerControls = document.querySelector('.header-controls');
    if (headerControls) headerControls.appendChild(addEmployeeBtn);
}

// Generate local test data as fallback
function generateLocalTestData() {
    try {
        const departments = [
            'الموارد البشرية', 'تكنولوجيا المعلومات', 'الذكاء الاصطناعي',
            'أمن المعلومات', 'تطوير البرمجيات', 'المحاسبة والمالية'
        ];

        const positions = [
            'مهندس برمجيات', 'محلل بيانات', 'مطور Full Stack', 'أخصائي أمن سيبراني',
            'مهندس ذكاء اصطناعي', 'محاسب', 'أخصائي موارد بشرية', 'مدير مشروع'
        ];

        const educationLevels = [
            'بكالوريوس علوم حاسب', 'ماجستير هندسة برمجيات', 'بكالوريوس محاسبة',
            'ماجستير إدارة أعمال', 'دكتوراه ذكاء اصطناعي'
        ];

        const names = [
            'أحمد محمد السعدي', 'فاطمة علي القحطاني', 'خالد عبدالله المطيري',
            'نورا سعد العتيبي', 'محمود حسن الدوسري', 'سارة عبدالعزيز الزهراني',
            'يوسف علي الغامدي', 'هدى عبدالرحمن الشهري', 'عمر خالد العنزي',
            'ريم محمد الحربي', 'إبراهيم سعد الجهني', 'منى حسن البقمي'
        ];

        const localData = [];

        for (let i = 1; i <= 50; i++) {
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomDept = departments[Math.floor(Math.random() * departments.length)];
            const randomPos = positions[Math.floor(Math.random() * positions.length)];
            const randomEdu = educationLevels[Math.floor(Math.random() * educationLevels.length)];

            localData.push({
                id: i,
                name: randomName,
                department: randomDept,
                department_name: randomDept,
                position: randomPos,
                age: 25 + Math.floor(Math.random() * 20),
                salary: 5000 + Math.floor(Math.random() * 10000),
                hire_date: `202${Math.floor(Math.random() * 4)}-0${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
                education: randomEdu,
                gender: Math.random() > 0.5 ? 'ذكر' : 'أنثى',
                is_active: true,
                absence_days: Math.floor(Math.random() * 15)
            });
        }

        console.log('🔧 تم إنشاء بيانات تجريبية محلية:', localData.length, 'موظف');
        return localData;

    } catch (error) {
        console.error('خطأ في إنشاء البيانات التجريبية المحلية:', error);
        return [];
    }
}

// Enhanced message function with different types
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    let backgroundColor;
    switch (type) {
        case 'success': backgroundColor = '#48bb78'; break;
        case 'error': backgroundColor = '#f56565'; break;
        case 'warning': backgroundColor = '#ed8936'; break;
        default: backgroundColor = '#4299e1';
    }

    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background: ${backgroundColor};
        color: white;
        z-index: 1000;
        font-family: Cairo, sans-serif;
        max-width: 400px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv && messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, type === 'error' ? 8000 : 4000);
}

// Helper function to validate date format YYYY-MM-DD
function isValidDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const date = new Date(dateString);
    const timestamp = date.getTime();
    return !isNaN(timestamp) && date.toISOString().split('T')[0] === dateString;
}

// Show/hide loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Specific success/error/warning message helpers
function showSuccess(message) {
    console.log('✅ رسالة نجاح:', message);
    showMessage(message, 'success');
}

function showError(message) {
    console.error('❌ رسالة خطأ:', message);
    showMessage(message, 'error');
}

function showWarning(message) {
    console.warn('⚠️ رسالة تحذير:', message);
    showMessage(message, 'warning');
}

// Populate department filter
function populateDepartmentFilter() {
    const departmentSelect = document.getElementById('departmentFilter');
    if (!departmentSelect) return;

    // قائمة الأقسام المحددة مسبقاً
    const predefinedDepartments = [
        'الموارد البشرية',
        'المحاسبة والمالية',
        'الإدارة العامة',
        'التأمين والمخاطر',
        'المبيعات والتسويق',
        'تكنولوجيا المعلومات',
        'تطوير البرمجيات',
        'أمن المعلومات',
        'تطوير التطبيقات',
        'الذكاء الاصطناعي'
    ];

    // الحصول على الأقسام من البيانات
    const dataDepartments = [...new Set(employeesData.map(emp => emp.department_name || emp.department))].filter(dept => dept);

    // دمج الأقسام المحددة مسبقاً مع الأقسام من البيانات
    const allDepartments = [...new Set([...predefinedDepartments, ...dataDepartments])].filter(dept => dept);

    departmentSelect.innerHTML = '<option value="">جميع الأقسام</option>';
    allDepartments.sort().forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        departmentSelect.appendChild(option);
    });
}

// Apply filters with Enhanced Validation
async function applyFilters() {
    showLoading(true);

    try {
        // التحقق من وجود العناصر في DOM
        const dateFromElement = document.getElementById('dateFrom');
        const dateToElement = document.getElementById('dateTo');
        const departmentElement = document.getElementById('departmentFilter');

        if (!dateFromElement || !dateToElement || !departmentElement) {
            throw new Error('عناصر الفلترة غير موجودة في الصفحة');
        }

        const filters = {};
        const dateFrom = dateFromElement.value?.trim();
        const dateTo = dateToElement.value?.trim();
        const department = departmentElement.value?.trim();

        // التحقق من صحة التواريخ
        if (dateFrom && !isValidDate(dateFrom)) {
            throw new Error('تاريخ البداية غير صحيح');
        }
        if (dateTo && !isValidDate(dateTo)) {
            throw new Error('تاريخ النهاية غير صحيح');
        }

        // التحقق من منطقية التواريخ
        if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
            throw new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        }

        // بناء الفلاتر
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;
        if (department) filters.departmentName = department;

        console.log('🔍 تطبيق الفلاتر:', filters);

        // جلب البيانات المفلترة
        const newEmployeesData = await fetchEmployees(filters);

        if (!Array.isArray(newEmployeesData)) {
            throw new Error('البيانات المستلمة غير صحيحة');
        }

        employeesData = newEmployeesData;
        filteredData = [...employeesData];

        // التحقق من وجود بيانات بعد الفلترة
        if (filteredData.length === 0) {
            showWarning('لم يتم العثور على موظفين بالمعايير المحددة');
        } else {
            showSuccess(`تم تطبيق الفلاتر بنجاح! تم العثور على ${filteredData.length} موظف`);
        }

        // تحديث اللوحة
        await updateDashboard();

    } catch (error) {
        console.error('خطأ تفصيلي في تطبيق الفلاتر:', error);
        showError('خطأ في تطبيق الفلاتر: ' + error.message);

        // في حالة الخطأ، نحاول استخدام البيانات الأصلية
        if (window.originalEmployeesData && Array.isArray(window.originalEmployeesData)) {
            filteredData = [...window.originalEmployeesData];
            await updateDashboard();
        }
    } finally {
        showLoading(false);
    }
}

// Load data function with Enhanced Error Handling and Backup
async function loadData() {
    showLoading(true);

    try {
        console.log('🚀 بدء تحميل البيانات...');

        // التحقق من حالة قاعدة البيانات أولاً
        const isHealthy = await checkDatabaseHealth();
        if (!isHealthy) {
            console.warn('⚠️ لا يمكن الاتصال بالخادم، سيتم استخدام البيانات المحلية...');

            // محاولة استخدام بيانات تجريبية محلية في حالة عدم توفر قاعدة البيانات
            const localData = generateLocalTestData();
            if (localData && localData.length > 0) {
                employeesData = localData;
                filteredData = [...employeesData];
                window.originalEmployeesData = [...employeesData];

                populateDepartmentFilter();
                await updateDashboard();
                showWarning('يعمل التطبيق بالوضع المحلي (لا يوجد اتصال بالخادم)');
                return;
            }

            throw new Error('لا يمكن تحميل أي بيانات');
        }

        // محاولة إدراج البيانات التجريبية إذا كانت قاعدة البيانات فارغة
        try {
            const seedResult = await seedDatabase();
            console.log('✅ تم محاولة إدراج البيانات التجريبية:', seedResult);
        } catch (seedError) {
            console.log('ℹ️ البيانات موجودة بالفعل أو حدث خطأ في الإدراج:', seedError.message);
        }

        // جلب البيانات من قاعدة البيانات
        console.log('📥 جلب البيانات من قاعدة البيانات...');
        employeesData = await fetchEmployees();

        if (!Array.isArray(employeesData)) {
            throw new Error('البيانات المستلمة ليست بالصيغة الصحيحة');
        }

        // حفظ نسخة احتياطية من البيانات الأصلية
        window.originalEmployeesData = [...employeesData];
        filteredData = [...employeesData];

        if (employeesData.length === 0) {
            console.warn('⚠️ لا توجد بيانات في قاعدة البيانات');

            // محاولة إنشاء بيانات تجريبية محلية
            const localData = generateLocalTestData();
            if (localData && localData.length > 0) {
                employeesData = localData;
                filteredData = [...employeesData];
                window.originalEmployeesData = [...employeesData];
                showMessage('تم إنشاء بيانات تجريبية محلية (قاعدة البيانات فارغة)', 'warning');
            } else {
                showError('لا توجد بيانات للعرض. يرجى التأكد من إعداد قاعدة البيانات');
                return;
            }
        }

        console.log(`✅ تم تحميل ${employeesData.length} موظف`);

        // تحديث واجهة المستخدم
        populateDepartmentFilter();
        await updateDashboard();

        showSuccess(`تم تحميل ${employeesData.length} موظف بنجاح!`);

    } catch (error) {
        console.error('❌ خطأ تفصيلي في تحميل البيانات:', error);

        // محاولة استخدام بيانات احتياطية محلية
        try {
            const backupData = generateLocalTestData();
            if (backupData && backupData.length > 0) {
                employeesData = backupData;
                filteredData = [...employeesData];
                window.originalEmployeesData = [...employeesData];

                populateDepartmentFilter();
                await updateDashboard();

                showError(`خطأ في قاعدة البيانات، تم تحميل ${backupData.length} موظف تجريبي: ${error.message}`);
            } else {
                showError(`خطأ في تحميل البيانات: ${error.message}`);
            }
        } catch (backupError) {
            showError(`خطأ في تحميل البيانات: ${error.message}`);
        }
    } finally {
        showLoading(false);
    }
}

// Update dashboard
async function updateDashboard() {
    try {
        await updateKPIs();
        updateCharts();
        updateTable();
        updateDepartmentCards();
    } catch (error) {
        console.error('خطأ في تحديث لوحة المعلومات:', error);
        showError('حدث خطأ أثناء تحديث لوحة المعلومات.');
    }
}

// Update KPIs
async function updateKPIs() {
    try {
        const stats = await fetchStats();
        if (!stats) {
            console.warn('⚠️ لم يتم جلب الإحصائيات');
            return;
        }

        const activeEmployees = filteredData.filter(emp => emp.is_active);
        const totalEmployees = activeEmployees.length;

        // حساب معدل دوران الموظفين
        const turnoverRate = stats.turnover && stats.turnover.total_employees > 0
            ? ((stats.turnover.left_employees / stats.turnover.total_employees) * 100).toFixed(1)
            : '0.0';

        // حساب نسبة الغياب
        const avgAbsence = stats.active && stats.active.avg_absence
            ? (parseFloat(stats.active.avg_absence) / 250 * 100).toFixed(1)
            : '0.0';

        // حساب متوسط سنوات الخبرة
        const avgExperience = totalEmployees > 0 ? (activeEmployees.reduce((sum, emp) => {
            const hireDate = new Date(emp.hire_date);
            const years = (new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365);
            return sum + years;
        }, 0) / totalEmployees).toFixed(1) : '0.0';

        document.getElementById('totalEmployees').textContent = totalEmployees;
        document.getElementById('turnoverRate').textContent = turnoverRate + '%';
        document.getElementById('absenceRate').textContent = avgAbsence + '%';
        document.getElementById('avgExperience').textContent = avgExperience;
    } catch (error) {
        console.error('خطأ في تحديث المؤشرات:', error);
        // لا نعرض رسالة خطأ هنا لعدم إزعاج المستخدم إذا كانت بيانات الإحصائيات غير متوفرة
    }
}

// Update charts with Enhanced Error Handling
function updateCharts() {
    try {
        // التحقق من وجود البيانات
        if (!Array.isArray(filteredData) || filteredData.length === 0) {
            console.warn('⚠️ لا توجد بيانات لعرض الرسوم البيانية');
            clearAllCharts();
            return;
        }

        console.log('📊 تحديث الرسوم البيانية...');

        // تحديث كل رسم بيان مع معالجة الأخطاء المنفصلة
        const chartUpdates = [
            { name: 'توزيع الأقسام', func: updateDepartmentChart },
            { name: 'المؤهلات التعليمية', func: updateEducationChart },
            { name: 'اتجاه التوظيف', func: updateHiringTrendChart },
            { name: 'التوزيع العمري', func: updateAgeDistributionChart },
            { name: 'توزيع الجنس', func: updateGenderChart }
        ];

        chartUpdates.forEach(chart => {
            try {
                chart.func();
                console.log(`✅ تم تحديث رسم ${chart.name}`);
            } catch (error) {
                console.error(`❌ خطأ في رسم ${chart.name}:`, error.message);
                // لا نتوقف عند خطأ في رسم واحد، نكمل الباقي
            }
        });

    } catch (error) {
        console.error('❌ خطأ عام في تحديث الرسوم البيانية:', error);
        showError('خطأ في تحديث الرسوم البيانية: ' + error.message);
    }
}

// Clear all charts when no data available
function clearAllCharts() {
    try {
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        charts = {}; // إعادة تعيين مصفوفة الرسوم
        console.log('🧹 تم مسح جميع الرسوم البيانية');
    } catch (error) {
        console.error('خطأ في مسح الرسوم البيانية:', error);
    }
}

// Department distribution chart
function updateDepartmentChart() {
    const ctx = document.getElementById('departmentChart')?.getContext('2d');
    if (!ctx) return;

    if (charts.department) {
        charts.department.destroy();
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    const deptData = {};

    activeEmployees.forEach(emp => {
        const dept = emp.department_name || emp.department;
        if (dept) {
            deptData[dept] = (deptData[dept] || 0) + 1;
        }
    });

    if (Object.keys(deptData).length === 0) {
        ctx.font = '16px Cairo';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات لعرضها', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    charts.department = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(deptData),
            datasets: [{
                data: Object.values(deptData),
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#f5576c',
                    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Cairo',
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Education distribution chart
function updateEducationChart() {
    const ctx = document.getElementById('educationChart')?.getContext('2d');
    if (!ctx) return;

    if (charts.education) {
        charts.education.destroy();
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    const eduData = {};

    activeEmployees.forEach(emp => {
        if (emp.education) {
            eduData[emp.education] = (eduData[emp.education] || 0) + 1;
        }
    });

    if (Object.keys(eduData).length === 0) {
        ctx.font = '16px Cairo';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات لعرضها', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    charts.education = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(eduData),
            datasets: [{
                data: Object.values(eduData),
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Cairo',
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Hiring trend chart
function updateHiringTrendChart() {
    const ctx = document.getElementById('hiringTrendChart')?.getContext('2d');
    if (!ctx) return;

    if (charts.hiringTrend) {
        charts.hiringTrend.destroy();
    }

    const monthlyHiring = {};

    filteredData.forEach(emp => {
        const date = new Date(emp.hire_date);
        // Format month to be sortable and readable
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 01-12
        const monthKey = `${year}-${month}`;
        monthlyHiring[monthKey] = (monthlyHiring[monthKey] || 0) + 1;
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyHiring).sort();

    // Get data for the last 12 months
    const last12MonthsLabels = sortedMonths.slice(-12);
    const last12MonthsData = last12MonthsLabels.map(month => monthlyHiring[month]);

    if (last12MonthsLabels.length === 0) {
        ctx.font = '16px Cairo';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات لعرضها', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    charts.hiringTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last12MonthsLabels,
            datasets: [{
                label: 'عدد الموظفين المتم توظيفهم',
                data: last12MonthsData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            }
        }
    });
}

// Age distribution chart
function updateAgeDistributionChart() {
    const ctx = document.getElementById('ageDistributionChart')?.getContext('2d');
    if (!ctx) return;

    if (charts.ageDistribution) {
        charts.ageDistribution.destroy();
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    const ageGroups = {
        '20-29': 0,
        '30-39': 0,
        '40-49': 0,
        '50+': 0
    };

    activeEmployees.forEach(emp => {
        const age = emp.age;
        if (age >= 20 && age <= 29) ageGroups['20-29']++;
        else if (age >= 30 && age <= 39) ageGroups['30-39']++;
        else if (age >= 40 && age <= 49) ageGroups['40-49']++;
        else if (age >= 50) ageGroups['50+']++;
    });

    if (Object.values(ageGroups).every(count => count === 0)) {
        ctx.font = '16px Cairo';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات لعرضها', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    charts.ageDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ageGroups),
            datasets: [{
                label: 'عدد الموظفين',
                data: Object.values(ageGroups),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: '#667eea',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: 'Cairo'
                        }
                    }
                }
            }
        }
    });
}

// Update department cards with detailed stats
function updateDepartmentCards() {
    const grid = document.getElementById('departmentCardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    const deptStats = {};

    // حساب الإحصائيات لكل قسم
    activeEmployees.forEach(emp => {
        const dept = emp.department_name || emp.department || 'غير محدد';
        if (!deptStats[dept]) {
            deptStats[dept] = {
                count: 0,
                totalSalary: 0,
                avgAge: 0,
                totalAge: 0,
                maleCount: 0,
                femaleCount: 0,
                avgAbsence: 0,
                totalAbsence: 0
            };
        }

        deptStats[dept].count++;
        deptStats[dept].totalSalary += emp.salary || 0;
        deptStats[dept].totalAge += emp.age || 0;
        deptStats[dept].totalAbsence += emp.absence_days || 0;

        if (emp.gender === 'ذكر') deptStats[dept].maleCount++;
        else if (emp.gender === 'أنثى') deptStats[dept].femaleCount++;
    });

    // حساب المتوسطات وإنشاء البطاقات
    Object.keys(deptStats).sort().forEach(dept => {
        const stats = deptStats[dept];
        if (stats.count > 0) {
            stats.avgSalary = Math.round(stats.totalSalary / stats.count);
            stats.avgAge = Math.round(stats.totalAge / stats.count);
            stats.avgAbsence = Math.round(stats.totalAbsence / stats.count);

            const card = document.createElement('div');
            card.className = 'department-card';
            card.innerHTML = `
                <h4>${dept}</h4>
                <div class="department-card-stats">
                    <div class="department-stat">
                        <div class="department-stat-value">${stats.count}</div>
                        <div class="department-stat-label">عدد الموظفين</div>
                    </div>
                    <div class="department-stat">
                        <div class="department-stat-value">${stats.avgSalary.toLocaleString()}</div>
                        <div class="department-stat-label">متوسط الراتب</div>
                    </div>
                    <div class="department-stat">
                        <div class="department-stat-value">${stats.avgAge}</div>
                        <div class="department-stat-label">متوسط العمر</div>
                    </div>
                    <div class="department-stat">
                        <div class="department-stat-value">${stats.avgAbsence}</div>
                        <div class="department-stat-label">متوسط أيام الغياب</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        }
    });
}

// Gender distribution chart
function updateGenderChart() {
    const ctx = document.getElementById('genderChart')?.getContext('2d');
    if (!ctx) return;

    if (charts.gender) {
        charts.gender.destroy();
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    const genderData = {};

    activeEmployees.forEach(emp => {
        if (emp.gender) {
            genderData[emp.gender] = (genderData[emp.gender] || 0) + 1;
        }
    });

    if (Object.keys(genderData).length === 0) {
        ctx.font = '16px Cairo';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات لعرضها', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    charts.gender = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(genderData),
            datasets: [{
                data: Object.values(genderData),
                backgroundColor: ['#667eea', '#f093fb'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Cairo',
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Update table
function updateTable() {
    const tbody = document.querySelector('#employeesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!Array.isArray(filteredData) || filteredData.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7; // Assuming 7 columns in your table
        cell.textContent = 'لا توجد بيانات لعرضها';
        cell.style.textAlign = 'center';
        cell.style.fontFamily = 'Cairo, sans-serif';
        return;
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active).slice(0, 20);

    activeEmployees.forEach(emp => {
        const row = tbody.insertRow();
        const hireDate = new Date(emp.hire_date).toLocaleDateString('ar-SA');
        const salary = emp.salary ? parseFloat(emp.salary).toLocaleString() : 'غير محدد';

        row.innerHTML = `
            <td>${emp.name}</td>
            <td>${emp.department_name || emp.department || 'غير محدد'}</td>
            <td>${emp.position || 'غير محدد'}</td>
            <td>${hireDate}</td>
            <td>${emp.education || 'غير محدد'}</td>
            <td>${emp.age || 'غير محدد'}</td>
            <td>${salary} ريال</td>
        `;
    });
}

// Show add employee modal
function showAddEmployeeModal() {
    // إنشاء نافذة منبثقة لإضافة الموظف
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-user-plus"></i> إضافة موظف جديد</h3>
                <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="addEmployeeForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>الاسم *</label>
                            <input type="text" id="empName" required placeholder="أدخل اسم الموظف">
                        </div>
                        <div class="form-group">
                            <label>القسم *</label>
                            <select id="empDepartment" required>
                                <option value="">اختر القسم</option>
                                <option value="الموارد البشرية">الموارد البشرية</option>
                                <option value="المحاسبة والمالية">المحاسبة والمالية</option>
                                <option value="الإدارة العامة">الإدارة العامة</option>
                                <option value="التأمين والمخاطر">التأمين والمخاطر</option>
                                <option value="المبيعات والتسويق">المبيعات والتسويق</option>
                                <option value="تكنولوجيا المعلومات">تكنولوجيا المعلومات</option>
                                <option value="تطوير البرمجيات">تطوير البرمجيات</option>
                                <option value="أمن المعلومات">أمن المعلومات</option>
                                <option value="تطوير التطبيقات">تطوير التطبيقات</option>
                                <option value="الذكاء الاصطناعي">الذكاء الاصطناعي</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>المنصب</label>
                            <input type="text" id="empPosition" placeholder="أدخل منصب الموظف">
                        </div>
                        <div class="form-group">
                            <label>المؤهل التعليمي</label>
                            <input type="text" id="empEducation" placeholder="مثال: بكالوريوس علوم حاسب">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>العمر</label>
                            <input type="number" id="empAge" min="18" max="65" placeholder="العمر">
                        </div>
                        <div class="form-group">
                            <label>الراتب</label>
                            <input type="number" id="empSalary" min="0" step="100" placeholder="الراتب بالريال">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>الجنس</label>
                            <select id="empGender">
                                <option value="">اختر الجنس</option>
                                <option value="ذكر">ذكر</option>
                                <option value="أنثى">أنثى</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>تاريخ التعيين *</label>
                            <input type="date" id="empHireDate" required max="${new Date().toISOString().split('T')[0]}" min="1970-01-01">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            إلغاء
                        </button>
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-save"></i> حفظ الموظف
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // إضافة التنسيقات للنافذة المنبثقة
    const styles = `
        <style>
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Cairo', sans-serif;
        }
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #eee;
            background: #8B1538;
            color: white;
            border-radius: 12px 12px 0 0;
        }
        .modal-header h3 {
            margin: 0;
            font-size: 1.2rem;
        }
        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
            transition: background 0.3s;
        }
        .modal-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        .modal-body {
            padding: 20px;
        }
        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
        }
        .form-group {
            flex: 1;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #333;
        }
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-family: 'Cairo', sans-serif;
            transition: border-color 0.3s;
        }
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #8B1538;
        }
        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        </style>
    `;

    // إضافة التنسيقات إلى الرأس
    if (!document.querySelector('#modal-styles')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'modal-styles';
        styleElement.innerHTML = styles;
        document.head.appendChild(styleElement);
    }

    // إضافة النافذة إلى الصفحة
    document.body.appendChild(modal);

    // إضافة حدث الإرسال للنموذج
    document.getElementById('addEmployeeForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // التحقق من صحة التاريخ قبل الإرسال
    const hireDateInput = document.getElementById('empHireDate').value;
    if (!hireDateInput) {
        showError('يرجى إدخال تاريخ التعيين');
        return;
    }

    const hireDate = new Date(hireDateInput);
    const today = new Date();

    if (isNaN(hireDate.getTime())) {
        showError('تنسيق تاريخ التعيين غير صحيح');
        return;
    }

    if (hireDate > today) {
        showError('تاريخ التعيين لا يمكن أن يكون في المستقبل');
        return;
    }

    const employeeData = {
        name: document.getElementById('empName').value.trim(),
        department: document.getElementById('empDepartment').value,
        position: document.getElementById('empPosition').value.trim(),
        hireDate: hireDateInput,
        education: document.getElementById('empEducation').value.trim(),
        age: document.getElementById('empAge').value,
        salary: document.getElementById('empSalary').value,
        gender: document.getElementById('empGender').value
    };

        try {
            showLoading(true);
            const result = await addNewEmployee(employeeData);

            if (result && result.success) {
                showSuccess('تم إضافة الموظف بنجاح!');
                modal.remove();
                // إعادة تحميل البيانات مع تأخير بسيط
                setTimeout(() => {
                    loadData();
                }, 500);
            } else {
                throw new Error(result?.error || 'فشل في إضافة الموظف');
            }
        } catch (error) {
            console.error('خطأ في إضافة الموظف:', error);
            showError('خطأ في إضافة الموظف: ' + (error.message || 'خطأ غير متوقع'));
        } finally {
            showLoading(false);
        }
    });
}

// Export report
function exportReport() {
    const reportData = {
        totalEmployees: filteredData.filter(emp => emp.is_active).length,
        departmentDistribution: {},
        educationDistribution: {},
        timestamp: new Date().toLocaleString('ar-SA')
    };

    // Calculate distributions
    filteredData.filter(emp => emp.is_active).forEach(emp => {
        const dept = emp.department_name || emp.department;
        if (dept) {
            reportData.departmentDistribution[dept] =
                (reportData.departmentDistribution[dept] || 0) + 1;
        }

        if (emp.education) {
            reportData.educationDistribution[emp.education] =
                (reportData.educationDistribution[emp.education] || 0) + 1;
        }
    });

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `hr-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
}

// رفع ملف
async function uploadFile() {
    const employeeId = document.getElementById('employeeIdForUpload')?.value;
    const fileType = document.getElementById('fileType')?.value;
    const fileInput = document.getElementById('fileInput');
    const file = fileInput?.files?.[0];

    // التحقق من البيانات المطلوبة
    if (!employeeId) {
        showError('يرجى إدخال رقم الموظف');
        return;
    }

    if (!file) {
        showError('يرجى اختيار ملف للرفع');
        return;
    }

    if (!fileType) {
        showError('يرجى اختيار نوع الملف');
        return;
    }

    // التحقق من حجم الملف (5MB كحد أقصى)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
        showError('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
        return;
    }

    // التحقق من نوع الملف
    const allowedTypes = {
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

    if (allowedTypes[fileType] && !allowedTypes[fileType].includes(file.type)) {
        console.log('نوع الملف المحدد:', file.type);
        console.log('الأنواع المسموحة:', allowedTypes[fileType]);
        showError(`نوع الملف "${file.type}" غير مسموح لهذا النوع من الملفات. الأنواع المسموحة: ${allowedTypes[fileType].join(', ')}`);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('employeeId', employeeId);
    formData.append('fileType', fileType);

    try {
        showLoading(true);
        console.log('🔄 بدء رفع الملف:', file.name, 'للموظف:', employeeId);

        // التحقق من الاتصال بالخادم أولاً
        const healthCheck = await fetch(`${API_BASE_URL}/api/health`);
        if (!healthCheck.ok) {
            throw new Error('الخادم غير متاح حالياً');
        }

        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        console.log('📡 استجابة الخادم:', response.status, response.statusText);

        let result;
        try {
            result = await response.json();
            console.log('📋 بيانات الاستجابة:', result);
        } catch (parseError) {
            console.error('خطأ في تحليل الاستجابة:', parseError);
            throw new Error('استجابة غير صحيحة من الخادم');
        }

        if (!response.ok) {
            const errorMessage = result?.error || `خطأ HTTP ${response.status}`;
            console.error('❌ خطأ من الخادم:', errorMessage);
            throw new Error(errorMessage);
        }

        if (result.success) {
            console.log('✅ تم رفع الملف بنجاح:', result.fileUrl);
            showSuccess(`تم رفع الملف "${file.name}" بنجاح!`);

            // إعادة تعيين النموذج
            document.getElementById('employeeIdForUpload').value = '';
            fileInput.value = '';
            document.getElementById('fileType').selectedIndex = 0;

            // إضافة رابط الملف إلى قاعدة البيانات
            try {
                await updateEmployeeWithFile(employeeId, result.fileUrl, fileType);
            } catch (updateError) {
                console.warn('⚠️ تحذير: تم رفع الملف ولكن فشل في ربطه ببيانات الموظف:', updateError);
                showMessage('تم رفع الملف بنجاح ولكن فشل في ربطه ببيانات الموظف', 'warning');
            }
        } else {
            const errorMsg = result.error || 'فشل في رفع الملف';
            console.error('❌ فشل الرفع:', errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('💥 خطأ تفصيلي في رفع الملف:', error);

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('لا يمكن الاتصال بالخادم. تأكد من تشغيل التطبيق');
        } else if (error.message.includes('413')) {
            showError('حجم الملف كبير جداً');
        } else if (error.message.includes('415')) {
            showError('نوع الملف غير مدعوم');
        } else {
            showError('خطأ في رفع الملف: ' + error.message);
        }
    } finally {
        showLoading(false);
    }
}

// التحقق من حالة الخادم
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        return data.status === 'healthy' && data.database === 'connected';
    } catch (error) {
        console.error('خطأ في فحص صحة الخادم:', error);
        return false;
    }
}

// تحديث بيانات الموظف بالملف
async function updateEmployeeWithFile(employeeId, fileUrl, fileType) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/employees/${employeeId}/files`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileUrl,
                fileType,
                uploadDate: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('خطأ في تحديث بيانات الموظف:', error);
        throw error;
    }
}

// عرض حالة الخادم
async function updateServerStatus() {
    const isHealthy = await checkServerHealth();
    let statusElement = document.getElementById('server-status');

    // إنشاء عنصر حالة الخادم إذا لم يكن موجوداً
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'server-status';
        statusElement.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.9);
            padding: 8px 12px;
            border-radius: 20px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            font-family: Cairo, sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        document.body.appendChild(statusElement);
    }

    if (isHealthy) {
        statusElement.innerHTML = '<i class="fas fa-circle" style="color: #4CAF50;"></i> قاعدة البيانات متصلة';
        statusElement.style.color = '#4CAF50';
        console.log('✅ قاعدة البيانات متصلة');
    } else {
        statusElement.innerHTML = '<i class="fas fa-circle" style="color: #f44336;"></i> قاعدة البيانات غير متاحة';
        statusElement.style.color = '#f44336';
        console.log('❌ قاعدة البيانات غير متاحة');

        // عرض رسالة تحذيرية للمستخدم
        showError('قاعدة البيانات غير متاحة - يتم تحميل البيانات التجريبية المحلية');
    }

    return isHealthy;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 بدء تهيئة التطبيق...');

    try {
        initializeDashboard();

        // إضافة مستمع لزر رفع الملف
        const uploadFileBtn = document.getElementById('uploadFileBtn');
        if (uploadFileBtn) {
            uploadFileBtn.addEventListener('click', uploadFile);
        }

        // Load initial data with a small delay to ensure DOM is ready
        setTimeout(() => {
            loadData();
        }, 100);

        // فحص حالة الخادم كل 30 ثانية
        setInterval(updateServerStatus, 30000);
        updateServerStatus();

        console.log('✅ تم تهيئة التطبيق بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        showError('خطأ في تهيئة التطبيق: ' + error.message);
    }
});

// إضافة معالج خطأ عام للنافذة
window.addEventListener('error', (event) => {
    console.error('خطأ JavaScript غير معالج:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise مرفوض غير معالج:', event.reason);
});