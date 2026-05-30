/* ==========================================
   HR PAYROLL MAIN APPLICATION CONTROLLER
   ========================================== */

const App = {
    dashboardChart: null,

    init() {
        this.cacheDOM();
        this.bindEvents();
        
        // Khởi tạo các module con
        EmployeesModule.init();
        AttendanceModule.init();
        LeaveModule.init();
        PayrollModule.init();
        ReportsModule.init();
        SettingsModule.init();
        AuditLogModule.init();

        // Tạo dữ liệu chấm công & phép mẫu nếu là lần đầu tiên chạy ứng dụng
        this.generateMockDataIfNeeded();

        // Khởi động view đầu tiên (Dashboard)
        this.handleNavigation('dashboard');
        this.updateHeaderDate();
        this.refreshDashboard();

        // Đăng ký callback theo dõi hoạt động gần đây để tự cập nhật UI
        window.onActivityAdded = (activity) => {
            this.appendActivityToTimeline(activity);
            this.refreshDashboardCountersOnly();
        };

        // Render toàn bộ lịch sử hoạt động ban đầu
        this.renderActivityTimeline();
    },

    cacheDOM() {
        this.menuItems = document.querySelectorAll('.menu-item');
        this.viewSections = document.querySelectorAll('.view-section');
        this.pageTitle = document.getElementById('page-title');
        this.pageSubtitle = document.getElementById('page-subtitle');
        this.headerDate = document.getElementById('header-date');
        
        // Dashboard counters
        this.dashTotalEmp = document.getElementById('dash-total-employees');
        this.dashAttToday = document.getElementById('dash-attendance-today');
        this.dashLeaveToday = document.getElementById('dash-leave-today');
        this.dashTotalPay = document.getElementById('dash-total-payroll');
        this.timelineContainer = document.getElementById('dashboard-recent-activities');
    },

    bindEvents() {
        // Điều hướng Menu Sidebar chính
        this.menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.dataset.target;
                
                this.menuItems.forEach(m => m.classList.remove('active'));
                item.classList.add('active');

                // Khi click vào Tính lương 3P từ sidebar chính, mặc định kích hoạt mục KPI
                if (target === 'payroll') {
                    const firstSub = document.querySelector('.submenu-item[data-subtarget="kpi"]');
                    if (firstSub) {
                        const submenuItems = document.querySelectorAll('.submenu-item');
                        submenuItems.forEach(sm => sm.classList.remove('active'));
                        firstSub.classList.add('active');
                    }
                    this.handleNavigation('payroll');
                    PayrollModule.switchSubTab('kpi');
                } else {
                    this.handleNavigation(target);
                }
            });
        });

        // Điều hướng Menu Sidebar dọc con (Submenu) của Tính lương 3P
        const submenuItems = document.querySelectorAll('.submenu-item');
        submenuItems.forEach(subItem => {
            subItem.addEventListener('click', (e) => {
                e.preventDefault();
                const subtarget = subItem.dataset.subtarget;
                
                // Active main menu item "Tính lương 3P"
                const parentMenuItem = document.getElementById('menu-payroll-parent');
                if (parentMenuItem) {
                    this.menuItems.forEach(m => m.classList.remove('active'));
                    parentMenuItem.classList.add('active');
                }

                // Active submenu item
                submenuItems.forEach(sm => sm.classList.remove('active'));
                subItem.classList.add('active');

                // Switch main view
                this.handleNavigation('payroll');
                
                // Switch subtab (scroll và render)
                PayrollModule.switchSubTab(subtarget);
            });
        });

        // Mobile Hamburger & Overlay events
        const btnToggle = document.getElementById('btn-mobile-menu-toggle');
        const overlay = document.getElementById('sidebar-overlay');
        const sidebar = document.querySelector('.sidebar');

        if (btnToggle && overlay && sidebar) {
            btnToggle.addEventListener('click', () => {
                sidebar.classList.add('active');
                overlay.classList.add('active');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });

            // Tự động đóng sidebar trượt khi click chuyển trang trên điện thoại
            const allNavLinks = document.querySelectorAll('.menu-item, .submenu-item');
            allNavLinks.forEach(link => {
                link.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            });
        }
    },

    handleNavigation(target) {
        this.viewSections.forEach(section => {
            section.classList.remove('active');
        });

        let targetSection;
        if (target === 'payroll') {
            const activeSub = (typeof PayrollModule !== 'undefined' && PayrollModule.currentSubTab) ? PayrollModule.currentSubTab : 'kpi';
            targetSection = document.getElementById(`view-payroll-${activeSub}`);
        } else {
            targetSection = document.getElementById(`view-${target}`);
        }

        if (targetSection) {
            targetSection.classList.add('active');
        }

        const titles = {
            dashboard: { title: 'Tổng quan hệ thống', sub: 'Thống kê và hoạt động tháng này' },
            employees: { title: 'Quản lý nhân sự', sub: 'Hồ sơ nhân viên, CCCD và thông tin giảm trừ' },
            attendance: { title: 'Bảng công tháng', sub: 'Kiểm tra giờ vào/ra, tính giờ làm thêm OT' },
            leave: { title: 'Đơn xin nghỉ & Online', sub: 'Phê duyệt phép năm, nghỉ ốm, và làm tại nhà remote' },
            payroll: { title: 'Tính toán lương tự động', sub: 'Kế thừa hồ sơ cố định, cho phép điều chỉnh thu nhập theo tháng' },
            reports: { title: 'Biểu đồ báo cáo & Quyết toán', sub: 'Phân tích chi phí quỹ lương và quyết toán thuế TNCN gộp cả năm' },
            'audit-log': { title: 'Nhật ký kiểm toán hệ thống', sub: 'Theo dõi lịch sử chỉnh sửa dữ liệu, công thức, và thao tác vận hành lương 3P' },
            settings: { title: 'Cấu hình hệ thống', sub: 'Thiết lập quy chế tính lương, OT, bảo hiểm và Cột lương động' }
        };

        if (titles[target]) {
            this.pageTitle.innerText = titles[target].title;
            this.pageSubtitle.innerText = titles[target].sub;
        }

        // Tự động hiển thị/ẩn menu con của Tính Lương 3P
        const payrollSubmenu = document.getElementById('payroll-submenu');
        if (payrollSubmenu) {
            payrollSubmenu.style.display = (target === 'payroll') ? 'flex' : 'none';
        }

        this.refreshViewData(target);
    },

    refreshViewData(target) {
        if (target === 'dashboard') {
            this.refreshDashboard();
        } else if (target === 'employees') {
            EmployeesModule.render();
        } else if (target === 'attendance') {
            AttendanceModule.render();
        } else if (target === 'leave') {
            LeaveModule.render();
        } else if (target === 'payroll') {
            // Không tự động đè switchSubTab nữa để giữ lại sub-tab được click
            PayrollModule.calculateAndRender();
        } else if (target === 'reports') {
            ReportsModule.switchTab('charts');
        } else if (target === 'settings') {
            SettingsModule.loadSettings();
            SettingsModule.renderCustomColumns();
            SettingsModule.renderSalaryStructures();
        } else if (target === 'audit-log') {
            AuditLogModule.render();
        }
    },

    refreshAllData() {
        const activeItem = document.querySelector('.menu-item.active');
        if (activeItem) {
            this.refreshViewData(activeItem.dataset.target);
        }
    },

    updateHeaderDate() {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        this.headerDate.innerText = `${dd}/${mm}/${yyyy}`;
    },

    // Khởi tạo chấm công & phép mẫu tháng hiện tại
    generateMockDataIfNeeded() {
        const attendance = Store.getAttendance();
        const leaves = Store.getLeaves();
        
        if (attendance.length > 0 || leaves.length > 0) return;

        const employees = Store.getEmployees();
        const now = new Date();
        const year = now.getFullYear();
        const monthStr = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // 1. Tạo đơn phép mẫu
        const mockLeaves = [
            {
                id: 'leave_m1',
                employeeId: 'emp_2', // Trần Thị Bình
                type: 'annual_leave',
                startDate: `${monthStr}-05`,
                endDate: `${monthStr}-05`,
                status: 'approved',
                approvedBy: 'GĐ Nhân Sự',
                reason: 'Nghỉ giải quyết việc gia đình'
            },
            {
                id: 'leave_m2',
                employeeId: 'emp_1', // Nguyễn Văn Anh
                type: 'remote_work',
                startDate: `${monthStr}-12`,
                endDate: `${monthStr}-14`,
                status: 'approved',
                approvedBy: 'Trưởng phòng IT',
                reason: 'Làm việc từ xa do gia đình có giỗ'
            }
        ];
        localStorage.setItem(Store.KEYS.LEAVES, JSON.stringify(mockLeaves));

        // 2. Tạo chấm công mẫu cho 8 ngày đầu tháng
        const mockAttendance = [];
        employees.forEach(emp => {
            for (let day = 1; day <= 8; day++) {
                const dayStr = String(day).padStart(2, '0');
                const currentDate = `${monthStr}-${dayStr}`;
                const dateObj = new Date(currentDate);
                const dayOfWeek = dateObj.getDay();

                if (dayOfWeek === 0) continue; // Bỏ qua Chủ nhật

                let checkIn = '08:00';
                let checkOut = '17:00';
                let ot = 0;
                let status = 'full';
                let note = 'Công thường';

                if (emp.id === 'emp_1' && day === 3) {
                    checkIn = '08:45';
                    note = 'Đi trễ do hỏng xe';
                }
                if (emp.id === 'emp_3' && day === 4) {
                    checkOut = '19:00';
                    ot = 2;
                    note = 'OT 2h hỗ trợ khách hàng';
                }

                if (emp.id === 'emp_2' && day === 5) {
                    continue; 
                }

                if (emp.id === 'emp_1' && day >= 12 && day <= 14) {
                    note = 'Làm online từ xa';
                }

                mockAttendance.push({
                    id: `att_${emp.id}_${day}`,
                    employeeId: emp.id,
                    date: currentDate,
                    checkIn,
                    checkOut,
                    workHours: Utils.calculateHours(checkIn, checkOut),
                    overtimeHours: ot,
                    status,
                    note
                });
            }
        });

        localStorage.setItem(Store.KEYS.ATTENDANCE, JSON.stringify(mockAttendance));
        Store.addActivity('Tự động khởi tạo dữ liệu chấm công và đơn xin phép mẫu tương thích.', 'success');
    },

    refreshDashboard() {
        const employees = Store.getEmployees();
        const activeEmp = employees.filter(e => e.status === 'active');
        
        this.dashTotalEmp.innerText = activeEmp.length;

        const todayStr = new Date().toISOString().substring(0, 10);
        const todayAtt = Store.getAttendance().filter(a => a.date === todayStr);
        this.dashAttToday.innerText = todayAtt.length;

        const todayLeaves = Store.getLeaves().filter(l => {
            return l.status === 'approved' && todayStr >= l.startDate && todayStr <= l.endDate;
        });
        this.dashLeaveToday.innerText = todayLeaves.length;

        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Gọi Payroll Module để tính lương dự kiến
        const payrollData = PayrollModule.calculatePayrollData(monthStr);
        const totalNet = payrollData.reduce((sum, p) => sum + p.netSalary, 0);
        this.dashTotalPay.innerText = Utils.formatVND(totalNet);

        this.renderDashboardChart(activeEmp);
    },

    refreshDashboardCountersOnly() {
        const employees = Store.getEmployees().filter(e => e.status === 'active');
        this.dashTotalEmp.innerText = employees.length;

        const todayStr = new Date().toISOString().substring(0, 10);
        const todayAtt = Store.getAttendance().filter(a => a.date === todayStr);
        this.dashAttToday.innerText = todayAtt.length;

        const todayLeaves = Store.getLeaves().filter(l => {
            return l.status === 'approved' && todayStr >= l.startDate && todayStr <= l.endDate;
        });
        this.dashLeaveToday.innerText = todayLeaves.length;

        const monthStr = todayStr.substring(0, 7);
        const payrollData = PayrollModule.calculatePayrollData(monthStr);
        const totalNet = payrollData.reduce((sum, p) => sum + p.netSalary, 0);
        this.dashTotalPay.innerText = Utils.formatVND(totalNet);
    },

    renderDashboardChart(employees) {
        const deptCounts = {};
        employees.forEach(emp => {
            if (!deptCounts[emp.department]) {
                deptCounts[emp.department] = 0;
            }
            deptCounts[emp.department]++;
        });

        const labels = Object.keys(deptCounts);
        const values = Object.values(deptCounts);

        if (this.dashboardChart) {
            this.dashboardChart.destroy();
        }

        const ctx = document.getElementById('dashboardChart').getContext('2d');
        
        if (labels.length === 0) {
            ctx.clearRect(0, 0, 400, 400);
            return;
        }

        this.dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số lượng nhân sự',
                    data: values,
                    backgroundColor: 'rgba(9, 132, 227, 0.7)',
                    borderColor: '#0984e3',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#a4b0be', stepSize: 1 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#a4b0be' }
                    }
                }
            }
        });
    },

    renderActivityTimeline() {
        const activities = Store.getActivities();
        this.timelineContainer.innerHTML = '';

        if (activities.length === 0) {
            this.timelineContainer.innerHTML = '<p class="empty-state">Không có hoạt động gần đây.</p>';
            return;
        }

        activities.forEach(activity => {
            this.appendActivityToTimeline(activity, false);
        });
    },

    appendActivityToTimeline(activity, isPrepend = true) {
        const emptyState = this.timelineContainer.querySelector('.empty-state');
        if (emptyState) {
            this.timelineContainer.innerHTML = '';
        }

        const timeStr = new Date(activity.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        let dotColorClass = 'info';
        if (activity.type === 'success') dotColorClass = 'success';
        if (activity.type === 'danger') dotColorClass = 'danger';
        if (activity.type === 'warning') dotColorClass = 'warning';

        item.innerHTML = `
            <div class="timeline-dot ${dotColorClass}"></div>
            <div class="timeline-content">
                <p class="timeline-text">${activity.text}</p>
                <span class="timeline-time">${timeStr} hôm nay</span>
            </div>
        `;

        if (isPrepend) {
            this.timelineContainer.insertBefore(item, this.timelineContainer.firstChild);
        } else {
            this.timelineContainer.appendChild(item);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
    lucide.createIcons();
});
