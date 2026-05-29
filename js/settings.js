/* ==========================================
   HR PAYROLL SETTINGS MODULE v3
   ========================================== */

const SettingsModule = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadSettings();
        this.renderCustomColumns();
        this.renderSalaryStructures();
    },

    cacheDOM() {
        this.viewSection = document.getElementById('view-settings');
        
        // Form Fields
        this.fieldStdDays = document.getElementById('set-standard-days');
        this.fieldStdHours = document.getElementById('set-standard-hours');
        this.fieldOTNormal = document.getElementById('set-ot-normal');
        this.fieldOTWeekend = document.getElementById('set-ot-weekend');
        this.fieldOTHoliday = document.getElementById('set-ot-holiday');
        
        // Bảo hiểm & PIT
        this.fieldInsSocial = document.getElementById('set-ins-social');
        this.fieldInsHealth = document.getElementById('set-ins-health');
        this.fieldInsUnemp = document.getElementById('set-ins-unemp');
        this.fieldPITSelf = document.getElementById('set-pit-self');
        this.fieldPITDep = document.getElementById('set-pit-dep');

        // Dynamic Columns Management
        this.tableCustomColsBody = document.querySelector('#table-custom-columns tbody');
        this.colNewName = document.getElementById('col-new-name');
        this.colNewType = document.getElementById('col-new-type');
        this.colNewTaxable = document.getElementById('col-new-taxable');
        this.colNewInsurance = document.getElementById('col-new-insurance');
        this.btnAddCustomCol = document.getElementById('btn-add-custom-column');

        // 3P Salary Structures Table
        this.tableStructuresBody = document.querySelector('#table-salary-structures tbody');

        // Buttons
        this.btnSave = document.getElementById('btn-save-settings');
        this.btnReset = document.getElementById('btn-reset-settings');
    },

    bindEvents() {
        this.btnSave.addEventListener('click', () => this.saveSettings());
        this.btnReset.addEventListener('click', () => this.resetSettings());
        
        // Custom Columns Actions
        this.btnAddCustomCol.addEventListener('click', () => this.addNewCustomColumn());
        this.tableCustomColsBody.addEventListener('click', (e) => this.handleCustomColumnActions(e));

        // 3P Structures Interactive Actions (Low-code inputs)
        this.tableStructuresBody.addEventListener('change', (e) => this.handleStructureChange(e));
        this.tableStructuresBody.addEventListener('input', (e) => this.handleStructureSliderInput(e));

        // Nút chạy thử Sandbox Kế Toán Công Thức
        const btnRunSandbox = document.getElementById('btn-run-sandbox');
        if (btnRunSandbox) {
            btnRunSandbox.addEventListener('click', () => this.runFormulaSandbox());
        }
    },

    loadSettings() {
        const settings = Store.getSettings();

        this.fieldStdDays.value = settings.standardWorkDays;
        this.fieldStdHours.value = settings.standardWorkHours;
        
        if (settings.overtimeRates) {
            this.fieldOTNormal.value = settings.overtimeRates.normal;
            this.fieldOTWeekend.value = settings.overtimeRates.weekend;
            this.fieldOTHoliday.value = settings.overtimeRates.holiday;
        }

        if (settings.insurance) {
            this.fieldInsSocial.value = settings.insurance.social;
            this.fieldInsHealth.value = settings.insurance.health;
            this.fieldInsUnemp.value = settings.insurance.unemployment;
        }

        this.fieldPITSelf.value = settings.pitSelf || 11000000;
        this.fieldPITDep.value = settings.pitDependent || 4400000;
    },

    saveSettings() {
        const settings = Store.getSettings();
        
        settings.standardWorkDays = Number(this.fieldStdDays.value || 26);
        settings.standardWorkHours = Number(this.fieldStdHours.value || 8);
        
        settings.overtimeRates = {
            normal: Number(this.fieldOTNormal.value || 1.5),
            weekend: Number(this.fieldOTWeekend.value || 2.0),
            holiday: Number(this.fieldOTHoliday.value || 3.0)
        };
        
        settings.insurance = {
            social: Number(this.fieldInsSocial.value || 8),
            health: Number(this.fieldInsHealth.value || 1.5),
            unemployment: Number(this.fieldInsUnemp.value || 1)
        };

        settings.pitSelf = Number(this.fieldPITSelf.value || 11000000);
        settings.pitDependent = Number(this.fieldPITDep.value || 4400000);

        Store.saveSettings(settings);
        Utils.showToast('Lưu cấu hình hệ thống thành công!');
        
        if (window.App && typeof window.App.refreshAllData === 'function') {
            window.App.refreshAllData();
        }
    },

    resetSettings() {
        if (confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt và danh sách cột lương về mặc định?')) {
            Store.saveSettings(Store.DEFAULT_SETTINGS);
            this.loadSettings();
            this.renderCustomColumns();
            this.renderSalaryStructures();
            Utils.showToast('Đã khôi phục cấu hình mặc định!', 'info');
            
            if (window.App && typeof window.App.refreshAllData === 'function') {
                window.App.refreshAllData();
            }
        }
    },

    // ==========================================
    // LOW-CODE 3P SALARY BUILDER RENDERING
    // ==========================================
    renderSalaryStructures() {
        const settings = Store.getSettings();
        const structures = settings.salaryStructures || {};
        
        const depts = ["Kỹ thuật - IT", "Hành chính - Nhân sự", "Kinh doanh", "Marketing", "Kế toán"];
        
        this.tableStructuresBody.innerHTML = depts.map(dept => {
            // Lấy cấu hình của phòng ban, nếu chưa có thì gán mặc định
            const s = structures[dept] || { useP1: true, useKPI: true, kpiWeight: 100, useSales: false, salesWeight: 0, targetKPI: 2000000 };
            
            // Viết sinh công thức động hiển thị thời gian thực (Low-code)
            let formulaText = '<span style="color:var(--text-muted); font-size:11px;">Chỉ dùng Lương cứng</span>';
            if (s.useKPI && s.useSales) {
                formulaText = `<strong style="color:#a855f7; font-size:11px;">P3 = KPI * ${s.kpiWeight}% + Sales * ${s.salesWeight}%</strong>`;
            } else if (s.useKPI) {
                formulaText = `<strong style="color:var(--primary-color); font-size:11px;">P3 = Lương KPI * 100%</strong>`;
            } else if (s.useSales) {
                formulaText = `<strong style="color:var(--warning-color); font-size:11px;">P3 = Lương Sales * 100%</strong>`;
            }

            // Thanh trượt Slider trọng số % nếu bật cả hai
            let sliderHTML = '<span style="color:var(--text-muted); font-size:11px;">-</span>';
            if (s.useKPI && s.useSales) {
                sliderHTML = `
                    <div class="slider-container" style="margin-top:5px;">
                        <input type="range" class="struct-slider" data-dept="${dept}" min="0" max="100" value="${s.kpiWeight}">
                        <span class="slider-val" id="slider-val-${dept}">${s.kpiWeight}% / ${s.salesWeight}%</span>
                    </div>
                `;
            }

            return `
                <tr>
                    <td style="font-weight:600; color:#fff;">${dept}</td>
                    <!-- P1 Cố định -->
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="struct-toggle" data-dept="${dept}" data-field="useP1" ${s.useP1 ? 'checked' : ''}>
                            <span class="slider-round"></span>
                        </label>
                    </td>
                    <!-- Bật KPI -->
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="struct-toggle" data-dept="${dept}" data-field="useKPI" ${s.useKPI ? 'checked' : ''}>
                            <span class="slider-round"></span>
                        </label>
                    </td>
                    <!-- Lương KPI mục tiêu -->
                    <td>
                        <input type="number" class="editable-cell struct-target-kpi" data-dept="${dept}" value="${s.targetKPI || 0}" style="width:110px;" ${!s.useKPI ? 'disabled' : ''}>
                    </td>
                    <!-- Bật Sales -->
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="struct-toggle" data-dept="${dept}" data-field="useSales" ${s.useSales ? 'checked' : ''}>
                            <span class="slider-round"></span>
                        </label>
                    </td>
                    <!-- Slider Trọng số -->
                    <td>
                        ${sliderHTML}
                    </td>
                    <!-- Công thức động -->
                    <td>
                        ${formulaText}
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons();
    },

    // Xử lý thay đổi cấu hình 3P Low-code tương tác
    handleStructureChange(e) {
        const settings = Store.getSettings();
        const structures = settings.salaryStructures || {};

        // 1. Nhóm nút Switch Bật/Tắt thành phần lương
        if (e.target.classList.contains('struct-toggle')) {
            const dept = e.target.dataset.dept;
            const field = e.target.dataset.field;
            const val = e.target.checked;

            if (!structures[dept]) {
                structures[dept] = { useP1: true, useKPI: true, kpiWeight: 100, useSales: false, salesWeight: 0, targetKPI: 2000000 };
            }

            structures[dept][field] = val;

            // Tự động tối ưu trọng số khi bật tắt
            const s = structures[dept];
            if (s.useKPI && s.useSales) {
                s.kpiWeight = 50; // Chia đều 50/50 làm mẫu ban đầu
                s.salesWeight = 50;
            } else if (s.useKPI) {
                s.kpiWeight = 100;
                s.salesWeight = 0;
            } else if (s.useSales) {
                s.kpiWeight = 0;
                s.salesWeight = 100;
            } else {
                s.kpiWeight = 0;
                s.salesWeight = 0;
            }

            settings.salaryStructures = structures;
            Store.saveSettings(settings);
            this.renderSalaryStructures();
        }

        // 2. Nhập Lương KPI mục tiêu
        else if (e.target.classList.contains('struct-target-kpi')) {
            const dept = e.target.dataset.dept;
            const val = Math.max(0, Number(e.target.value || 0));

            if (!structures[dept]) {
                structures[dept] = { useP1: true, useKPI: true, kpiWeight: 100, useSales: false, salesWeight: 0, targetKPI: 2000000 };
            }

            structures[dept].targetKPI = val;
            settings.salaryStructures = structures;
            Store.saveSettings(settings);
            this.renderSalaryStructures();
        }
    },

    // Xử lý kéo thả Slider trọng số linh hoạt (Low-code)
    handleStructureSliderInput(e) {
        if (!e.target.classList.contains('struct-slider')) return;

        const dept = e.target.dataset.dept;
        const kpiW = Number(e.target.value);
        const salesW = 100 - kpiW;

        const textVal = document.getElementById(`slider-val-${dept}`);
        if (textVal) {
            textVal.innerText = `${kpiW}% / ${salesW}%`;
        }

        // Lưu cấu hình ngay lập tức khi kéo slider
        const settings = Store.getSettings();
        const structures = settings.salaryStructures || {};

        if (structures[dept]) {
            structures[dept].kpiWeight = kpiW;
            structures[dept].salesWeight = salesW;
            
            // Cập nhật công thức hiển thị động kế bên trong 1s trễ
            settings.salaryStructures = structures;
            
            // Tắt báo log liên tục khi đang kéo để tránh rác timeline
            localStorage.setItem(Store.KEYS.SETTINGS, JSON.stringify(settings));
            
            // Cập nhật lại công thức động ngay lập tức
            const tr = e.target.closest('tr');
            if (tr) {
                const formulaTd = tr.querySelector('td:last-child');
                if (formulaTd) {
                    formulaTd.innerHTML = `<strong style="color:#a855f7; font-size:11px;">P3 = KPI * ${kpiW}% + Sales * ${salesW}%</strong>`;
                }
            }
        }
    },

    // ==========================================
    // QUẢN LÝ CỘT LƯƠNG/PHỤ CẤP ĐỘNG
    // ==========================================
    renderCustomColumns() {
        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];

        if (customColumns.length === 0) {
            this.tableCustomColsBody.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding:15px;">Chưa có cột lương/phụ cấp tùy chỉnh nào.</td></tr>';
            return;
        }

        this.tableCustomColsBody.innerHTML = customColumns.map(col => {
            let typeLabel = col.type === 'allowance' ? 'Phụ cấp (Allowance)' : (col.type === 'bonus' ? 'Thưởng (Bonus)' : 'Khấu trừ (Deduction)');
            return `
                <tr>
                    <td style="font-weight:600; color:#fff;">${col.name}</td>
                    <td>${typeLabel}</td>
                    <td><span class="badge ${col.taxable ? 'badge-success' : 'badge-danger'}">${col.taxable ? 'Chịu thuế' : 'Miễn thuế'}</span></td>
                    <td><span class="badge ${col.insurance ? 'badge-info' : 'badge-danger'}">${col.insurance ? 'Đóng bảo hiểm' : 'Không đóng'}</span></td>
                    <td>
                        <button class="action-icon delete" data-id="${col.id}" data-action="delete" title="Xóa cột này">
                            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();
    },

    addNewCustomColumn() {
        const name = this.colNewName.value.trim();
        const type = this.colNewType.value;
        const taxable = this.colNewTaxable.checked;
        const insurance = this.colNewInsurance.checked;

        if (!name) {
            Utils.showToast('Vui lòng nhập tên cột lương/phụ cấp!', 'warning');
            return;
        }

        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];

        if (customColumns.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            Utils.showToast('Tên cột lương này đã tồn tại!', 'error');
            return;
        }

        const newColumn = {
            id: 'col_custom_' + Utils.generateId(), name, type, taxable, insurance
        };

        customColumns.push(newColumn);
        settings.customColumns = customColumns;
        Store.saveSettings(settings);

        const employees = Store.getEmployees();
        employees.forEach(emp => {
            if (!emp.customValues) emp.customValues = {};
            emp.customValues[newColumn.id] = 0;
        });
        localStorage.setItem(Store.KEYS.EMPLOYEES, JSON.stringify(employees));

        Utils.showToast(`Đã thêm cột lương động mới: ${name}!`);
        this.colNewName.value = '';
        this.colNewTaxable.checked = true;
        this.colNewInsurance.checked = false;

        this.renderCustomColumns();

        if (window.App && typeof window.App.refreshAllData === 'function') {
            window.App.refreshAllData();
        }
    },

    handleCustomColumnActions(e) {
        const target = e.target.closest('.action-icon');
        if (!target) return;

        const id = target.dataset.id;
        const action = target.dataset.action;

        if (action === 'delete') {
            const settings = Store.getSettings();
            const customColumns = settings.customColumns || [];
            const col = customColumns.find(c => c.id === id);

            if (!col) return;

            if (confirm(`Bạn có chắc chắn muốn xóa cột "${col.name}"? Dữ liệu đã lưu sẽ mất.`)) {
                settings.customColumns = customColumns.filter(c => c.id !== id);
                Store.saveSettings(settings);

                const employees = Store.getEmployees();
                employees.forEach(emp => {
                    if (emp.customValues) delete emp.customValues[id];
                });
                localStorage.setItem(Store.KEYS.EMPLOYEES, JSON.stringify(employees));

                const adjusts = Store.getAllAdjustments();
                adjusts.forEach(adj => {
                    if (adj.customValues) delete adj.customValues[id];
                });
                localStorage.setItem(Store.KEYS.ADJUSTMENTS, JSON.stringify(adjusts));

                Utils.showToast(`Đã xóa cột lương động: ${col.name}!`, 'info');
                this.renderCustomColumns();

                if (window.App && typeof window.App.refreshAllData === 'function') {
                    window.App.refreshAllData();
                }
            }
        }
    },

    // Trình Mô Phỏng Sandbox Công Thức Lương 3P & Thuế TNCN
    runFormulaSandbox() {
        const baseSalary = Number(document.getElementById('sb-base-salary').value || 0);
        const actualDays = Number(document.getElementById('sb-actual-days').value || 0);
        const stdDays = Number(document.getElementById('sb-std-days').value || 26);
        const kpiTarget = Number(document.getElementById('sb-kpi-target').value || 0);
        const kpiScore = Number(document.getElementById('sb-kpi-score').value || 0);
        const salesRevenue = Number(document.getElementById('sb-sales-revenue').value || 0);
        const dependents = Number(document.getElementById('sb-dependents').value || 0);
        const allowance = Number(document.getElementById('sb-allowance').value || 0);
        const allowanceExempt = Number(document.getElementById('sb-allowance-exempt').value || 0);

        // 1. Lương theo công (P1)
        const scaleSalary = Math.round(baseSalary * actualDays / stdDays);
        document.getElementById('sb-res-p1').innerText = Utils.formatVND(scaleSalary);
        document.getElementById('sb-exp-p1').innerText = `Công thức: Lương cơ bản (${Utils.formatVND(baseSalary)}) × ${actualDays} ngày công / ${stdDays} công chuẩn`;

        // 2. Lương KPI (P3.1)
        const kpiEarned = Math.round(kpiTarget * kpiScore / 100);
        document.getElementById('sb-res-p31').innerText = Utils.formatVND(kpiEarned);
        document.getElementById('sb-exp-p31').innerText = `Công thức: KPI mục tiêu (${Utils.formatVND(kpiTarget)}) × ${kpiScore}% hoàn thành`;

        // 3. Lương doanh số (P3.2)
        let commissionRate = 0;
        if (salesRevenue > 0) {
            if (salesRevenue >= 100000000) commissionRate = 4.0;
            else if (salesRevenue >= 50000000) commissionRate = 2.5;
            else commissionRate = 1.0;
        }
        const salesEarned = Math.round(salesRevenue * commissionRate / 100);
        document.getElementById('sb-res-p32').innerText = Utils.formatVND(salesEarned);
        document.getElementById('sb-exp-p32').innerText = `Công thức: Doanh thu (${Utils.formatVND(salesRevenue)}) × Hoa hồng ${commissionRate}% (Lũy tiến bậc)`;

        // 4. Tổng thu nhập Gross
        const grossEarnings = scaleSalary + kpiEarned + salesEarned + allowance + allowanceExempt;
        document.getElementById('sb-res-gross').innerText = Utils.formatVND(grossEarnings);

        // 5. Khấu trừ bảo hiểm (10.5%)
        const insBase = Math.min(46800000, baseSalary);
        const insDeduct = Math.round(insBase * 0.105);
        document.getElementById('sb-res-ins').innerText = Utils.formatVND(insDeduct);
        document.getElementById('sb-exp-ins').innerText = `Công thức: MIN(Lương cơ bản, 46.8M) × 10.5%. Mức nền đóng: ${Utils.formatVND(insBase)}`;

        // 6. Giảm trừ gia cảnh tổng
        const selfReduction = 11000000;
        const depReduction = dependents * 4400000;
        const totalReductions = selfReduction + depReduction + insDeduct;
        document.getElementById('sb-res-deduct').innerText = Utils.formatVND(selfReduction + depReduction);
        document.getElementById('sb-exp-deduct').innerText = `Giảm trừ: 11.0M bản thân + ${dependents} NPT (${Utils.formatVND(depReduction)})`;

        // 7. Thu nhập tính thuế TNCN (T)
        const grossTaxable = scaleSalary + kpiEarned + salesEarned + allowance;
        const netTaxable = Math.max(0, grossTaxable - totalReductions);
        document.getElementById('sb-res-taxable').innerText = Utils.formatVND(netTaxable);

        // 8. Thuế TNCN
        let pitTax = 0;
        let pitExplanation = '';
        if (netTaxable > 0) {
            if (netTaxable <= 5000000) {
                pitTax = netTaxable * 0.05;
                pitExplanation = `Bậc 1 (≤5M): ${Utils.formatVND(netTaxable)} × 5%`;
            } else if (netTaxable <= 10000000) {
                pitTax = netTaxable * 0.10 - 250000;
                pitExplanation = `Bậc 2 (5M-10M): ${Utils.formatVND(netTaxable)} × 10% - 250k`;
            } else if (netTaxable <= 18000000) {
                pitTax = netTaxable * 0.15 - 750000;
                pitExplanation = `Bậc 3 (10M-18M): ${Utils.formatVND(netTaxable)} × 15% - 750k`;
            } else if (netTaxable <= 32000000) {
                pitTax = netTaxable * 0.20 - 1650000;
                pitExplanation = `Bậc 4 (18M-32M): ${Utils.formatVND(netTaxable)} × 20% - 1.65M`;
            } else if (netTaxable <= 52000000) {
                pitTax = netTaxable * 0.25 - 3250000;
                pitExplanation = `Bậc 5 (32M-52M): ${Utils.formatVND(netTaxable)} × 25% - 3.25M`;
            } else if (netTaxable <= 80000000) {
                pitTax = netTaxable * 0.30 - 5850000;
                pitExplanation = `Bậc 6 (52M-80M): ${Utils.formatVND(netTaxable)} × 30% - 5.85M`;
            } else {
                pitTax = netTaxable * 0.35 - 9850000;
                pitExplanation = `Bậc 7 (>80M): ${Utils.formatVND(netTaxable)} × 35% - 9.85M`;
            }
        } else {
            pitExplanation = 'Thu nhập tính thuế ≤ 0 đ (Miễn nộp thuế)';
        }
        pitTax = Math.round(pitTax);
        document.getElementById('sb-res-pit').innerText = Utils.formatVND(pitTax);
        document.getElementById('sb-exp-pit').innerText = pitExplanation;

        // 9. Thực lĩnh Net
        const netSalary = Math.max(0, grossEarnings - insDeduct - pitTax);
        document.getElementById('sb-res-net').innerText = Utils.formatVND(netSalary);

        // Hiển thị kết quả Sandbox
        const resultsContainer = document.getElementById('sandbox-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            setTimeout(() => {
                resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
        lucide.createIcons();
    }
};
