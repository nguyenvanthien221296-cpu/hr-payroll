/* ==========================================
   HR PAYROLL REPORTS & PIT FINALIZATION v3
   ========================================== */

const ReportsModule = {
    deptSalaryChart: null,
    leavePieChart: null,
    deptKPIChart: null,
    salesRevenueChart: null,
    currentTab: 'charts',

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.setDefaultMonthAndYear();
        this.renderCharts();
        this.switchTab('charts');
    },

    cacheDOM() {
        this.viewSection = document.getElementById('view-reports');
        this.monthPicker = document.getElementById('report-month');
        this.btnExportFull = document.getElementById('btn-export-full-report');

        // Tabs
        this.btnTabCharts = document.getElementById('btn-tab-charts');
        this.btnTabPIT = document.getElementById('btn-tab-pit-finalization');
        this.subviewCharts = document.getElementById('subview-charts');
        this.subviewPIT = document.getElementById('subview-pit-finalization');

        // PIT Finalization Fields
        this.yearPicker = document.getElementById('finalization-year');
        this.btnCalculateFinal = document.getElementById('btn-calculate-finalization');
        this.btnExportFinalExcel = document.getElementById('btn-export-finalization-excel');
        this.tablePITBody = document.querySelector('#table-pit-finalization tbody');
    },

    bindEvents() {
        this.monthPicker.addEventListener('change', () => this.renderCharts());
        this.btnExportFull.addEventListener('click', () => this.exportFullReport());

        this.btnTabCharts.addEventListener('click', () => this.switchTab('charts'));
        this.btnTabPIT.addEventListener('click', () => this.switchTab('pit'));

        this.btnCalculateFinal.addEventListener('click', () => this.calculatePITFinalization());
        this.btnExportFinalExcel.addEventListener('click', () => this.exportPITFinalizationToExcel());
    },

    setDefaultMonthAndYear() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        this.monthPicker.value = `${yyyy}-${mm}`;
        this.yearPicker.value = yyyy;
    },

    switchTab(tab) {
        this.currentTab = tab;
        if (tab === 'charts') {
            this.btnTabCharts.className = 'btn btn-primary';
            this.btnTabPIT.className = 'btn btn-secondary';
            this.subviewCharts.style.display = 'block';
            this.subviewPIT.style.display = 'none';
            this.renderCharts();
        } else {
            this.btnTabCharts.className = 'btn btn-secondary';
            this.btnTabPIT.className = 'btn btn-primary';
            this.subviewCharts.style.display = 'none';
            this.subviewPIT.style.display = 'block';
            this.calculatePITFinalization();
        }
    },

    renderCharts() {
        const month = this.monthPicker.value;
        const payrollData = PayrollModule.calculatePayrollData(month);
        const leaves = Store.getLeaves(month);

        // ----------------------------------------------------
        // CHART 1: HIỆU SUẤT KPI TRUNG BÌNH THEO PHÒNG BAN
        // ----------------------------------------------------
        const deptKPIs = {};
        const deptKPICounts = {};
        
        payrollData.forEach(p => {
            if (p.struct.useKPI) {
                if (!deptKPIs[p.department]) {
                    deptKPIs[p.department] = 0;
                    deptKPICounts[p.department] = 0;
                }
                deptKPIs[p.department] += p.kpiScore;
                deptKPICounts[p.department]++;
            }
        });

        const kpiLabels = Object.keys(deptKPIs);
        const kpiValues = kpiLabels.map(dept => Math.round(deptKPIs[dept] / deptKPICounts[dept]));

        if (this.deptKPIChart) this.deptKPIChart.destroy();
        const ctxKPI = document.getElementById('deptKPIChart').getContext('2d');
        
        if (kpiLabels.length > 0) {
            this.deptKPIChart = new Chart(ctxKPI, {
                type: 'bar',
                data: {
                    labels: kpiLabels,
                    datasets: [{
                        label: 'Hiệu suất KPI Trung bình (%)',
                        data: kpiValues,
                        backgroundColor: 'rgba(168, 85, 247, 0.7)',
                        borderColor: '#a855f7',
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 0, max: 120, ticks: { color: '#a4b0be' } },
                        x: { ticks: { color: '#a4b0be' } }
                    }
                }
            });
        }

        // ----------------------------------------------------
        // CHART 2: DOANH THU KINH DOANH PHÒNG SALES (VND)
        // ----------------------------------------------------
        const salesNames = [];
        const salesRevenues = [];

        payrollData.forEach(p => {
            if (p.struct.useSales && p.salesRevenue > 0) {
                salesNames.push(p.name);
                salesRevenues.push(p.salesRevenue);
            }
        });

        if (this.salesRevenueChart) this.salesRevenueChart.destroy();
        const ctxSales = document.getElementById('salesRevenueChart').getContext('2d');

        if (salesNames.length > 0) {
            this.salesRevenueChart = new Chart(ctxSales, {
                type: 'bar',
                data: {
                    labels: salesNames,
                    datasets: [{
                        label: 'Doanh số thực đạt (VNĐ)',
                        data: salesRevenues,
                        backgroundColor: 'rgba(9, 132, 227, 0.7)',
                        borderColor: '#0984e3',
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            ticks: { 
                                color: '#a4b0be',
                                callback: (val) => (val / 1000000) + ' M'
                            } 
                        },
                        x: { ticks: { color: '#a4b0be' } }
                    }
                }
            });
        }

        // ----------------------------------------------------
        // CHART 3: QUỸ LƯƠNG THỰC NHẬN THEO PHÒNG BAN
        // ----------------------------------------------------
        const deptSalaries = {};
        payrollData.forEach(p => {
            if (!deptSalaries[p.department]) deptSalaries[p.department] = 0;
            deptSalaries[p.department] += p.netSalary;
        });

        const deptLabels = Object.keys(deptSalaries);
        const deptValues = Object.values(deptSalaries);

        if (this.deptSalaryChart) this.deptSalaryChart.destroy();
        const ctxDept = document.getElementById('deptSalaryChart').getContext('2d');
        
        if (deptLabels.length > 0) {
            this.deptSalaryChart = new Chart(ctxDept, {
                type: 'bar',
                data: {
                    labels: deptLabels,
                    datasets: [{
                        label: 'Quỹ lương chuyển khoản (VNĐ)',
                        data: deptValues,
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        borderColor: '#2ecc71',
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            ticks: {
                                color: '#a4b0be',
                                callback: (val) => (val / 1000000) + ' M'
                            }
                        },
                        x: { ticks: { color: '#a4b0be' } }
                    }
                }
            });
        }

        // ----------------------------------------------------
        // CHART 4: TỶ LỆ NGHỈ PHÉP
        // ----------------------------------------------------
        const leaveCounts = { 'Phép năm': 0, 'Nghỉ ốm': 0, 'Nghỉ không lương': 0, 'Làm online': 0 };

        leaves.forEach(l => {
            if (l.status === 'approved') {
                const days = Utils.getDaysBetween(l.startDate, l.endDate);
                if (l.type === 'annual_leave') leaveCounts['Phép năm'] += days;
                else if (l.type === 'sick_leave') leaveCounts['Nghỉ ốm'] += days;
                else if (l.type === 'unpaid_leave') leaveCounts['Nghỉ không lương'] += days;
                else if (l.type === 'remote_work') leaveCounts['Làm online'] += days;
            }
        });

        if (this.leavePieChart) this.leavePieChart.destroy();
        const ctxLeave = document.getElementById('leavePieChart').getContext('2d');
        const totalLeaves = Object.values(leaveCounts).reduce((a, b) => a + b, 0);

        if (totalLeaves > 0) {
            this.leavePieChart = new Chart(ctxLeave, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(leaveCounts),
                    datasets: [{
                        data: Object.values(leaveCounts),
                        backgroundColor: [
                            'rgba(46, 204, 113, 0.7)',
                            'rgba(52, 152, 219, 0.7)',
                            'rgba(231, 76, 60, 0.7)',
                            'rgba(243, 156, 18, 0.7)'
                        ],
                        borderColor: '#131526',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#a4b0be', padding: 15 } }
                    }
                }
            });
        }
    },

    // QUYẾT TOÁN THUẾ TNCN CHUYÊN SÂU GỘP NĂM
    calculatePITFinalization() {
        const year = Number(this.yearPicker.value || 2026);
        const employees = Store.getEmployees().filter(e => e.status === 'active');
        const settings = Store.getSettings();

        const selfReductionYear = (settings.pitSelf || 11000000) * 12;
        const dependentReductionMonth = settings.pitDependent || 4400000;

        const finalizationData = employees.map(emp => {
            let totalGrossTaxable = 0;
            let totalOTExempt = 0;
            let totalInsPaid = 0;
            let totalPITPaid = 0;

            for (let monthNum = 1; monthNum <= 12; monthNum++) {
                const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
                const payroll = PayrollModule.calculatePayrollData(monthStr);
                const empPayroll = payroll.find(p => p.employeeId === emp.id);

                if (empPayroll) {
                    totalGrossTaxable += empPayroll.grossTaxableIncome;
                    totalOTExempt += empPayroll.otPayExempt;
                    totalInsPaid += empPayroll.totalInsuranceDeduction;
                    totalPITPaid += empPayroll.pitTax;
                }
            }

            const depReductionYear = (emp.dependents || 0) * dependentReductionMonth * 12;
            const totalReductions = selfReductionYear + depReductionYear + totalInsPaid;
            const assessedIncomeYear = Math.max(0, totalGrossTaxable - totalReductions);

            const averageMonthlyIncome = assessedIncomeYear / 12;
            let avgPIT = 0;

            if (averageMonthlyIncome > 0) {
                if (averageMonthlyIncome <= 5000000) avgPIT = averageMonthlyIncome * 0.05;
                else if (averageMonthlyIncome <= 10000000) avgPIT = averageMonthlyIncome * 0.10 - 250000;
                else if (averageMonthlyIncome <= 18000000) avgPIT = averageMonthlyIncome * 0.15 - 750000;
                else if (averageMonthlyIncome <= 32000000) avgPIT = averageMonthlyIncome * 0.20 - 1650000;
                else if (averageMonthlyIncome <= 52000000) avgPIT = averageMonthlyIncome * 0.25 - 3250000;
                else if (averageMonthlyIncome <= 80000000) avgPIT = averageMonthlyIncome * 0.30 - 5850000;
                else avgPIT = averageMonthlyIncome * 0.35 - 9850000;
            }

            const totalPITFinalReal = Math.round(avgPIT * 12);
            const diff = totalPITFinalReal - totalPITPaid;

            return {
                employeeCode: emp.employeeCode,
                cccd: emp.cccd || '-',
                name: emp.name,
                totalGrossTaxable,
                totalOTExempt,
                totalInsPaid,
                totalReductions,
                assessedIncomeYear,
                totalPITFinalReal,
                totalPITPaid,
                diff
            };
        });

        if (finalizationData.length === 0) {
            this.tablePITBody.innerHTML = '<tr><td colspan="12" class="empty-state">Không có dữ liệu nhân sự để quyết toán.</td></tr>';
            return;
        }

        this.tablePITBody.innerHTML = finalizationData.map(d => {
            let statusBadge = '<span class="badge badge-success">Hoàn thành</span>';
            let diffStyle = '';
            
            if (d.diff > 0) {
                statusBadge = '<span class="badge badge-danger">Nộp thêm</span>';
                diffStyle = 'color: var(--danger-color); font-weight:600;';
            } else if (d.diff < 0) {
                statusBadge = '<span class="badge badge-warning">Hoàn thuế</span>';
                diffStyle = 'color: var(--success-color); font-weight:600;';
            }

            return `
                <tr>
                    <td style="font-weight:600; color:#fff;">${d.employeeCode}</td>
                    <td>${d.cccd}</td>
                    <td style="font-weight:500;">${d.name}</td>
                    <td>${Utils.formatVND(d.totalGrossTaxable)}</td>
                    <td style="color:var(--success-color);">${Utils.formatVND(d.totalOTExempt)}</td>
                    <td>${Utils.formatVND(d.totalInsPaid)}</td>
                    <td>${Utils.formatVND(d.totalReductions - d.totalInsPaid)}</td>
                    <td style="font-weight:500;">${Utils.formatVND(d.assessedIncomeYear)}</td>
                    <td style="color:#fff; font-weight:600;">${Utils.formatVND(d.totalPITFinalReal)}</td>
                    <td>${Utils.formatVND(d.totalPITPaid)}</td>
                    <td style="${diffStyle}">${d.diff !== 0 ? (d.diff > 0 ? '+' : '') + Utils.formatVND(d.diff) : '0 đ'}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');

        this.currentFinalizationData = finalizationData;
    },

    exportPITFinalizationToExcel() {
        const year = this.yearPicker.value;
        const data = this.currentFinalizationData;

        if (!data || data.length === 0) {
            Utils.showToast('Không có dữ liệu quyết toán để xuất!', 'warning');
            return;
        }

        const excelData = data.map(d => ({
            'Mã Nhân Viên': d.employeeCode,
            'Số CCCD': d.cccd,
            'Họ và Tên': d.name,
            'Tổng TN Chịu Thuế Cả Năm (VNĐ)': d.totalGrossTaxable,
            'TN Miễn Thuế OT Cả Năm (VNĐ)': d.totalOTExempt,
            'BHXH Đã Đóng Cả Năm (VNĐ)': d.totalInsPaid,
            'Giảm trừ Gia cảnh Cả Năm (VNĐ)': d.totalReductions - d.totalInsPaid,
            'Tổng Thu Nhập Tính Thuế (VNĐ)': d.assessedIncomeYear,
            'Thuế TNCN Phải Nộp Quyết Toán (VNĐ)': d.totalPITFinalReal,
            'Thuế TNCN Đã Khấu Trừ Tháng (VNĐ)': d.totalPITPaid,
            'Chênh Lệch Thừa/Thiếu (VNĐ)': d.diff,
            'Kết Luận Quyết Toán': d.diff > 0 ? 'Phải nộp thêm' : (d.diff < 0 ? 'Được hoàn thuế' : 'Hoàn thành')
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `QuyetToanThue_${year}`);
        worksheet['!cols'] = Object.keys(excelData[0]).map(() => ({ wch: 22 }));

        XLSX.writeFile(workbook, `Quyet_Toan_Thue_TNCN_${year}.xlsx`);
        Utils.showToast('Đã tải xuống bảng quyết toán!');
    },

    // XUẤT TRỌN BỘ BÁO CÁO 3P CHUYÊN NGHIỆP NHIỀU SHEETS
    exportFullReport() {
        const month = this.monthPicker.value;
        const employees = Store.getEmployees();
        const attendance = Store.getAttendance(month);
        const leaves = Store.getLeaves(month);
        const payrollData = PayrollModule.calculatePayrollData(month);

        if (employees.length === 0) {
            Utils.showToast('Không có dữ liệu để xuất!', 'warning');
            return;
        }

        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];
        const structures = settings.salaryStructures || {};

        const workbook = XLSX.utils.book_new();

        // 1. NHÂN SỰ
        const empSheet = employees.map(emp => {
            const row = {
                'Mã NV': emp.employeeCode,
                'Số CCCD': emp.cccd || '-',
                'Họ và Tên': emp.name,
                'Phòng Ban': emp.department,
                'Chức Vụ': emp.position,
                'Lương Cơ Bản P1': emp.baseSalary,
                'Lương Đóng BH': emp.insuranceSalary || 'Bằng cơ bản',
                'Số NPT': emp.dependents || 0,
                'Ngày Bắt Đầu': emp.startDate,
                'Tài Khoản': emp.bankAccount
            };
            customColumns.forEach(col => {
                row[col.name] = emp.customValues && emp.customValues[col.id] !== undefined ? emp.customValues[col.id] : 0;
            });
            row['Trạng Thái'] = emp.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ việc';
            return row;
        });
        const wsEmp = XLSX.utils.json_to_sheet(empSheet);
        XLSX.utils.book_append_sheet(workbook, wsEmp, 'DanhSachNhanSu');

        // 2. CHẤM CÔNG
        const attSheet = attendance.map(a => {
            const emp = employees.find(e => e.id === a.employeeId);
            return {
                'Mã NV': emp ? emp.employeeCode : 'N/A', 'Họ và Tên': emp ? emp.name : 'Unknown',
                'Ngày': a.date, 'Giờ Vào': a.checkIn, 'Giờ Ra': a.checkOut, 'Số Giờ': a.workHours, 'Giờ OT': a.overtimeHours, 'Ghi Chú': a.note
            };
        });
        const wsAtt = XLSX.utils.json_to_sheet(attSheet);
        XLSX.utils.book_append_sheet(workbook, wsAtt, 'ChamCong');

        // 3. ĐƠN PHÉP
        const leaveSheet = leaves.map(l => {
            const emp = employees.find(e => e.id === l.employeeId);
            let type = l.type === 'annual_leave' ? 'Nghỉ phép năm' : (l.type === 'sick_leave' ? 'Nghỉ ốm' : (l.type === 'unpaid_leave' ? 'Nghỉ không lương' : 'Làm online'));
            return {
                'Mã NV': emp ? emp.employeeCode : 'N/A', 'Họ và Tên': emp ? emp.name : 'Unknown',
                'Loại Đơn': type, 'Từ Ngày': l.startDate, 'Đến Ngày': l.endDate, 'Lý Do': l.reason, 'Trạng Thái': l.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'
            };
        });
        const wsLeave = XLSX.utils.json_to_sheet(leaveSheet);
        XLSX.utils.book_append_sheet(workbook, wsLeave, 'DonPhep');

        // 4. BẢNG TÍNH LƯƠNG KPI RIÊNG BIỆT (PHỤC VỤ PHÂN QUYỀN)
        const kpiEmployees = payrollData.filter(p => p.struct.useKPI);
        const kpiSheetData = kpiEmployees.map(p => ({
            'Mã NV': p.employeeCode,
            'Họ và Tên': p.name,
            'Phòng Ban': p.department,
            'Chức Vụ': p.position,
            'Lương KPI Mục Tiêu (VNĐ)': p.kpiTarget,
            'Điểm KPI Đạt Được (%)': p.kpiScore,
            'Lương KPI Thực Lĩnh (VNĐ)': p.kpiEarned
        }));
        
        const wsKPI = XLSX.utils.json_to_sheet(kpiSheetData);
        if (kpiEmployees.length > 0) {
            for (let i = 0; i < kpiSheetData.length; i++) {
                const rowNum = i + 2;
                const cellG = wsKPI[`G${rowNum}`];
                if (cellG) {
                    cellG.t = 'f';
                    cellG.f = `ROUND(E${rowNum}*F${rowNum}/100,0)`;
                }
            }
            wsKPI['!cols'] = Object.keys(kpiSheetData[0]).map(() => ({ wch: 18 }));
            XLSX.utils.book_append_sheet(workbook, wsKPI, `Tinh_Luong_KPI_${month}`);
        }

        // 5. BẢNG TÍNH HOA HỒNG DOANH SỐ RIÊNG BIỆT (PHỤC VỤ PHÂN QUYỀN)
        const salesEmployees = payrollData.filter(p => p.struct.useSales);
        const salesSheetData = salesEmployees.map(p => ({
            'Mã NV': p.employeeCode,
            'Họ và Tên': p.name,
            'Phòng Ban': p.department,
            'Doanh Thu Bán Hàng (VNĐ)': p.salesRevenue,
            'Tỷ Lệ Hoa Hồng (%)': p.commissionRate,
            'Thưởng Doanh Số Thực Lĩnh (VNĐ)': p.salesEarned
        }));
        
        const wsSales = XLSX.utils.json_to_sheet(salesSheetData);
        if (salesEmployees.length > 0) {
            for (let i = 0; i < salesSheetData.length; i++) {
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
            wsSales['!cols'] = Object.keys(salesSheetData[0]).map(() => ({ wch: 18 }));
            XLSX.utils.book_append_sheet(workbook, wsSales, `Hoa_Hong_Sales_${month}`);
        }

        // 6. BẢNG LƯƠNG TỔNG HỢP 3P CUỐI CÙNG
        const wsPayData = payrollData.map(p => {
            const row = {
                'Mã NV': p.employeeCode,
                'Họ và Tên': p.name,
                'Lương Cơ Bản P1 (VNĐ)': p.baseSalaryApplied,
                'Ngày Công Chuẩn': p.stdWorkDays,
                'Công Thực Tế': p.actualWorkDays,
                'Lương Theo Ngày Công': Math.round(p.scaleSalary),
                'Lương Hiệu Quả P3 (VNĐ)': Math.round(p.p3Earned)
            };
            
            customColumns.forEach(col => {
                let val = p.appliedCustomValues[col.id] || 0;
                if (col.type === 'allowance') {
                    val = (val / p.stdWorkDays) * p.totalPaidDays;
                }
                row[col.name + ' P2'] = Math.round(val);
            });
            
            row['Số Người Phụ Thuộc'] = p.dependents || 0;
            row['Bảo Hiểm Khấu Trừ'] = Math.round(p.totalInsuranceDeduction);
            row['Thuế TNCN'] = Math.round(p.pitTax);
            row['Thực Nhận Chuyển Khoản'] = Math.round(p.netSalary);
            return row;
        });

        const wsPay = XLSX.utils.json_to_sheet(wsPayData);
        
        for (let i = 0; i < wsPayData.length; i++) {
            const rowNum = i + 2;
            const p = payrollData[i];
            
            // Lương theo công: Col F (C=Lương cơ bản, D=Ngày công chuẩn, E=Công thực tế, F=Lương theo ngày công)
            const cellF = wsPay[`F${rowNum}`];
            if (cellF) {
                cellF.t = 'f';
                cellF.f = `ROUND(C${rowNum}*E${rowNum}/D${rowNum},0)`;
            }

            // Lương hiệu quả P3: Col G (VLOOKUP từ các sheet con)
            const cellG = wsPay[`G${rowNum}`];
            if (cellG) {
                const struct = structures[p.department] || { useKPI: true, useSales: false, kpiWeight: 100, salesWeight: 0 };
                const kpiW = struct.useKPI ? (struct.kpiWeight / 100) : 0;
                const salesW = struct.useSales ? (struct.salesWeight / 100) : 0;
                
                cellG.t = 'f';
                cellG.f = `ROUND((IFERROR(VLOOKUP(A${rowNum},'Tinh_Luong_KPI_${month}'!A:G,7,FALSE),0)*${kpiW})+(IFERROR(VLOOKUP(A${rowNum},'Hoa_Hong_Sales_${month}'!A:F,6,FALSE),0)*${salesW}),0)`;
            }

            const numCustom = customColumns.length;
            
            // Số Người Phụ Thuộc
            const depColIdx = 7 + numCustom;
            const depColLetter = Utils.getColLetter(depColIdx);
            
            // Bảo hiểm trích (10.5%)
            const insColIdx = 8 + numCustom;
            const insColLetter = Utils.getColLetter(insColIdx);
            const cellIns = wsPay[`${insColLetter}${rowNum}`];
            if (cellIns) {
                cellIns.t = 'f';
                cellIns.f = `ROUND(MIN(46800000,C${rowNum})*0.105,0)`;
            }

            // Thuế TNCN
            const taxColIdx = 9 + numCustom;
            const taxColLetter = Utils.getColLetter(taxColIdx);
            const cellTax = wsPay[`${taxColLetter}${rowNum}`];
            if (cellTax) {
                let taxableCustomFormula = '';
                customColumns.forEach((col, idx) => {
                    if (col.taxable) {
                        const colL = Utils.getColLetter(7 + idx);
                        taxableCustomFormula += `+${colL}${rowNum}`;
                    }
                });
                
                const T_formula = `MAX(0,F${rowNum}+G${rowNum}${taxableCustomFormula}-11000000-(${depColLetter}${rowNum}*4400000)-${insColLetter}${rowNum})`;
                
                cellTax.t = 'f';
                cellTax.f = `IF(${T_formula}<=0,0,IF(${T_formula}<=5000000,${T_formula}*0.05,IF(${T_formula}<=10000000,${T_formula}*0.1-250000,IF(${T_formula}<=18000000,${T_formula}*0.15-750000,IF(${T_formula}<=32000000,${T_formula}*0.2-1650000,IF(${T_formula}<=52000000,${T_formula}*0.25-3250000,IF(${T_formula}<=80000000,${T_formula}*0.3-5850000,${T_formula}*0.35-9850000)))))))`;
            }

            // Thực nhận
            const netColIdx = 10 + numCustom;
            const netColLetter = Utils.getColLetter(netColIdx);
            const cellNet = wsPay[`${netColLetter}${rowNum}`];
            if (cellNet) {
                let customColsFormula = '';
                customColumns.forEach((col, idx) => {
                    const colL = Utils.getColLetter(7 + idx);
                    customColsFormula += `+${colL}${rowNum}`;
                });
                
                cellNet.t = 'f';
                cellNet.f = `MAX(0,F${rowNum}+G${rowNum}${customColsFormula}-${insColLetter}${rowNum}-${taxColLetter}${rowNum})`;
            }
        }
        
        wsPay['!cols'] = Object.keys(wsPayData[0]).map(() => ({ wch: 18 }));
        XLSX.utils.book_append_sheet(workbook, wsPay, `BangLuong_TongHop_${month}`);

        XLSX.writeFile(workbook, `Bao_Cao_Gop_3P_Toan_Dien_${month}.xlsx`);
        Utils.showToast('Đã kết xuất và tải xuống trọn bộ báo cáo 3P đa trang!');
    }
};
