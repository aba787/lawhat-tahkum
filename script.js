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

        const response = await fetch(`/api/employees?${params}`);
        return await response.json();
    } catch (error) {
        console.error('خطأ في جلب الموظفين:', error);
        return [];
    }
}

async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        return await response.json();
    } catch (error) {
        console.error('خطأ في جلب الإحصائيات:', error);
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
        return await response.json();
    } catch (error) {
        console.error('خطأ في إضافة الموظف:', error);
        throw error;
    }
}

async function seedDatabase() {
    try {
        const response = await fetch('/api/seed', { method: 'POST' });
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
        const data = await response.json();

        if (response.ok && data.status === 'healthy') {
            return true;
        } else {
            showError('قاعدة البيانات غير متاحة حالياً');
            return false;
        }
    } catch (error) {
        showError('تعذر الاتصال بالخادم: ' + error.message);
        return false;
    }
}

function showError(message) {
    // إظهار رسالة خطأ للمستخدم
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
    `;
    document.body.appendChild(errorDiv);
    return errorDiv;
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
}

// Load data function
async function loadData() {
    showLoading(true);

    try {
        // التحقق من حالة قاعدة البيانات أولاً
        const isDatabaseHealthy = await checkDatabaseHealth();

        if (!isDatabaseHealthy) {
            throw new Error('قاعدة البيانات غير متاحة. يرجى إنشاء PostgreSQL Database أولاً');
        }

        // إدراج البيانات التجريبية إذا كانت قاعدة البيانات فارغة
        await seedDatabase();

        // جلب البيانات من قاعدة البيانات
        employeesData = await fetchEmployees();
        filteredData = [...employeesData];

        if (employeesData.length === 0) {
            showMessage('لا توجد بيانات في قاعدة البيانات', 'error');
            return;
        }

        populateDepartmentFilter();
        updateDashboard();

        showMessage(`تم تحميل ${employeesData.length} موظف بنجاح!`, 'success');
    } catch (error) {
        console.error('خطأ تفصيلي في تحميل البيانات:', error);
        showMessage(`خطأ في تحميل البيانات: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Show/hide loading spinner
function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
}

// Show message function
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background: ${type === 'success' ? '#48bb78' : '#f56565'};
        color: white;
        z-index: 1000;
        font-family: Cairo, sans-serif;
    `;

    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

// Populate department filter
function populateDepartmentFilter() {
    const departmentSelect = document.getElementById('departmentFilter');

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
            // البحث عن معرف القسم (هذا مبسط للتوضيح)
            filters.departmentName = department;
        }

        employeesData = await fetchEmployees(filters);
        filteredData = [...employeesData];

        updateDashboard();
        showMessage('تم تطبيق الفلاتر بنجاح!', 'success');
    } catch (error) {
        showMessage('خطأ في تطبيق الفلاتر', 'error');
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
        if (!stats) return;

        const activeEmployees = filteredData.filter(emp => emp.is_active);
        const totalEmployees = activeEmployees.length;

        // حساب معدل دوران الموظفين
        const turnoverRate = stats.turnover.total_employees > 0 
            ? ((stats.turnover.left_employees / stats.turnover.total_employees) * 100).toFixed(1)
            : 0;

        // حساب نسبة الغياب
        const avgAbsence = stats.active.avg_absence 
            ? (parseFloat(stats.active.avg_absence) / 250 * 100).toFixed(1)
            : 0;

        // حساب متوسط سنوات الخبرة
        const avgExperience = totalEmployees > 0 ? (activeEmployees.reduce((sum, emp) => {
            const hireDate = new Date(emp.hire_date);
            const years = (new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365);
            return sum + years;
        }, 0) / totalEmployees).toFixed(1) : 0;

        document.getElementById('totalEmployees').textContent = totalEmployees;
        document.getElementById('turnoverRate').textContent = turnoverRate + '%';
        document.getElementById('absenceRate').textContent = avgAbsence + '%';
        document.getElementById('avgExperience').textContent = avgExperience;
    } catch (error) {
        console.error('خطأ في تحديث المؤشرات:', error);
    }
}

// Update charts
function updateCharts() {
    updateDepartmentChart();
    updateEducationChart();
    updateHiringTrendChart();
    updateAgeDistributionChart();
    updateGenderChart();
}

// Department distribution chart
function updateDepartmentChart() {
    const ctx = document.getElementById('departmentChart').getContext('2d');

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
    const ctx = document.getElementById('educationChart').getContext('2d');

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
    const ctx = document.getElementById('hiringTrendChart').getContext('2d');

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

    charts.hiringTrend = new Chart(ctx, {
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
    const ctx = document.getElementById('ageDistributionChart').getContext('2d');

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
    Object.keys(deptStats).forEach(dept => {
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
    const ctx = document.getElementById('genderChart').getContext('2d');

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
    tbody.innerHTML = '';

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
            showMessage('تم إضافة الموظف بنجاح!', 'success');
            loadData(); // إعادة تحميل البيانات
        })
        .catch(() => {
            showMessage('خطأ في إضافة الموظف', 'error');
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeDashboard);