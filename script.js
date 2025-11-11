
// Global variables
let employeesData = [];
let filteredData = [];
let charts = {};

// API Functions
async function fetchEmployees(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.departmentId) params.append('departmentId', filters.departmentId);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.departmentName) params.append('departmentName', filters.departmentName);

        const response = await fetch(`/api/employees?${params}`);
        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('خطأ في جلب الموظفين:', error);
        showError('تعذر جلب بيانات الموظفين: ' + error.message);
        return [];
    }
}

async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
        showError('تعذر جلب الإحصائيات: ' + error.message);
        return null;
    }
}

async function addNewEmployee(employeeData) {
    try {
        const response = await fetch('/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(employeeData),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `خطأ في الخادم: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('خطأ في إضافة الموظف:', error);
        throw error;
    }
}

async function seedDatabase() {
    try {
        const response = await fetch('/api/seed', { method: 'POST' });
        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('خطأ في إدراج البيانات التجريبية:', error);
        throw error;
    }
}

// فحص صحة قاعدة البيانات
async function checkDatabaseHealth() {
    try {
        const response = await fetch('/api/health');
        if (!response.ok) {
            throw new Error('الخادم غير متاح');
        }
        
        const data = await response.json();
        return data.status === 'healthy' && data.database === 'connected';
    } catch (error) {
        console.error('خطأ في فحص صحة قاعدة البيانات:', error);
        return false;
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message') || createErrorElement();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function createErrorElement() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
        display: none;
        font-family: Cairo, sans-serif;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(errorDiv);
    return errorDiv;
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message') || createSuccessElement();
    successDiv.textContent = message;
    successDiv.style.display = 'block';

    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

function createSuccessElement() {
    const successDiv = document.createElement('div');
    successDiv.id = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #48bb78;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
        display: none;
        font-family: Cairo, sans-serif;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(successDiv);
    return successDiv;
}

// Initialize dashboard
function initializeDashboard() {
    // Set default date filters
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    document.getElementById('dateFrom').value = oneYearAgo.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('exportBtn').addEventListener('click', exportReport);

    // إضافة حدث لزر إضافة موظف جديد
    const addEmployeeBtn = document.createElement('button');
    addEmployeeBtn.className = 'btn btn-secondary';
    addEmployeeBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة موظف';
    addEmployeeBtn.addEventListener('click', showAddEmployeeModal);
    document.querySelector('.header-controls').appendChild(addEmployeeBtn);

    // التحقق التلقائي من صحة قاعدة البيانات عند التحميل
    setTimeout(() => {
        checkDatabaseHealth().then(isHealthy => {
            if (isHealthy) {
                console.log('✅ قاعدة البيانات متاحة');
            } else {
                showError('❌ قاعدة البيانات غير متاحة. يرجى التحقق من اتصال قاعدة البيانات');
            }
        });
    }, 1000);
}

// Load data function
async function loadData() {
    showLoading(true);

    try {
        // التحقق من حالة قاعدة البيانات أولاً
        const isHealthy = await checkDatabaseHealth();
        if (!isHealthy) {
            throw new Error('قاعدة البيانات غير متاحة. يرجى إنشاء PostgreSQL Database أولاً');
        }

        // محاولة إدراج البيانات التجريبية إذا كانت قاعدة البيانات فارغة
        try {
            await seedDatabase();
            console.log('✅ تم محاولة إدراج البيانات التجريبية');
        } catch (seedError) {
            console.log('ℹ️ البيانات موجودة بالفعل أو حدث خطأ في الإدراج:', seedError.message);
        }

        // جلب البيانات من قاعدة البيانات
        employeesData = await fetchEmployees();
        filteredData = [...employeesData];

        if (employeesData.length === 0) {
            showError('لا توجد بيانات في قاعدة البيانات. تأكد من إدراج البيانات التجريبية أولاً');
            return;
        }

        populateDepartmentFilter();
        await updateDashboard();

        showSuccess(`تم تحميل ${employeesData.length} موظف بنجاح!`);
    } catch (error) {
        console.error('خطأ تفصيلي في تحميل البيانات:', error);
        showError(`خطأ في تحميل البيانات: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Show/hide loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
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
    const dataDepartments = [...new Set(employeesData.map(emp => emp.department_name || emp.department))];

    // دمج الأقسام المحددة مسبقاً مع الأقسام من البيانات
    const allDepartments = [...new Set([...predefinedDepartments, ...dataDepartments])].filter(dept => dept);

    departmentSelect.innerHTML = '<option value="">جميع الأقسام</option>';
    allDepartments.forEach(dept => {
        departmentSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
}

// Apply filters
async function applyFilters() {
    showLoading(true);

    try {
        const filters = {};
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        const department = document.getElementById('departmentFilter').value;

        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;
        if (department) {
            filters.departmentName = department;
        }

        employeesData = await fetchEmployees(filters);
        filteredData = [...employeesData];

        await updateDashboard();
        showSuccess('تم تطبيق الفلاتر بنجاح!');
    } catch (error) {
        showError('خطأ في تطبيق الفلاتر: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Update dashboard
async function updateDashboard() {
    await updateKPIs();
    updateCharts();
    updateTable();
    updateDepartmentCards();
}

// Update KPIs
async function updateKPIs() {
    try {
        const stats = await fetchStats();
        const activeEmployees = filteredData.filter(emp => emp.is_active);
        const totalEmployees = activeEmployees.length;

        if (totalEmployees === 0) {
            document.getElementById('totalEmployees').textContent = '0';
            document.getElementById('turnoverRate').textContent = '0%';
            document.getElementById('absenceRate').textContent = '0%';
            document.getElementById('avgExperience').textContent = '0';
            return;
        }

        // حساب معدل دوران الموظفين
        let turnoverRate = 0;
        if (stats && stats.turnover && stats.turnover.total_employees > 0) {
            turnoverRate = ((stats.turnover.left_employees / stats.turnover.total_employees) * 100).toFixed(1);
        }

        // حساب نسبة الغياب
        let avgAbsence = 0;
        if (stats && stats.active && stats.active.avg_absence) {
            avgAbsence = (parseFloat(stats.active.avg_absence) / 250 * 100).toFixed(1);
        }

        // حساب متوسط سنوات الخبرة
        const avgExperience = (activeEmployees.reduce((sum, emp) => {
            const hireDate = new Date(emp.hire_date);
            const years = (new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365);
            return sum + years;
        }, 0) / totalEmployees).toFixed(1);

        document.getElementById('totalEmployees').textContent = totalEmployees.toLocaleString();
        document.getElementById('turnoverRate').textContent = turnoverRate + '%';
        document.getElementById('absenceRate').textContent = avgAbsence + '%';
        document.getElementById('avgExperience').textContent = avgExperience;
    } catch (error) {
        console.error('خطأ في تحديث المؤشرات:', error);
    }
}

// Update charts
function updateCharts() {
    try {
        updateDepartmentChart();
        updateEducationChart();
        updateHiringTrendChart();
        updateAgeDistributionChart();
        updateGenderChart();
    } catch (error) {
        console.error('خطأ في تحديث الرسوم البيانية:', error);
    }
}

// Department distribution chart
function updateDepartmentChart() {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;

    if (charts.department) {
        charts.department.destroy();
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    if (activeEmployees.length === 0) return;

    const deptData = {};
    activeEmployees.forEach(emp => {
        const dept = emp.department_name || emp.department;
        if (dept) {
            deptData[dept] = (deptData[dept] || 0) + 1;
        }
    });

    charts.department = new Chart(ctx.getContext('2d'), {
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
    const ctx = document.getElementById('educationChart');
    if (!ctx) return;

    if (charts.education) {
        charts.education.destroy();
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    if (activeEmployees.length === 0) return;

    const eduData = {};
    activeEmployees.forEach(emp => {
        if (emp.education) {
            eduData[emp.education] = (eduData[emp.education] || 0) + 1;
        }
    });

    charts.education = new Chart(ctx.getContext('2d'), {
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
    const ctx = document.getElementById('hiringTrendChart');
    if (!ctx) return;

    if (charts.hiringTrend) {
        charts.hiringTrend.destroy();
    }

    const monthlyHiring = {};
    filteredData.forEach(emp => {
        const date = new Date(emp.hire_date);
        const month = date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
        monthlyHiring[month] = (monthlyHiring[month] || 0) + 1;
    });

    const sortedMonths = Object.keys(monthlyHiring).sort((a, b) => new Date(a) - new Date(b));
    if (sortedMonths.length === 0) return;

    charts.hiringTrend = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: sortedMonths.slice(-12),
            datasets: [{
                label: 'عدد الموظفين المتم توظيفهم',
                data: sortedMonths.slice(-12).map(month => monthlyHiring[month]),
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
    const ctx = document.getElementById('ageDistributionChart');
    if (!ctx) return;

    if (charts.ageDistribution) {
        charts.ageDistribution.destroy();
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    if (activeEmployees.length === 0) return;

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

    charts.ageDistribution = new Chart(ctx.getContext('2d'), {
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
    if (activeEmployees.length === 0) {
        grid.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
        return;
    }

    const deptStats = {};

    // حساب الإحصائيات لكل قسم
    activeEmployees.forEach(emp => {
        const dept = emp.department_name || emp.department || 'غير محدد';
        if (!deptStats[dept]) {
            deptStats[dept] = {
                count: 0,
                totalSalary: 0,
                totalAge: 0,
                totalAbsence: 0
            };
        }

        deptStats[dept].count++;
        deptStats[dept].totalSalary += emp.salary || 0;
        deptStats[dept].totalAge += emp.age || 0;
        deptStats[dept].totalAbsence += emp.absence_days || 0;
    });

    // حساب المتوسطات وإنشاء البطاقات
    Object.keys(deptStats).forEach(dept => {
        const stats = deptStats[dept];
        if (stats.count > 0) {
            const avgSalary = Math.round(stats.totalSalary / stats.count);
            const avgAge = Math.round(stats.totalAge / stats.count);
            const avgAbsence = Math.round(stats.totalAbsence / stats.count);

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
                        <div class="department-stat-value">${avgSalary.toLocaleString()}</div>
                        <div class="department-stat-label">متوسط الراتب</div>
                    </div>
                    <div class="department-stat">
                        <div class="department-stat-value">${avgAge}</div>
                        <div class="department-stat-label">متوسط العمر</div>
                    </div>
                    <div class="department-stat">
                        <div class="department-stat-value">${avgAbsence}</div>
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
    const ctx = document.getElementById('genderChart');
    if (!ctx) return;

    if (charts.gender) {
        charts.gender.destroy();
    }

    const activeEmployees = filteredData.filter(emp => emp.is_active);
    if (activeEmployees.length === 0) return;

    const genderData = {};
    activeEmployees.forEach(emp => {
        if (emp.gender) {
            genderData[emp.gender] = (genderData[emp.gender] || 0) + 1;
        }
    });

    charts.gender = new Chart(ctx.getContext('2d'), {
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

    const activeEmployees = filteredData.filter(emp => emp.is_active).slice(0, 20);

    if (activeEmployees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد بيانات لعرضها</td></tr>';
        return;
    }

    activeEmployees.forEach(emp => {
        const row = tbody.insertRow();
        const hireDate = new Date(emp.hire_date).toLocaleDateString('ar-SA');
        const salary = emp.salary ? parseFloat(emp.salary).toLocaleString() : 'غير محدد';

        row.innerHTML = `
            <td>${emp.name || 'غير محدد'}</td>
            <td>${emp.department_name || emp.department || 'غير محدد'}</td>
            <td>${emp.position || 'غير محدد'}</td>
            <td>${hireDate}</td>
            <td>${emp.education || 'غير محدد'}</td>
            <td>${emp.age || 'غير محدد'}</td>
            <td>${salary} ريال</td>
        `;
    });
}

// Show add employee modal (مبسط)
function showAddEmployeeModal() {
    const name = prompt('اسم الموظف:');
    if (!name) return;

    const department = prompt('القسم:');
    if (!department) return;

    const position = prompt('المنصب:');
    const education = prompt('المؤهل التعليمي:');
    const age = parseInt(prompt('العمر:')) || 30;
    const salary = parseFloat(prompt('الراتب:')) || 5000;
    const gender = prompt('الجنس (ذكر/أنثى):') || 'ذكر';

    const employeeData = {
        name,
        department,
        position,
        hireDate: new Date().toISOString().split('T')[0],
        education,
        age,
        salary,
        gender
    };

    addNewEmployee(employeeData)
        .then(() => {
            showSuccess('تم إضافة الموظف بنجاح!');
            loadData(); // إعادة تحميل البيانات
        })
        .catch((error) => {
            showError('خطأ في إضافة الموظف: ' + error.message);
        });
}

// Export report
function exportReport() {
    try {
        const activeEmployees = filteredData.filter(emp => emp.is_active);
        
        if (activeEmployees.length === 0) {
            showError('لا توجد بيانات لتصديرها');
            return;
        }

        const reportData = {
            totalEmployees: activeEmployees.length,
            departmentDistribution: {},
            educationDistribution: {},
            employees: activeEmployees.map(emp => ({
                name: emp.name,
                department: emp.department_name || emp.department,
                position: emp.position,
                hireDate: emp.hire_date,
                education: emp.education,
                age: emp.age,
                salary: emp.salary
            })),
            timestamp: new Date().toLocaleString('ar-SA')
        };

        // Calculate distributions
        activeEmployees.forEach(emp => {
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
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        showSuccess('تم تصدير التقرير بنجاح!');
    } catch (error) {
        showError('خطأ في تصدير التقرير: ' + error.message);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeDashboard);
