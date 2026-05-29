/* ==========================================
   HR PAYROLL DATA LAYER (LOCAL STORAGE STORE)
   ========================================== */

const Store = {
    // Khóa lưu trữ
    KEYS: {
        EMPLOYEES: 'hr_payroll_employees',
        ATTENDANCE: 'hr_payroll_attendance',
        LEAVES: 'hr_payroll_leaves',
        SETTINGS: 'hr_payroll_settings',
        ACTIVITIES: 'hr_payroll_activities',
        ADJUSTMENTS: 'hr_payroll_adjustments'
    },

    // Cấu hình mặc định
    DEFAULT_SETTINGS: {
        standardWorkDays: 26,
        standardWorkHours: 8,
        overtimeRates: {
            normal: 1.5,
            weekend: 2.0,
            holiday: 3.0
        },
        insurance: {
            social: 8,       // 8% BHXH
            health: 1.5,     // 1.5% BHYT
            unemployment: 1  // 1% BHTN
        },
        pitSelf: 11000000,    // Giảm trừ bản thân: 11tr
        pitDependent: 4400000, // Giảm trừ người phụ thuộc: 4.4tr
        customColumns: [
            { id: 'col_allowance_lunch', name: 'Phụ cấp ăn trưa', type: 'allowance', taxable: false, insurance: false },
            { id: 'col_allowance_transport', name: 'Phụ cấp đi lại', type: 'allowance', taxable: true, insurance: false },
            { id: 'col_allowance_phone', name: 'Phụ cấp điện thoại', type: 'allowance', taxable: true, insurance: false }
        ],
        // Cấu trúc lương 3P Low-Code mặc định theo từng phòng ban
        salaryStructures: {
            "Kỹ thuật - IT": { useP1: true, useKPI: true, kpiWeight: 100, useSales: false, salesWeight: 0, targetKPI: 5000000 },
            "Hành chính - Nhân sự": { useP1: true, useKPI: true, kpiWeight: 100, useSales: false, salesWeight: 0, targetKPI: 3000000 },
            "Kinh doanh": { useP1: true, useKPI: true, kpiWeight: 30, useSales: true, salesWeight: 70, targetKPI: 2000000 },
            "Marketing": { useP1: true, useKPI: true, kpiWeight: 50, useSales: true, salesWeight: 50, targetKPI: 3000000 },
            "Kế toán": { useP1: true, useKPI: true, kpiWeight: 100, useSales: false, salesWeight: 0, targetKPI: 2000000 }
        }
    },

    // Dữ liệu nhân viên mẫu khởi tạo
    DEFAULT_EMPLOYEES: [
        {
            id: 'emp_1',
            employeeCode: 'NV001',
            cccd: '037096001231',
            name: 'Nguyễn Văn Anh',
            department: 'Kỹ thuật - IT',
            position: 'Lập trình viên Senior',
            baseSalary: 25000000,
            insuranceSalary: 25000000,
            dependents: 1,
            bankAccount: '190345678901 - Techcombank',
            startDate: '2023-01-15',
            status: 'active',
            customValues: {
                col_allowance_lunch: 730000,
                col_allowance_transport: 500000,
                col_allowance_phone: 200000
            }
        },
        {
            id: 'emp_2',
            employeeCode: 'NV002',
            cccd: '037096001232',
            name: 'Trần Thị Bình',
            department: 'Hành chính - Nhân sự',
            position: 'Trưởng phòng HR',
            baseSalary: 18000000,
            insuranceSalary: 18000000,
            dependents: 2,
            bankAccount: '001100445566 - Vietcombank',
            startDate: '2022-06-10',
            status: 'active',
            customValues: {
                col_allowance_lunch: 730000,
                col_allowance_transport: 300000,
                col_allowance_phone: 500000
            }
        },
        {
            id: 'emp_3',
            employeeCode: 'NV003',
            cccd: '037096001233',
            name: 'Lê Minh Cường',
            department: 'Kinh doanh',
            position: 'Chuyên viên kinh doanh',
            baseSalary: 10000000,
            insuranceSalary: 6000000, // Đóng bảo hiểm theo mức tối thiểu vùng
            dependents: 0,
            bankAccount: '10287654321 - Vietinbank',
            startDate: '2024-02-01',
            status: 'active',
            customValues: {
                col_allowance_lunch: 730000,
                col_allowance_transport: 1000000,
                col_allowance_phone: 300000
            }
        },
        {
            id: 'emp_4',
            employeeCode: 'NV004',
            cccd: '037096001234',
            name: 'Phạm Hồng Duy',
            department: 'Marketing',
            position: 'Designer',
            baseSalary: 14000000,
            insuranceSalary: null,
            dependents: 0,
            bankAccount: '1903888777 - Techcombank',
            startDate: '2025-03-20',
            status: 'active',
            customValues: {
                col_allowance_lunch: 730000,
                col_allowance_transport: 500000,
                col_allowance_phone: 200000
            }
        }
    ],

    // Khởi tạo kho dữ liệu ban đầu
    init() {
        if (!localStorage.getItem(this.KEYS.SETTINGS)) {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(this.DEFAULT_SETTINGS));
        } else {
            // Đảm bảo cập nhật structures mới nếu đã có cấu hình cũ
            const settings = JSON.parse(localStorage.getItem(this.KEYS.SETTINGS));
            if (!settings.salaryStructures) {
                settings.salaryStructures = this.DEFAULT_SETTINGS.salaryStructures;
                localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            }
        }

        if (!localStorage.getItem(this.KEYS.EMPLOYEES)) {
            localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(this.DEFAULT_EMPLOYEES));
            this.addActivity('Hệ thống khởi tạo dữ liệu nhân viên mẫu nâng cao thành công.', 'success');
        }
        if (!localStorage.getItem(this.KEYS.ATTENDANCE)) {
            localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.LEAVES)) {
            localStorage.setItem(this.KEYS.LEAVES, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.ADJUSTMENTS)) {
            localStorage.setItem(this.KEYS.ADJUSTMENTS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.ACTIVITIES)) {
            localStorage.setItem(this.KEYS.ACTIVITIES, JSON.stringify([]));
        }
    },

    // ==========================================
    // EMPLOYEES API
    // ==========================================
    getEmployees() {
        return JSON.parse(localStorage.getItem(this.KEYS.EMPLOYEES)) || [];
    },

    saveEmployee(employee) {
        const employees = this.getEmployees();
        if (employee.id) {
            const idx = employees.findIndex(e => e.id === employee.id);
            if (idx !== -1) {
                employees[idx] = employee;
                localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(employees));
                this.addActivity(`Đã cập nhật thông tin nhân viên ${employee.name} (${employee.employeeCode}).`, 'info', 'employee');
                return true;
            }
        } else {
            employee.id = Utils.generateId();
            if (employees.some(e => e.employeeCode === employee.employeeCode)) {
                throw new Error('Mã nhân viên đã tồn tại trên hệ thống!');
            }
            if (employees.some(e => e.cccd === employee.cccd)) {
                throw new Error('Số CCCD đã được đăng ký bởi nhân viên khác!');
            }
            employees.push(employee);
            localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(employees));
            this.addActivity(`Đã thêm nhân viên mới ${employee.name} (${employee.employeeCode}).`, 'success', 'employee');
            return true;
        }
        return false;
    },

    deleteEmployee(id) {
        const employees = this.getEmployees();
        const emp = employees.find(e => e.id === id);
        if (emp) {
            const filtered = employees.filter(e => e.id !== id);
            localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(filtered));
            this.addActivity(`Đã xóa nhân viên ${emp.name} khỏi hệ thống.`, 'danger', 'employee');
            
            const adjusts = this.getAllAdjustments();
            const filteredAdjusts = adjusts.filter(a => a.employeeId !== id);
            localStorage.setItem(this.KEYS.ADJUSTMENTS, JSON.stringify(filteredAdjusts));
            
            return true;
        }
        return false;
    },

    // ==========================================
    // ATTENDANCE API
    // ==========================================
    getAttendance(month = null) {
        const attendance = JSON.parse(localStorage.getItem(this.KEYS.ATTENDANCE)) || [];
        if (!month) return attendance;
        return attendance.filter(att => att.date.substring(0, 7) === month);
    },

    saveAttendance(att) {
        const attendance = JSON.parse(localStorage.getItem(this.KEYS.ATTENDANCE)) || [];
        const employees = this.getEmployees();
        const emp = employees.find(e => e.id === att.employeeId);
        const empName = emp ? emp.name : 'Unknown';

        if (att.id) {
            const idx = attendance.findIndex(a => a.id === att.id);
            if (idx !== -1) {
                attendance[idx] = att;
                localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify(attendance));
                this.addActivity(`Đã sửa đổi bản ghi chấm công ngày ${Utils.formatDate(att.date)} của ${empName}.`, 'info', 'attendance');
                return true;
            }
        } else {
            att.id = Utils.generateId();
            const isDup = attendance.some(a => a.employeeId === att.employeeId && a.date === att.date);
            if (isDup) {
                throw new Error(`Nhân viên đã có dữ liệu chấm công cho ngày ${Utils.formatDate(att.date)}!`);
            }
            attendance.push(att);
            localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify(attendance));
            this.addActivity(`Đã thêm chấm công ngày ${Utils.formatDate(att.date)} cho ${empName}.`, 'success', 'attendance');
            return true;
        }
        return false;
    },

    deleteAttendance(id) {
        const attendance = JSON.parse(localStorage.getItem(this.KEYS.ATTENDANCE)) || [];
        const att = attendance.find(a => a.id === id);
        if (att) {
            const employees = this.getEmployees();
            const emp = employees.find(e => e.id === att.employeeId);
            const empName = emp ? emp.name : 'Nhân viên';
            
            const filtered = attendance.filter(a => a.id !== id);
            localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify(filtered));
            this.addActivity(`Đã xóa chấm công ngày ${Utils.formatDate(att.date)} của ${empName}.`, 'danger', 'attendance');
            return true;
        }
        return false;
    },

    // ==========================================
    // LEAVES API
    // ==========================================
    getLeaves(month = null) {
        const leaves = JSON.parse(localStorage.getItem(this.KEYS.LEAVES)) || [];
        if (!month) return leaves;
        return leaves.filter(l => {
            return l.startDate.substring(0, 7) === month || l.endDate.substring(0, 7) === month;
        });
    },

    saveLeave(leave) {
        const leaves = JSON.parse(localStorage.getItem(this.KEYS.LEAVES)) || [];
        const employees = this.getEmployees();
        const emp = employees.find(e => e.id === leave.employeeId);
        const empName = emp ? emp.name : 'Unknown';

        if (leave.id) {
            const idx = leaves.findIndex(l => l.id === leave.id);
            if (idx !== -1) {
                leaves[idx] = leave;
                localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(leaves));
                this.addActivity(`Đã cập nhật đơn phép của ${empName} (${Utils.formatDate(leave.startDate)}).`, 'info', 'leave');
                return true;
            }
        } else {
            leave.id = Utils.generateId();
            leaves.push(leave);
            localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(leaves));
            this.addActivity(`Đăng ký đơn xin nghỉ mới cho ${empName} (${Utils.formatDate(leave.startDate)}).`, 'success', 'leave');
            return true;
        }
        return false;
    },

    deleteLeave(id) {
        const leaves = JSON.parse(localStorage.getItem(this.KEYS.LEAVES)) || [];
        const leave = leaves.find(l => l.id === id);
        if (leave) {
            const employees = this.getEmployees();
            const emp = employees.find(e => e.id === leave.employeeId);
            const empName = emp ? emp.name : 'Nhân viên';
            
            const filtered = leaves.filter(l => l.id !== id);
            localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(filtered));
            this.addActivity(`Đã xóa đơn phép từ ${Utils.formatDate(leave.startDate)} của ${empName}.`, 'danger', 'leave');
            return true;
        }
        return false;
    },

    // ==========================================
    // PAYROLL ADJUSTMENTS (ĐIỀU CHỈNH THÁNG & LƯU KPI/DOANH SỐ THÁNG) API
    // ==========================================
    getAllAdjustments() {
        return JSON.parse(localStorage.getItem(this.KEYS.ADJUSTMENTS)) || [];
    },

    getAdjustments(month) {
        const adjusts = this.getAllAdjustments();
        return adjusts.filter(a => a.month === month);
    },

    saveAdjustment(adj) {
        const adjusts = this.getAllAdjustments();
        const idx = adjusts.findIndex(a => a.employeeId === adj.employeeId && a.month === adj.month);
        
        if (idx !== -1) {
            // Giữ lại các giá trị cũ của các trường khác nếu có
            adjusts[idx] = { ...adjusts[idx], ...adj };
        } else {
            adj.id = Utils.generateId();
            adjusts.push(adj);
        }
        
        localStorage.setItem(this.KEYS.ADJUSTMENTS, JSON.stringify(adjusts));
        const employees = this.getEmployees();
        const emp = employees.find(e => e.id === adj.employeeId);
        const name = emp ? emp.name : 'Nhân viên';
        return true;
    },

    // ==========================================
    // SETTINGS API
    // ==========================================
    getSettings() {
        return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) || this.DEFAULT_SETTINGS;
    },

    saveSettings(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
        this.addActivity('Cấu hình tính lương, bảo hiểm, cột động và 3P đã được cập nhật.', 'success', 'settings');
        return true;
    },

    // ==========================================
    // ACTIVITIES LOG API
    // ==========================================
    getActivities() {
        return JSON.parse(localStorage.getItem(this.KEYS.ACTIVITIES)) || [];
    },

    addActivity(text, type = 'success', category = 'system', user = 'Admin Pro 3P') {
        const activities = this.getActivities();
        const activity = {
            id: Utils.generateId(),
            text,
            type,
            category,
            user,
            time: new Date().toISOString()
        };
        activities.unshift(activity);
        localStorage.setItem(this.KEYS.ACTIVITIES, JSON.stringify(activities.slice(0, 5000)));
        if (typeof window.onActivityAdded === 'function') {
            window.onActivityAdded(activity);
        }
    },

    clearActivities() {
        localStorage.setItem(this.KEYS.ACTIVITIES, JSON.stringify([]));
        this.addActivity('Đã xóa toàn bộ lịch sử nhật ký hoạt động hệ thống.', 'danger', 'system');
        return true;
    }
};

// Khởi động lưu trữ
Store.init();
