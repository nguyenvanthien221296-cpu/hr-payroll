/* ==========================================
   HR PAYROLL EMPLOYEES MODULE
   ========================================== */

const EmployeesModule = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.render();
        this.updateDeptFilters();
    },

    cacheDOM() {
        this.viewSection = document.getElementById('view-employees');
        this.tableBody = document.querySelector('#table-employees tbody');
        this.btnSave = document.querySelector('#form-employee button[type="submit"]');
        this.form = document.getElementById('form-employee');
        this.modal = document.getElementById('modal-employee');
        this.btnAdd = document.getElementById('btn-add-employee');
        this.btnCancel = document.getElementById('btn-cancel-employee');
        this.btnCloseModal = document.getElementById('btn-close-employee-modal');
        
        // Search & Filters
        this.searchField = document.getElementById('employee-search');
        this.deptFilter = document.getElementById('employee-dept-filter');
        
        // Form Fields
        this.fieldId = document.getElementById('emp-id');
        this.fieldCode = document.getElementById('emp-code');
        this.fieldCCCD = document.getElementById('emp-cccd');
        this.fieldName = document.getElementById('emp-name');
        this.fieldDept = document.getElementById('emp-dept');
        this.fieldPosition = document.getElementById('emp-position');
        this.fieldSalary = document.getElementById('emp-salary');
        this.fieldInsSalary = document.getElementById('emp-ins-salary');
        this.fieldDependents = document.getElementById('emp-dependents');
        this.fieldStartDate = document.getElementById('emp-start-date');
        this.fieldBank = document.getElementById('emp-bank-account');
        this.fieldStatus = document.getElementById('emp-status');
        
        // Nơi sinh các cột động
        this.containerDynamicFields = document.getElementById('container-dynamic-fields-employee');

        // Excel Import
        this.btnImportTrigger = document.getElementById('btn-import-employees-trigger');
        this.excelFileInput = document.getElementById('excel-employees-file');
    },

    bindEvents() {
        this.btnAdd.addEventListener('click', () => this.openModal());
        this.btnCancel.addEventListener('click', () => this.closeModal());
        this.btnCloseModal.addEventListener('click', () => this.closeModal());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        this.searchField.addEventListener('input', () => this.render());
        this.deptFilter.addEventListener('change', () => this.render());

        this.tableBody.addEventListener('click', (e) => this.handleTableActions(e));

        this.btnImportTrigger.addEventListener('click', () => this.excelFileInput.click());
        this.excelFileInput.addEventListener('change', (e) => this.handleExcelImport(e));
    },

    // Sinh động các trường nhập liệu phụ cấp/lương trong modal
    renderDynamicFormFields(employee = null) {
        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];
        
        if (customColumns.length === 0) {
            this.containerDynamicFields.innerHTML = '<p style="color:var(--text-muted); font-size:12px; grid-column: 1 / -1;">Không có cột phụ cấp động nào được cấu hình. Bạn có thể thêm cột tại màn hình Cài đặt.</p>';
            return;
        }

        const values = employee && employee.customValues ? employee.customValues : {};

        this.containerDynamicFields.innerHTML = customColumns.map(col => {
            const val = values[col.id] !== undefined ? values[col.id] : 0;
            let typeLabel = col.type === 'allowance' ? 'Phụ cấp' : (col.type === 'bonus' ? 'Thưởng' : 'Khấu trừ');
            let configDetails = `(${typeLabel} | PIT: ${col.taxable ? 'Có' : 'Không'} | BH: ${col.insurance ? 'Có' : 'Không'})`;
            
            return `
                <div class="form-group dynamic-field-row">
                    <label for="emp-custom-${col.id}">${col.name} ${configDetails}</label>
                    <input type="number" id="emp-custom-${col.id}" name="custom_${col.id}" value="${val}" placeholder="0">
                </div>
            `;
        }).join('');
    },

    openModal(employee = null) {
        this.form.reset();
        
        if (employee) {
            document.getElementById('employee-modal-title').innerText = 'Chỉnh sửa nhân viên';
            this.fieldId.value = employee.id;
            this.fieldCode.value = employee.employeeCode;
            this.fieldCode.disabled = true;
            this.fieldCCCD.value = employee.cccd || '';
            this.fieldName.value = employee.name;
            this.fieldDept.value = employee.department;
            this.fieldPosition.value = employee.position;
            this.fieldSalary.value = employee.baseSalary;
            this.fieldInsSalary.value = employee.insuranceSalary || '';
            this.fieldDependents.value = employee.dependents !== undefined ? employee.dependents : 0;
            this.fieldStartDate.value = employee.startDate || '';
            this.fieldBank.value = employee.bankAccount || '';
            this.fieldStatus.value = employee.status;
            
            this.renderDynamicFormFields(employee);
        } else {
            document.getElementById('employee-modal-title').innerText = 'Thêm nhân viên mới';
            this.fieldId.value = '';
            this.fieldCode.disabled = false;
            this.fieldStartDate.value = new Date().toISOString().substring(0, 10);
            this.fieldDependents.value = 0;
            this.fieldInsSalary.value = '';
            this.fieldCCCD.value = '';
            
            this.renderDynamicFormFields(null);
        }
        
        this.modal.classList.add('active');
    },

    closeModal() {
        this.modal.classList.remove('active');
    },

    handleSubmit(e) {
        e.preventDefault();

        // Đọc các giá trị cột tùy chỉnh động từ form
        const settings = Store.getSettings();
        const customColumns = settings.customColumns || [];
        const customValues = {};

        customColumns.forEach(col => {
            const inputElement = document.getElementById(`emp-custom-${col.id}`);
            if (inputElement) {
                customValues[col.id] = Number(inputElement.value || 0);
            }
        });

        const employee = {
            id: this.fieldId.value || null,
            employeeCode: this.fieldCode.value.trim(),
            cccd: this.fieldCCCD.value.trim(),
            name: this.fieldName.value.trim(),
            department: this.fieldDept.value,
            position: this.fieldPosition.value.trim(),
            baseSalary: Number(this.fieldSalary.value),
            insuranceSalary: this.fieldInsSalary.value ? Number(this.fieldInsSalary.value) : null,
            dependents: Number(this.fieldDependents.value || 0),
            startDate: this.fieldStartDate.value,
            bankAccount: this.fieldBank.value.trim(),
            status: this.fieldStatus.value,
            customValues
        };

        // CCCD Việt Nam có 12 số
        if (employee.cccd.length !== 12 || isNaN(employee.cccd)) {
            Utils.showToast('Số Căn cước công dân (CCCD) phải gồm đúng 12 chữ số!', 'error');
            return;
        }

        try {
            const success = Store.saveEmployee(employee);
            if (success) {
                Utils.showToast(this.fieldId.value ? 'Cập nhật thành công!' : 'Đã thêm nhân viên mới!');
                this.closeModal();
                this.render();
                this.updateDeptFilters();
                
                if (window.App && typeof window.App.refreshAllData === 'function') {
                    window.App.refreshAllData();
                }
            }
        } catch (error) {
            Utils.showToast(error.message, 'error');
        }
    },

    handleTableActions(e) {
        const target = e.target.closest('.action-icon');
        if (!target) return;

        const id = target.dataset.id;
        const action = target.dataset.action;
        const employees = Store.getEmployees();
        const emp = employees.find(x => x.id === id);

        if (!emp) return;

        if (action === 'edit') {
            this.openModal(emp);
        } else if (action === 'delete') {
            if (confirm(`Bạn có chắc chắn muốn xóa nhân viên ${emp.name} (${emp.employeeCode})? Mọi chấm công và cấu hình tính lương sẽ bị xóa.`)) {
                Store.deleteEmployee(id);
                Utils.showToast('Đã xóa nhân viên!');
                this.render();
                this.updateDeptFilters();
                
                if (window.App && typeof window.App.refreshAllData === 'function') {
                    window.App.refreshAllData();
                }
            }
        }
    },

    handleExcelImport(e) {
        const files = e.target.files;
        if (!files.length) return;

        const file = files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                if (jsonData.length === 0) {
                    throw new Error('File Excel rỗng!');
                }

                const settings = Store.getSettings();
                const customColumns = settings.customColumns || [];
                let successCount = 0;
                let errorCount = 0;

                jsonData.forEach(row => {
                    const employeeCode = (row['Mã nhân viên'] || row['Mã NV'] || row['Ma NV'] || '').toString().trim();
                    const name = (row['Họ và tên'] || row['Tên NV'] || row['Tên nhân viên'] || '').toString().trim();
                    const cccd = (row['CCCD'] || row['Số CCCD'] || row['Căn cước'] || '').toString().trim();
                    
                    if (!employeeCode || !name || !cccd) {
                        errorCount++;
                        return;
                    }

                    // Đọc động các trị số cột phụ cấp tùy chỉnh
                    const customValues = {};
                    customColumns.forEach(col => {
                        // Tìm cột trong Excel khớp tên
                        const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === col.name.trim().toLowerCase());
                        customValues[col.id] = matchedKey ? Number(row[matchedKey] || 0) : 0;
                    });

                    const employee = {
                        employeeCode,
                        cccd,
                        name,
                        department: row['Phòng ban'] || 'Hành chính - Nhân sự',
                        position: row['Chức vụ'] || 'Nhân viên',
                        baseSalary: Number(row['Lương cơ bản'] || 6000000),
                        insuranceSalary: row['Lương đóng BH'] ? Number(row['Lương đóng BH']) : null,
                        dependents: Number(row['Người phụ thuộc'] || row['Số NPT'] || 0),
                        startDate: row['Ngày bắt đầu'] || new Date().toISOString().substring(0, 10),
                        bankAccount: (row['Tài khoản ngân hàng'] || row['Số TK'] || '').toString(),
                        status: 'active',
                        customValues
                    };

                    try {
                        const employees = Store.getEmployees();
                        const existingEmp = employees.find(e => e.employeeCode === employee.employeeCode);
                        if (existingEmp) {
                            employee.id = existingEmp.id;
                        }
                        Store.saveEmployee(employee);
                        successCount++;
                    } catch (err) {
                        errorCount++;
                    }
                });

                Utils.showToast(`Import thành công ${successCount} nhân sự! Lỗi: ${errorCount}.`, 'success');
                this.render();
                this.updateDeptFilters();
                
                if (window.App && typeof window.App.refreshAllData === 'function') {
                    window.App.refreshAllData();
                }
            } catch (err) {
                Utils.showToast('Lỗi khi đọc file Excel: ' + err.message, 'error');
            }
            this.excelFileInput.value = '';
        };

        reader.readAsArrayBuffer(file);
    },

    updateDeptFilters() {
        const employees = Store.getEmployees();
        const depts = [...new Set(employees.map(e => e.department))];
        this.deptFilter.innerHTML = '<option value="">Tất cả phòng ban</option>';
        depts.forEach(dept => {
            if (dept) {
                this.deptFilter.innerHTML += `<option value="${dept}">${dept}</option>`;
            }
        });
    },

    render() {
        const query = this.searchField.value.trim().toLowerCase();
        const selectedDept = this.deptFilter.value;
        const employees = Store.getEmployees();

        const filtered = employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(query) || 
                                  emp.employeeCode.toLowerCase().includes(query) ||
                                  (emp.cccd && emp.cccd.includes(query));
            const matchesDept = !selectedDept || emp.department === selectedDept;
            return matchesSearch && matchesDept;
        });

        if (filtered.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i data-lucide="users" style="width: 48px; height: 48px; stroke-width: 1.5; color: var(--text-muted); margin-bottom: 10px;"></i>
                        <p>Không tìm thấy nhân viên nào</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        this.tableBody.innerHTML = filtered.map(emp => `
            <tr>
                <td style="font-weight: 600; color: #fff;">${emp.employeeCode}</td>
                <td>${emp.cccd || '-'}</td>
                <td>
                    <div style="font-weight: 500;">${emp.name}</div>
                </td>
                <td>${emp.department}</td>
                <td>${emp.position}</td>
                <td>${Utils.formatVND(emp.baseSalary)}</td>
                <td>${emp.insuranceSalary ? Utils.formatVND(emp.insuranceSalary) : 'Bằng cơ bản'}</td>
                <td style="text-align:center; font-weight:600; color:var(--info-color);">${emp.dependents || 0}</td>
                <td>
                    <span class="badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}">
                        ${emp.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ việc'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="action-icon edit" data-id="${emp.id}" data-action="edit" title="Sửa">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="action-icon delete" data-id="${emp.id}" data-action="delete" title="Xóa">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        lucide.createIcons();
    }
};
