/* ==========================================
   HR PAYROLL PAYROLL 3P MODULE
   ========================================== */

const PayrollModule = {
    currentSubTab: 'kpi', // 'kpi' | 'sales' | 'consolidated'

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.setDefaultMonth();
        this.calculateAndRender();
    },

    // Getter/Setter đồng bộ hóa toàn bộ bộ chọn tháng trên 3 trang lương khác nhau
    get currentMonth() {
        const picker = document.querySelector('.payroll-month-picker');
        return picker ? picker.value : '2026-05';
    },

    set currentMonth(val) {
        document.querySelectorAll('.payroll-month-picker').forEach(p => {
            p.value = val;
        });
    },

    cacheDOM() {
        this.viewSection = document.getElementById('view-payroll-kpi'); // Tương thích với view mặc định
        this.tableHeader = document.getElementById('header-payroll-table');
        this.tableBody = document.querySelector('#table-payroll tbody');
        
        // Multi Month Pickers
        this.monthPickers = document.querySelectorAll('.payroll-month-picker');
        this.btnCalculates = document.querySelectorAll('.btn-calculate-payroll-trigger');
        this.btnExports = document.querySelectorAll('.btn-export-payroll-trigger');
        
        // Sub-tabs (mock để tránh lỗi script do bị xóa trong index.html)
        this.btnTabKPI = document.createElement('button');
        this.btnTabSales = document.createElement('button');
        this.btnTabConsolidated = document.createElement('button');
        
        this.subviewKPI = document.getElementById('view-payroll-kpi');
        this.subviewSales = document.getElementById('view-payroll-sales');
        this.subviewConsolidated = document.getElementById('view-payroll-consolidated');

        // Sub-tables
        this.tableKPIBody = document.querySelector('#table-payroll-kpi tbody');
        this.tableSalesBody = document.querySelector('#table-payroll-sales tbody');

        // Modal Adjustment
        this.modalAdj = document.getElementById('modal-adjustment');
        this.formAdj = document.getElementById('form-adjustment');
        this.adjEmpId = document.getElementById('adj-emp-id');
        this.adjMonth = document.getElementById('adj-month');
        this.adjTitleEmpName = document.getElementById('adj-title-emp-name');
        this.adjTitleMonth = document.getElementById('adj-title-month');
        this.containerAdjFields = document.getElementById('container-adjustment-fields');
        this.btnCancelAdj = document.getElementById('btn-cancel-adjustment');
        this.btnCloseAdj = document.getElementById('btn-close-adjustment-modal');
    },

    bindEvents() {
        // Đồng bộ hóa toàn bộ 3 bộ chọn tháng khi một bộ chọn thay đổi
        this.monthPickers.forEach(picker => {
            picker.addEventListener('change', (e) => {
                this.currentMonth = e.target.value;
                this.calculateAndRender();
            });
        });

        // Đăng ký sự kiện tính toán lại cho cả 3 nút bấm ở 3 trang
        this.btnCalculates.forEach(btn => {
            btn.addEventListener('click', () => {
                this.calculateAndRender();
                Store.addActivity(`Đã tính toán lại toàn bộ dữ liệu bảng lương 3P tháng ${this.currentMonth}.`, 'info', 'payroll');
                Utils.showToast('Đã tính toán lại toàn bộ dữ liệu bảng lương 3P tháng!');
            });
        });

        // Đăng ký sự kiện xuất Excel tương ứng cho nút bấm của từng trang
        this.btnExports.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = btn.dataset.type; // 'kpi' | 'sales' | 'consolidated'
                this.exportSheetToExcel(type);
            });
        });

        // Adjustment Modal Events
        this.btnCancelAdj.addEventListener('click', () => this.closeAdjustmentModal());
        this.btnCloseAdj.addEventListener('click', () => this.closeAdjustmentModal());
        this.formAdj.addEventListener('submit', (e) => this.handleAdjustmentSubmit(e));
        
        // Listeners for inline inputs in spreadsheet-like tables
        this.tableKPIBody.addEventListener('change', (e) => this.handleKPIInlineChange(e));
        this.tableSalesBody.addEventListener('change', (e) => this.handleSalesInlineChange(e));

        // Adjustment click delegation in Consolidated payroll
        if (this.subviewConsolidated) {
            this.subviewConsolidated.addEventListener('click', (e) => {
                const target = e.target.closest('.action-icon.edit-adjustment');
                if (target) {
                    const empId = target.dataset.id;
                    this.openAdjustmentModal(empId);
                }
            });
        }
    },

    switchSubTab(tab) {
        this.currentSubTab = tab;
        
        // Cập nhật class active cho các view tương ứng
        document.querySelectorAll('.view-section').forEach(section => {
            if (section.id === `view-payroll-${tab}`) {
                section.classList.add('active');
            } else if (section.id.startsWith('view-payroll-')) {
                section.classList.remove('active');
            }
        });

        lucide.createIcons();
        this.calculateAndRender();
    },

    setDefaultMonth() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        this.currentMonth = `${yyyy}-${mm}`;
    },

    // Xử lý thay đổi điểm KPI trực tiếp trên bảng tính (Spreadsheet-like)
    handleKPIInlineChange(e) {
        if (!e.target.classList.contains('kpi-score-input')) return;
        
        const empId = e.target.dataset.id;
        const val = Math.max(0, Math.min(150, Number(e.target.value || 0)));
        e.target.value = val;
        
        const month = this.currentMonth;

        Store.saveAdjustment({
            employeeId: empId,
            month,
            kpiScore: val
        });

        const emp = Store.getEmployees().find(x => x.id === empId);
        const empName = emp ? emp.name : 'Nhân viên';
        const empCode = emp ? emp.employeeCode : '';
        Store.addActivity(`Đã cập nhật điểm KPI thực tế của nhân viên ${empName} (${empCode}) thành ${val}% (tháng ${month}).`, 'info', 'payroll');

        Utils.showToast('Đã lưu điểm KPI và tính toán lại!');
        this.calculateAndRender();

        if (window.App && typeof window.App.refreshAllData === 'function') {
            window.App.refreshAllData();
        }
    },

    // Xử lý thay đổi doanh số trực tiếp trên bảng tính
    handleSalesInlineChange(e) {
        if (!e.target.classList.contains('sales-revenue-input')) return;
        
        const empId = e.target.dataset.id;
        const val = Math.max(0, Number(e.target.value || 0));
        e.target.value = val;
        
        const month = this.currentMonth;

        Store.saveAdjustment({
            employeeId: empId,
            month,
            salesRevenue: val
        });

        const emp = Store.getEmployees().find(x => x.id === empId);
        const empName = emp ? emp.name : 'Nhân viên';
        const empCode = emp ? emp.employeeCode : '';
        Store.addActivity(`Đã cập nhật doanh thu Sales của nhân viên ${empName} (${empCode}) thành ${Utils.formatVND(val)} (tháng ${month}).`, 'info', 'payroll');

        Utils.showToast('Đã lưu doanh thu bán hàng và tính toán hoa hồng mới!');
        this.calculateAndRender();

        if (window.App && typeof window.App.refreshAllData === 'function') {
            window.App.refreshAllData();
        }
    },

    openAdjustmentModal(empId) {
        const month = this.monthPicker.value;
        const employees = Store.getEmployees();
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;

        this.adjEmpId.value = empId;
        this.adjMonth.value = month;
        this.adjTitleEmpName.innerText = `Nhân viên: ${emp.name} (${emp.employeeCode}) - CCCD: ${emp.cccd || '-'}`;
        this.adjTitleMonth.innerText = `Áp dụng điều chỉnh đột xuất riêng biệt cho: ${Utils.getMonthName(month)}`;

        const adjusts = Store.getAdjustments(month);
        const adj = adjusts.find(a => a.employeeId === empId) || {};
        const customOverrides = adj.customValues || {};

        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];

        let fieldsHTML = `
            <div class="form-group" style="grid-column: 1 / -1;">
                <label for="adj-base-salary">Lương cơ bản đột xuất tháng này (VND) - Để trống để kế thừa mặc định: ${Utils.formatVND(emp.baseSalary)}</label>
                <input type="number" id="adj-base-salary" value="${adj.baseSalaryOverride !== undefined ? adj.baseSalaryOverride : ''}" placeholder="Kế thừa: ${emp.baseSalary}">
            </div>
        `;

        customColumns.forEach(col => {
            const defaultVal = emp.customValues && emp.customValues[col.id] !== undefined ? emp.customValues[col.id] : 0;
            const overrideVal = customOverrides[col.id] !== undefined ? customOverrides[col.id] : '';
            
            let typeLabel = col.type === 'allowance' ? 'Phụ cấp' : (col.type === 'bonus' ? 'Thưởng' : 'Khấu trừ');
            
            fieldsHTML += `
                <div class="form-group">
                    <label for="adj-custom-${col.id}">${col.name} (${typeLabel}) - Để trống để kế thừa mặc định: ${Utils.formatVND(defaultVal)}</label>
                    <input type="number" id="adj-custom-${col.id}" value="${overrideVal}" placeholder="Kế thừa: ${defaultVal}">
                </div>
            `;
        });

        this.containerAdjFields.innerHTML = fieldsHTML;
        this.modalAdj.classList.add('active');
    },

    closeAdjustmentModal() {
        this.modalAdj.classList.remove('active');
    },

    handleAdjustmentSubmit(e) {
        e.preventDefault();
        const empId = this.adjEmpId.value;
        const month = this.adjMonth.value;

        const baseSalaryInput = document.getElementById('adj-base-salary');
        const baseSalaryOverride = baseSalaryInput.value !== '' ? Number(baseSalaryInput.value) : undefined;

        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];
        const customValues = {};

        customColumns.forEach(col => {
            const input = document.getElementById(`adj-custom-${col.id}`);
            if (input && input.value !== '') {
                customValues[col.id] = Number(input.value);
            }
        });

        const adjustment = {
            employeeId: empId,
            month,
            customValues
        };

        if (baseSalaryOverride !== undefined) {
            adjustment.baseSalaryOverride = baseSalaryOverride;
        }

        Store.saveAdjustment(adjustment);
        Utils.showToast('Đã lưu cấu hình điều chỉnh thu nhập tháng này!');
        this.closeAdjustmentModal();
        this.calculateAndRender();
        
        if (window.App && typeof window.App.refreshAllData === 'function') {
            window.App.refreshAllData();
        }
    },

    // Hàm lõi tính toán chi tiết lương 3P cho tất cả nhân viên trong tháng
    calculatePayrollData(month) {
        const employees = Store.getEmployees().filter(e => e.status === 'active');
        const attendance = Store.getAttendance(month);
        const leaves = Store.getLeaves(month);
        const settings = Store.getSettings();
        const adjustments = Store.getAdjustments(month);

        const stdWorkDays = settings.standardWorkDays || 26;
        const stdWorkHours = settings.standardWorkHours || 8;
        const rates = settings.overtimeRates || { normal: 1.5, weekend: 2.0, holiday: 3.0 };
        const insRates = settings.insurance || { social: 8, health: 1.5, unemployment: 1 };
        const totalInsPercent = (insRates.social + insRates.health + insRates.unemployment) / 100;
        
        const customColumns = settings.customColumns || [];
        const structures = settings.salaryStructures || {};

        return employees.map(emp => {
            const empAtt = attendance.filter(a => a.employeeId === emp.id);
            const empLeaves = leaves.filter(l => l.employeeId === emp.id && l.status === 'approved');
            
            const empAdj = adjustments.find(a => a.employeeId === emp.id) || {};
            const adjCustomValues = empAdj.customValues || {};

            // 1. Áp dụng Kế thừa hoặc Ghi đè cố định
            const baseSalaryApplied = empAdj.baseSalaryOverride !== undefined ? empAdj.baseSalaryOverride : emp.baseSalary;
            
            const appliedCustomValues = {};
            customColumns.forEach(col => {
                const defaultVal = emp.customValues && emp.customValues[col.id] !== undefined ? emp.customValues[col.id] : 0;
                const overrideVal = adjCustomValues[col.id];
                appliedCustomValues[col.id] = overrideVal !== undefined ? overrideVal : defaultVal;
            });

            // 2. Chấm công đi làm
            let actualWorkDays = 0;
            let otHoursNormal = 0;
            let otHoursWeekend = 0;

            empAtt.forEach(att => {
                if (att.status === 'full') actualWorkDays += 1;
                else if (att.status === 'half') actualWorkDays += 0.5;

                if (att.overtimeHours > 0) {
                    const dayOfWeek = new Date(att.date).getDay();
                    if (dayOfWeek === 0) otHoursWeekend += att.overtimeHours;
                    else otHoursNormal += att.overtimeHours;
                }
            });

            // 3. Tính phép năm
            let paidLeaveDays = 0;
            let unpaidLeaveDays = 0;
            let remoteDays = 0;

            empLeaves.forEach(leave => {
                let days = Utils.getDaysBetween(leave.startDate, leave.endDate);
                if (leave.type === 'annual_leave' || leave.type === 'sick_leave') paidLeaveDays += days;
                else if (leave.type === 'unpaid_leave') unpaidLeaveDays += days;
                else if (leave.type === 'remote_work') remoteDays += days;
            });

            // 4. Lương công chuẩn
            const salaryPerDay = baseSalaryApplied / stdWorkDays;
            const salaryPerHour = salaryPerDay / stdWorkHours;
            const totalPaidDays = Math.min(stdWorkDays, actualWorkDays + paidLeaveDays + remoteDays);
            const scaleSalary = salaryPerDay * totalPaidDays;

            // 5. Lương OT (Miễn thuế chênh lệch)
            const otPayReal = (salaryPerHour * rates.normal * otHoursNormal) + (salaryPerHour * rates.weekend * otHoursWeekend);
            const otPayTaxable = (salaryPerHour * 1.0 * otHoursNormal) + (salaryPerHour * 1.0 * otHoursWeekend);
            const otPayExempt = Math.max(0, otPayReal - otPayTaxable);

            // 6. TÍNH TOÁN KPI VÀ DOANH SỐ (P3) CHO TỪNG BỘ PHẬN (LOW-CODE THỪA HƯỞNG)
            const dept = emp.department;
            const struct = structures[dept] || { useP1: true, useKPI: true, kpiWeight: 100, useSales: false, salesWeight: 0, targetKPI: 2000000 };

            // Trị số KPI hàng tháng (mặc định điểm 100 nếu chưa có ghi nhận)
            const kpiScore = empAdj.kpiScore !== undefined ? empAdj.kpiScore : 100;
            const kpiTarget = struct.targetKPI || 2000000;
            const kpiEarned = Math.round(kpiTarget * (kpiScore / 100));

            // Trị số Doanh số hàng tháng (mặc định 0đ)
            const salesRevenue = empAdj.salesRevenue !== undefined ? empAdj.salesRevenue : 0;
            
            // Tra cứu hoa hồng bậc thang lũy tiến chuẩn VN
            let commissionRate = 0;
            if (salesRevenue > 0) {
                if (salesRevenue >= 100000000) commissionRate = 4.0;
                else if (salesRevenue >= 50000000) commissionRate = 2.5;
                else commissionRate = 1.0;
            }
            const salesEarned = Math.round(salesRevenue * (commissionRate / 100));

            // HỢP NHẤT LƯƠNG HIỆU QUẢ P3 DỰA TRÊN TRỌNG SỐ (%)
            let p3Earned = 0;
            if (struct.useKPI && struct.useSales) {
                // Tích hợp cả hai
                p3Earned = Math.round((kpiEarned * (struct.kpiWeight / 100)) + (salesEarned * (struct.salesWeight / 100)));
            } else if (struct.useKPI) {
                p3Earned = kpiEarned;
            } else if (struct.useSales) {
                p3Earned = salesEarned;
            }

            // 7. Tổng tiền phụ cấp động
            let sumAllowances = 0;
            let sumBonuses = 0;
            let sumDeductions = 0;
            let taxableCustomIncome = 0;
            let insuranceCustomIncome = 0;

            customColumns.forEach(col => {
                const val = appliedCustomValues[col.id] || 0;
                if (col.type === 'allowance') {
                    const actualVal = (val / stdWorkDays) * totalPaidDays;
                    sumAllowances += actualVal;
                    if (col.taxable) taxableCustomIncome += actualVal;
                    if (col.insurance) insuranceCustomIncome += val;
                } else if (col.type === 'bonus') {
                    sumBonuses += val;
                    if (col.taxable) taxableCustomIncome += val;
                    if (col.insurance) insuranceCustomIncome += val;
                } else if (col.type === 'deduction') {
                    sumDeductions += val;
                }
            });

            // 8. Bảo hiểm xã hội capping trần tối đa
            const baseInsSalary = emp.insuranceSalary || baseSalaryApplied;
            const totalInsBase = baseInsSalary + insuranceCustomIncome;
            const cappedInsBase = Math.min(46800000, totalInsBase); // Trần đóng bảo hiểm

            const insSocialDeduct = cappedInsBase * (insRates.social / 100);
            const insHealthDeduct = cappedInsBase * (insRates.health / 100);
            const cappedUnempBase = Math.min(99200000, totalInsBase);
            const insUnempDeduct = cappedUnempBase * (insRates.unemployment / 100);

            const totalInsuranceDeduction = insSocialDeduct + insHealthDeduct + insUnempDeduct;

            // 9. Thuế TNCN hàng tháng
            // P3 thưởng kết quả công việc là khoản chịu thuế TNCN 100%
            const grossTaxableIncome = scaleSalary + otPayTaxable + taxableCustomIncome + p3Earned;

            const selfReduction = settings.pitSelf || 11000000;
            const dependentReduction = (emp.dependents || 0) * (settings.pitDependent || 4400000);
            const totalReductions = selfReduction + dependentReduction + totalInsuranceDeduction;

            const netTaxableIncome = Math.max(0, grossTaxableIncome - totalReductions);

            let pitTax = 0;
            if (netTaxableIncome > 0) {
                if (netTaxableIncome <= 5000000) pitTax = netTaxableIncome * 0.05;
                else if (netTaxableIncome <= 10000000) pitTax = netTaxableIncome * 0.10 - 250000;
                else if (netTaxableIncome <= 18000000) pitTax = netTaxableIncome * 0.15 - 750000;
                else if (netTaxableIncome <= 32000000) pitTax = netTaxableIncome * 0.20 - 1650000;
                else if (netTaxableIncome <= 52000000) pitTax = netTaxableIncome * 0.25 - 3250000;
                else if (netTaxableIncome <= 80000000) pitTax = netTaxableIncome * 0.30 - 5850000;
                else pitTax = netTaxableIncome * 0.35 - 9850000;
            }

            // 10. Thực lĩnh chuyển khoản
            const grossEarnings = scaleSalary + otPayReal + sumAllowances + sumBonuses + p3Earned;
            const netSalary = Math.max(0, grossEarnings - totalInsuranceDeduction - pitTax - sumDeductions);

            return {
                employeeId: emp.id,
                employeeCode: emp.employeeCode,
                cccd: emp.cccd || '-',
                name: emp.name,
                department: emp.department,
                position: emp.position,
                baseSalaryApplied,
                stdWorkDays,
                actualWorkDays,
                otHoursNormal,
                otHoursWeekend,
                paidLeaveDays,
                unpaidLeaveDays,
                remoteDays,
                totalPaidDays,
                scaleSalary,
                otPayReal,
                otPayExempt,
                
                // 3P Variables
                struct,
                kpiScore,
                kpiTarget,
                kpiEarned,
                salesRevenue,
                commissionRate,
                salesEarned,
                p3Earned,
                
                appliedCustomValues,
                dependents: emp.dependents,
                totalInsuranceDeduction,
                pitTax,
                netSalary
            };
        });
    },

    calculateAndRender() {
        const currentMonth = this.currentMonth;
        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];
        const payrollData = this.calculatePayrollData(currentMonth);

        // 1. RENDER BẢNG 1: BẢNG LƯƠNG KPI
        const kpiEmployees = payrollData.filter(p => p.struct.useKPI);
        if (kpiEmployees.length === 0) {
            this.tableKPIBody.innerHTML = '<tr><td colspan="8" class="empty-state">Không có bộ phận nào áp dụng cơ chế tính lương KPI trong cấu hình.</td></tr>';
        } else {
            this.tableKPIBody.innerHTML = kpiEmployees.map(p => `
                <tr>
                    <td style="font-weight:600; color:#fff;">${p.employeeCode}</td>
                    <td style="font-weight:500;">${p.name}</td>
                    <td>${p.department}</td>
                    <td>${p.position}</td>
                    <td>${Utils.formatVND(p.kpiTarget)}</td>
                    <td style="background: rgba(108, 92, 231, 0.05);">
                        <input type="number" class="editable-cell kpi-score-input" data-id="${p.employeeId}" value="${p.kpiScore}" min="0" max="150" step="5">
                    </td>
                    <td style="text-align:center; font-weight:600; color:var(--info-color);">${p.kpiScore}%</td>
                    <td style="font-weight:600; color:#fff; background: rgba(108, 92, 231, 0.1);">${Utils.formatVND(p.kpiEarned)}</td>
                </tr>
            `).join('');
        }

        // 2. RENDER BẢNG 2: BẢNG LƯƠNG DOANH SỐ
        const salesEmployees = payrollData.filter(p => p.struct.useSales);
        if (salesEmployees.length === 0) {
            this.tableSalesBody.innerHTML = '<tr><td colspan="8" class="empty-state">Không có bộ phận nào áp dụng cơ chế tính lương Doanh số Sales trong cấu hình.</td></tr>';
        } else {
            this.tableSalesBody.innerHTML = salesEmployees.map(p => `
                <tr>
                    <td style="font-weight:600; color:#fff;">${p.employeeCode}</td>
                    <td style="font-weight:500;">${p.name}</td>
                    <td>${p.department}</td>
                    <td>${p.position}</td>
                    <td>${Utils.formatVND(50000000)}</td>
                    <td style="background: rgba(9, 132, 227, 0.05);">
                        <input type="number" class="editable-cell sales-revenue-input" data-id="${p.employeeId}" value="${p.salesRevenue}" min="0" step="1000000">
                    </td>
                    <td style="text-align:center; font-weight:600; color:var(--warning-color);">${p.commissionRate}%</td>
                    <td style="font-weight:600; color:#fff; background: rgba(9, 132, 227, 0.1);">${Utils.formatVND(p.salesEarned)}</td>
                </tr>
            `).join('');
        }

        // 3. RENDER BẢNG 3: BẢNG LƯƠNG TỔNG HỢP (HR ADMIN)
        let headerHTML = `
            <tr>
                <th>Mã NV</th>
                <th>Họ & Tên</th>
                <th>CCCD</th>
                <th>Lương cơ bản (P1)</th>
                <th>Công chuẩn</th>
                <th>Lương theo công</th>
                <th>Tổng lương P3 (KPI & Sales)</th>
        `;

        customColumns.forEach(col => {
            headerHTML += `<th>${col.name} (P2)</th>`;
        });

        headerHTML += `
                <th>Bảo hiểm trích (10.5%)</th>
                <th>Thuế TNCN</th>
                <th>Thực nhận chuyển khoản</th>
                <th>Ghi đè đột xuất</th>
            </tr>
        `;
        this.tableHeader.innerHTML = headerHTML;

        if (payrollData.length === 0) {
            this.tableBody.innerHTML = `<tr><td colspan="${11 + customColumns.length}" class="empty-state">Chưa có nhân viên hoạt động để tính lương.</td></tr>`;
        } else {
            this.tableBody.innerHTML = payrollData.map(p => {
                let rowHTML = `
                    <tr>
                        <td style="font-weight:600; color:#fff;">${p.employeeCode}</td>
                        <td style="font-weight:500; white-space: nowrap;">${p.name}</td>
                        <td>${p.cccd}</td>
                        <td>${Utils.formatVND(p.baseSalaryApplied)}</td>
                        <td style="text-align: center; font-weight: 500; color: #2ecc71;">${p.actualWorkDays} / ${p.stdWorkDays}</td>
                        <td>${Utils.formatVND(p.scaleSalary)}</td>
                        <td style="background: rgba(168, 85, 247, 0.1); font-weight:600; color: #fff;" title="KPI: ${Utils.formatVND(p.kpiEarned)} | Sales: ${Utils.formatVND(p.salesEarned)}">${Utils.formatVND(p.p3Earned)}</td>
                `;

                customColumns.forEach(col => {
                    let val = p.appliedCustomValues[col.id] || 0;
                    if (col.type === 'allowance') {
                        val = (val / p.stdWorkDays) * p.totalPaidDays;
                    }
                    rowHTML += `<td>${Utils.formatVND(val)}</td>`;
                });

                rowHTML += `
                        <td style="color: var(--danger-color);">${Utils.formatVND(p.totalInsuranceDeduction)}</td>
                        <td style="color: var(--warning-color);">${Utils.formatVND(p.pitTax)}</td>
                        <td style="font-weight:700; color: #fff; background: rgba(108, 92, 231, 0.15);">${Utils.formatVND(p.netSalary)}</td>
                        <td>
                            <button class="action-icon edit-adjustment" data-id="${p.employeeId}" title="Điều chỉnh thu nhập tháng này">
                                <i data-lucide="sliders-horizontal" style="width:16px; height:16px;"></i>
                            </button>
                        </td>
                    </tr>
                `;
                return rowHTML;
            }).join('');
        }

        // Tự động khởi tạo và áp dụng bộ lọc tiêu đề các cột của cả 3 bảng
        Utils.initializeTableFilters('table-payroll-kpi');
        Utils.initializeTableFilters('table-payroll-sales');
        Utils.initializeTableFilters('table-payroll');

        lucide.createIcons();
    },

    exportSheetToExcel(type) {
        const month = this.currentMonth;
        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];
        const payrollData = this.calculatePayrollData(month);
        const structures = settings.salaryStructures || {};

        if (payrollData.length === 0) {
            Utils.showToast('Không có dữ liệu để xuất!', 'warning');
            return;
        }

        const exportTitles = {
            kpi: 'Bảng Lương KPI (P3.1)',
            sales: 'Bảng Hoa Hồng Sales (P3.2)',
            consolidated: 'Bảng Lương Tổng Hợp 3P'
        };
        Store.addActivity(`Đã kết xuất ${exportTitles[type] || type} tháng ${month} ra tệp Excel công thức sống.`, 'success', 'export');

        const workbook = XLSX.utils.book_new();

        if (type === 'kpi') {
            const kpiEmployees = payrollData.filter(p => p.struct.useKPI);
            const kpiData = kpiEmployees.map(p => ({
                'Mã NV': p.employeeCode,
                'Họ và Tên': p.name,
                'Phòng Ban': p.department,
                'Chức Vụ': p.position,
                'Lương KPI Mục Tiêu (VNĐ)': p.kpiTarget,
                'Điểm KPI Đạt Được (%)': p.kpiScore,
                'Lương KPI Thực Lĩnh (VNĐ)': p.kpiEarned
            }));
            const wsKPI = XLSX.utils.json_to_sheet(kpiData);
            if (kpiEmployees.length > 0) {
                for (let i = 0; i < kpiData.length; i++) {
                    const rowNum = i + 2;
                    const cellG = wsKPI[`G${rowNum}`];
                    if (cellG) {
                        cellG.t = 'f';
                        cellG.f = `ROUND(E${rowNum}*F${rowNum}/100,0)`;
                    }
                }
                wsKPI['!cols'] = Object.keys(kpiData[0]).map(() => ({ wch: 18 }));
                XLSX.utils.book_append_sheet(workbook, wsKPI, 'Luong_KPI');
            }
            XLSX.writeFile(workbook, `Bang_Luong_KPI_${month}.xlsx`);
        } 
        
        else if (type === 'sales') {
            const salesEmployees = payrollData.filter(p => p.struct.useSales);
            const salesData = salesEmployees.map(p => ({
                'Mã NV': p.employeeCode,
                'Họ và Tên': p.name,
                'Phòng Ban': p.department,
                'Doanh Thu Bán Hàng (VNĐ)': p.salesRevenue,
                'Tỷ Lệ Hoa Hồng (%)': p.commissionRate,
                'Thưởng Doanh Số Thực Lĩnh (VNĐ)': p.salesEarned
            }));
            const wsSales = XLSX.utils.json_to_sheet(salesData);
            if (salesEmployees.length > 0) {
                for (let i = 0; i < salesData.length; i++) {
                    const rowNum = i + 2;
                    const cellE = wsSales[`E${rowNum}`];
                    if (cellE) {
                        cellE.t = 'f';
                        cellE.f = `IF(D${rowNum}>=100000000,4,IF(D${rowNum}>=50000000,2.5,1))`;
                    }
                    const cellF = wsSales[`F${rowNum}`];
                    if (cellF) {
                        cellF.t = 'f';
                        cellF.f = `ROUND(D${rowNum}*E${rowNum}/100,0)`;
                    }
                }
                wsSales['!cols'] = Object.keys(salesData[0]).map(() => ({ wch: 18 }));
                XLSX.utils.book_append_sheet(workbook, wsSales, 'Luong_Doanh_So');
            }
            XLSX.writeFile(workbook, `Bang_Luong_Doanh_So_Sales_${month}.xlsx`);
        } 
        
        else if (type === 'consolidated') {
            // Consolidated sheet xuất file gộp 3 sheet có chèn công thức sống!
            const kpiEmployees = payrollData.filter(p => p.struct.useKPI);
            const kpiData = kpiEmployees.map(p => ({
                'Mã NV': p.employeeCode,
                'Họ và Tên': p.name,
                'Phòng Ban': p.department,
                'Chức Vụ': p.position,
                'Lương KPI Mục Tiêu (VNĐ)': p.kpiTarget,
                'Điểm KPI Đạt Được (%)': p.kpiScore,
                'Lương KPI Thực Lĩnh (VNĐ)': p.kpiEarned
            }));
            const wsKPI = XLSX.utils.json_to_sheet(kpiData);
            if (kpiEmployees.length > 0) {
                for (let i = 0; i < kpiData.length; i++) {
                    const rowNum = i + 2;
                    const cellG = wsKPI[`G${rowNum}`];
                    if (cellG) {
                        cellG.t = 'f';
                        cellG.f = `ROUND(E${rowNum}*F${rowNum}/100,0)`;
                    }
                }
                wsKPI['!cols'] = Object.keys(kpiData[0]).map(() => ({ wch: 18 }));
                XLSX.utils.book_append_sheet(workbook, wsKPI, 'Luong_KPI');
            }

            const salesEmployees = payrollData.filter(p => p.struct.useSales);
            const salesData = salesEmployees.map(p => ({
                'Mã NV': p.employeeCode,
                'Họ và Tên': p.name,
                'Phòng Ban': p.department,
                'Doanh Thu Bán Hàng (VNĐ)': p.salesRevenue,
                'Tỷ Lệ Hoa Hồng (%)': p.commissionRate,
                'Thưởng Doanh Số Thực Lĩnh (VNĐ)': p.salesEarned
            }));
            const wsSales = XLSX.utils.json_to_sheet(salesData);
            if (salesEmployees.length > 0) {
                for (let i = 0; i < salesData.length; i++) {
                    const rowNum = i + 2;
                    const cellE = wsSales[`E${rowNum}`];
                    if (cellE) {
                        cellE.t = 'f';
                        cellE.f = `IF(D${rowNum}>=100000000,4,IF(D${rowNum}>=50000000,2.5,1))`;
                    }
                    const cellF = wsSales[`F${rowNum}`];
                    if (cellF) {
                        cellF.t = 'f';
                        cellF.f = `ROUND(D${rowNum}*E${rowNum}/100,0)`;
                    }
                }
                wsSales['!cols'] = Object.keys(salesData[0]).map(() => ({ wch: 18 }));
                XLSX.utils.book_append_sheet(workbook, wsSales, 'Luong_Doanh_So');
            }

            const consolidatedData = payrollData.map(p => {
                const row = {
                    'Mã Nhân Viên': p.employeeCode,
                    'Số CCCD': p.cccd,
                    'Họ và Tên': p.name,
                    'Phòng Ban': p.department,
                    'Lương Cơ Bản P1 (VNĐ)': Math.round(p.baseSalaryApplied),
                    'Ngày Công Chuẩn': p.stdWorkDays,
                    'Công Thực Tế': p.actualWorkDays,
                    'Lương Theo Ngày Công (VNĐ)': Math.round(p.scaleSalary),
                    'Lương Hiệu Quả P3 (VNĐ)': Math.round(p.p3Earned)
                };
                customColumns.forEach(col => {
                    let val = p.appliedCustomValues[col.id] || 0;
                    if (col.type === 'allowance') {
                        val = (val / p.stdWorkDays) * p.totalPaidDays;
                    }
                    row[col.name + ' P2 (VNĐ)'] = Math.round(val);
                });
                row['Số Người Phụ Thuộc'] = p.dependents || 0;
                row['Bảo Hiểm Khấu Trừ (VNĐ)'] = Math.round(p.totalInsuranceDeduction);
                row['Thuế TNCN (VNĐ)'] = Math.round(p.pitTax);
                row['Thực Nhận Chuyển Khoản (VNĐ)'] = Math.round(p.netSalary);
                return row;
            });

            const wsCons = XLSX.utils.json_to_sheet(consolidatedData);
            for (let i = 0; i < consolidatedData.length; i++) {
                const rowNum = i + 2;
                const p = payrollData[i];
                
                const cellH = wsCons[`H${rowNum}`];
                if (cellH) {
                    cellH.t = 'f';
                    cellH.f = `ROUND(E${rowNum}*G${rowNum}/F${rowNum},0)`;
                }

                const cellI = wsCons[`I${rowNum}`];
                if (cellI) {
                    const struct = structures[p.department] || { useKPI: true, useSales: false, kpiWeight: 100, salesWeight: 0 };
                    const kpiW = struct.useKPI ? (struct.kpiWeight / 100) : 0;
                    const salesW = struct.useSales ? (struct.salesWeight / 100) : 0;
                    
                    cellI.t = 'f';
                    cellI.f = `ROUND((IFERROR(VLOOKUP(A${rowNum},Luong_KPI!A:G,7,FALSE),0)*${kpiW})+(IFERROR(VLOOKUP(A${rowNum},Luong_Doanh_So!A:F,6,FALSE),0)*${salesW}),0)`;
                }

                const numCustom = customColumns.length;
                const depColIdx = 9 + numCustom;
                const depColLetter = Utils.getColLetter(depColIdx);
                
                const insColIdx = 10 + numCustom;
                const insColLetter = Utils.getColLetter(insColIdx);
                const cellIns = wsCons[`${insColLetter}${rowNum}`];
                if (cellIns) {
                    cellIns.t = 'f';
                    cellIns.f = `ROUND(MIN(46800000,E${rowNum})*0.105,0)`;
                }

                const taxColIdx = 11 + numCustom;
                const taxColLetter = Utils.getColLetter(taxColIdx);
                const cellTax = wsCons[`${taxColLetter}${rowNum}`];
                if (cellTax) {
                    let taxableCustomFormula = '';
                    customColumns.forEach((col, idx) => {
                        if (col.taxable) {
                            const colL = Utils.getColLetter(9 + idx);
                            taxableCustomFormula += `+${colL}${rowNum}`;
                        }
                    });
                    const T_formula = `MAX(0,H${rowNum}+I${rowNum}${taxableCustomFormula}-11000000-(${depColLetter}${rowNum}*4400000)-${insColLetter}${rowNum})`;
                    cellTax.t = 'f';
                    cellTax.f = `IF(${T_formula}<=0,0,IF(${T_formula}<=5000000,${T_formula}*0.05,IF(${T_formula}<=10000000,${T_formula}*0.1-250000,IF(${T_formula}<=18000000,${T_formula}*0.15-750000,IF(${T_formula}<=32000000,${T_formula}*0.2-1650000,IF(${T_formula}<=52000000,${T_formula}*0.25-3250000,IF(${T_formula}<=80000000,${T_formula}*0.3-5850000,${T_formula}*0.35-9850000)))))))`;
                }

                const netColIdx = 12 + numCustom;
                const netColLetter = Utils.getColLetter(netColIdx);
                const cellNet = wsCons[`${netColLetter}${rowNum}`];
                if (cellNet) {
                    let customColsFormula = '';
                    customColumns.forEach((col, idx) => {
                        const colL = Utils.getColLetter(9 + idx);
                        customColsFormula += `+${colL}${rowNum}`;
                    });
                    cellNet.t = 'f';
                    cellNet.f = `MAX(0,H${rowNum}+I${rowNum}${customColsFormula}-${insColLetter}${rowNum}-${taxColLetter}${rowNum})`;
                }
            }
            wsCons['!cols'] = Object.keys(consolidatedData[0]).map(() => ({ wch: 18 }));
            XLSX.utils.book_append_sheet(workbook, wsCons, 'Bang_Luong_Consolidated_3P');
            XLSX.writeFile(workbook, `Bao_Cao_Luong_3P_Cong_Thuc_${month}.xlsx`);
        }

        Utils.showToast('Đã tải xuống bảng lương Excel công thức sống!');
    }
};
