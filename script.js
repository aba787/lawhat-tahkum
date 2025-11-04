
// Global variables
let employeesData = [];
let filteredData = [];
let charts = {};

// Mock data generator
function generateMockData() {
    const departments = ['المبيعات', 'التسويق', 'الموارد البشرية', 'تكنولوجيا المعلومات', 'المحاسبة', 'العمليات'];
    const positions = ['مدير', 'نائب مدير', 'رئيس قسم', 'أخصائي أول', 'أخصائي', 'موظف'];
    const educationLevels = ['دكتوراه', 'ماجستير', 'بكالوريوس', 'دبلوم', 'ثانوية عامة'];
    const names = ['أحمد محمد', 'فاطمة علي', 'محمود حسن', 'نورا سعد', 'خالد أحمد', 'سارة محمد', 'عبدالله خالد', 'منى حسام', 'يوسف عبدالله', 'ريم محمود'];
    
    const data = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < 150; i++) {
        const hireDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28));
        const age = 25 + Math.floor(Math.random() * 25);
        
        data.push({
            id: i + 1,
            name: names[Math.floor(Math.random() * names.length)] + ' ' + (i + 1),
            department: departments[Math.floor(Math.random() * departments.length)],
            position: positions[Math.floor(Math.random() * positions.length)],
            hireDate: hireDate,
            education: educationLevels[Math.floor(Math.random() * educationLevels.length)],
            age: age,
            salary: 3000 + Math.floor(Math.random() * 12000),
            gender: Math.random() > 0.6 ? 'ذكر' : 'أنثى',
            isActive: Math.random() > 0.1,
            absenceDays: Math.floor(Math.random() * 30)
        });
    }
    
    return data;
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
}

// Load data function
async function loadData() {
    showLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    employeesData = generateMockData();
    filteredData = [...employeesData];
    
    populateDepartmentFilter();
    updateDashboard();
    
    showLoading(false);
}

// Show/hide loading spinner
function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
}

// Populate department filter
function populateDepartmentFilter() {
    const departmentSelect = document.getElementById('departmentFilter');
    const departments = [...new Set(employeesData.map(emp => emp.department))];
    
    departmentSelect.innerHTML = '<option value="">جميع الأقسام</option>';
    departments.forEach(dept => {
        departmentSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
}

// Apply filters
function applyFilters() {
    const dateFrom = new Date(document.getElementById('dateFrom').value);
    const dateTo = new Date(document.getElementById('dateTo').value);
    const department = document.getElementById('departmentFilter').value;
    
    filteredData = employeesData.filter(emp => {
        const empDate = new Date(emp.hireDate);
        const dateMatch = (!document.getElementById('dateFrom').value || empDate >= dateFrom) &&
                         (!document.getElementById('dateTo').value || empDate <= dateTo);
        const deptMatch = !department || emp.department === department;
        
        return dateMatch && deptMatch;
    });
    
    updateDashboard();
}

// Update dashboard
function updateDashboard() {
    updateKPIs();
    updateCharts();
    updateTable();
}

// Update KPIs
function updateKPIs() {
    const activeEmployees = filteredData.filter(emp => emp.isActive);
    const totalEmployees = activeEmployees.length;
    const leftEmployees = filteredData.filter(emp => !emp.isActive).length;
    
    const turnoverRate = totalEmployees > 0 ? ((leftEmployees / (totalEmployees + leftEmployees)) * 100).toFixed(1) : 0;
    const avgAbsence = totalEmployees > 0 ? (activeEmployees.reduce((sum, emp) => sum + emp.absenceDays, 0) / totalEmployees / 250 * 100).toFixed(1) : 0;
    const avgExperience = totalEmployees > 0 ? (activeEmployees.reduce((sum, emp) => {
        const years = (new Date() - new Date(emp.hireDate)) / (1000 * 60 * 60 * 24 * 365);
        return sum + years;
    }, 0) / totalEmployees).toFixed(1) : 0;
    
    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('turnoverRate').textContent = turnoverRate + '%';
    document.getElementById('absenceRate').textContent = avgAbsence + '%';
    document.getElementById('avgExperience').textContent = avgExperience;
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
    
    const activeEmployees = filteredData.filter(emp => emp.isActive);
    const deptData = {};
    
    activeEmployees.forEach(emp => {
        deptData[emp.department] = (deptData[emp.department] || 0) + 1;
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
    
    const activeEmployees = filteredData.filter(emp => emp.isActive);
    const eduData = {};
    
    activeEmployees.forEach(emp => {
        eduData[emp.education] = (eduData[emp.education] || 0) + 1;
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
        const date = new Date(emp.hireDate);
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
    
    const activeEmployees = filteredData.filter(emp => emp.isActive);
    const ageGroups = {
        '20-29': 0,
        '30-39': 0,
        '40-49': 0,
        '50+': 0
    };
    
    activeEmployees.forEach(emp => {
        if (emp.age >= 20 && emp.age <= 29) ageGroups['20-29']++;
        else if (emp.age >= 30 && emp.age <= 39) ageGroups['30-39']++;
        else if (emp.age >= 40 && emp.age <= 49) ageGroups['40-49']++;
        else ageGroups['50+']++;
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

// Gender distribution chart
function updateGenderChart() {
    const ctx = document.getElementById('genderChart').getContext('2d');
    
    if (charts.gender) {
        charts.gender.destroy();
    }
    
    const activeEmployees = filteredData.filter(emp => emp.isActive);
    const genderData = {};
    
    activeEmployees.forEach(emp => {
        genderData[emp.gender] = (genderData[emp.gender] || 0) + 1;
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
    
    const activeEmployees = filteredData.filter(emp => emp.isActive).slice(0, 20);
    
    activeEmployees.forEach(emp => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${emp.name}</td>
            <td>${emp.department}</td>
            <td>${emp.position}</td>
            <td>${emp.hireDate.toLocaleDateString('ar-SA')}</td>
            <td>${emp.education}</td>
            <td>${emp.age}</td>
            <td>${emp.salary.toLocaleString()} ريال</td>
        `;
    });
}

// Export report
function exportReport() {
    const reportData = {
        totalEmployees: filteredData.filter(emp => emp.isActive).length,
        departmentDistribution: {},
        educationDistribution: {},
        timestamp: new Date().toLocaleString('ar-SA')
    };
    
    // Calculate distributions
    filteredData.filter(emp => emp.isActive).forEach(emp => {
        reportData.departmentDistribution[emp.department] = 
            (reportData.departmentDistribution[emp.department] || 0) + 1;
        reportData.educationDistribution[emp.education] = 
            (reportData.educationDistribution[emp.education] || 0) + 1;
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
