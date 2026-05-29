/* ==========================================
   HR PAYROLL LEAVE & REMOTE MODULE
   ========================================== */

const LeaveModule = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.setDefaultMonth();
        this.render();
    },

    cacheDOM() {
        this.viewSection = document.getElementById('view-leave');
        this.tableBody = document.querySelector('#table-leave tbody');
        this.monthPicker = document.getElementById('leave-month');
        this.form = document.getElementById('form-leave');
        this.modal = document.getElementById('modal-leave');
        this.btnAdd = document.getElementById('btn-add-leave');
        this.btnCancel = document.getElementById('btn-cancel-leave');
        this.btnCloseModal = document.getElementById('btn-close-leave-modal');

        // Form Fields
        this.fieldId = document.getElementById('leave-id');
        this.fieldEmpId = document.getElementById('leave-emp-id');
        this.fieldType = document.getElementById('leave-type');
        this.fieldStart = document.getElementById('leave-start');
        this.fieldEnd = document.getElementById('leave-end');
        this.fieldStatus = document.getElementById('leave-status');
        this.fieldApprovedBy = document.getElementById('leave-approved-by');
        this.fieldReason = document.getElementById('leave-reason');

        // Import Excel
        this.btnImportTrigger = document.getElementById('btn-import-leave-trigger');
        this.excelFileInput = document.getElementById('excel-leave-file');
        this.btnDownloadTemplate = document.getElementById('btn-download-leave-template');
    },

    bindEvents() {
        this.monthPicker.addEventListener('change', () => this.render());
        this.btnAdd.addEventListener('click', () => this.openModal());
        this.btnCancel.addEventListener('click', () => this.closeModal());
        this.btnCloseModal.addEventListener('click', () => this.closeModal());

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.tableBody.addEventListener('click', (e) => this.handleTableActions(e));

        // Excel Actions
        this.btnImportTrigger.addEventListener('click', () => this.excelFileInput.click());
        this.excelFileInput.addEventListener('change', (e) => this.handleExcelImport(e));
        this.btnDownloadTemplate.addEventListener('click', () => this.downloadTemplate());
    },

    setDefaultMonth() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        this.monthPicker.value = `${yyyy}-${mm}`;
    },

    populateEmployeeDropdown() {
        const employees = Store.getEmployees().filter(e => e.status === 'active');
        this.fieldEmpId.innerHTML = employees.map(emp => `
            <option value="${emp.id}">${emp.name} (${emp.employeeCode})</option>
        `).join('');
    },

    openModal(leave = null) {
        this.form.reset();
        this.populateEmployeeDropdown();

        if (leave) {
            document.getElementById('leave-modal-title').innerText = 'Chi tiết & Phê duyệt Đơn';
            this.fieldId.value = leave.id;
            this.fieldEmpId.value = leave.employeeId;
            this.fieldEmpId.disabled = true;
            this.fieldType.value = leave.type;
            this.fieldStart.value = leave.startDate;
            this.fieldEnd.value = leave.endDate;
            this.fieldStatus.value = leave.status;
            this.fieldApprovedBy.value = leave.approvedBy || '';
            this.fieldReason.value = leave.reason || '';
        } else {
            document.getElementById('leave-modal-title').innerText = 'Đăng ký đơn xin phép mới';
            this.fieldId.value = '';
            this.fieldEmpId.disabled = false;
            this.fieldStart.value = new Date().toISOString().substring(0, 10);
            this.fieldEnd.value = new Date().toISOString().substring(0, 10);
            this.fieldType.value = 'annual_leave';
            this.fieldStatus.value = 'approved'; // HR đăng ký hộ thường duyệt luôn
            this.fieldApprovedBy.value = 'Admin HR';
            this.fieldReason.value = '';
        }

        this.modal.classList.add('active');
    },

    closeModal() {
        this.modal.classList.remove('active');
    },

    handleSubmit(e) {
        e.preventDefault();

        const leave = {
            id: this.fieldId.value || null,
            employeeId: this.fieldEmpId.value,
            type: this.fieldType.value,
            startDate: this.fieldStart.value,
            endDate: this.fieldEnd.value,
            status: this.fieldStatus.value,
            approvedBy: this.fieldApprovedBy.value.trim(),
            reason: this.fieldReason.value.trim()
        };

        // Validate ngày bắt đầu trước ngày kết thúc
        if (new Date(leave.startDate) > new Date(leave.endDate)) {
            Utils.showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc!', 'error');
            return;
        }

        try {
            const success = Store.saveLeave(leave);
            if (success) {
                Utils.showToast('Đã lưu đơn phép thành công!');
                this.closeModal();
                this.render();
                
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
        const currentMonth = this.monthPicker.value;
        const leaves = Store.getLeaves(currentMonth);
        const leave = leaves.find(x => x.id === id);

        if (!leave) return;

        if (action === 'edit') {
            this.openModal(leave);
        } else if (action === 'delete') {
            if (confirm(`Bạn có muốn xóa đơn này không?`)) {
                Store.deleteLeave(id);
                Utils.showToast('Đã xóa đơn phép!');
                this.render();
                
                if (window.App && typeof window.App.refreshAllData === 'function') {
                    window.App.refreshAllData();
                }
            }
        } else if (action === 'approve') {
            leave.status = 'approved';
            leave.approvedBy = 'Admin HR';
            Store.saveLeave(leave);
            Utils.showToast('Đã duyệt đơn phép!');
            this.render();
            
            if (window.App && typeof window.App.refreshAllData === 'function') {
                window.App.refreshAllData();
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
                    throw new Error('File Excel rỗng hoặc định dạng không đúng!');
                }

                const employees = Store.getEmployees();
                let successCount = 0;
                let errorCount = 0;

                jsonData.forEach(row => {
                    const empCode = (row['Mã nhân viên'] || row['Mã NV'] || row['Ma NV'] || '').toString().trim();
                    const rawType = (row['Loại đơn'] || row['Loại Đơn'] || '').toString().trim().toLowerCase();
                    
                    let startDateStr = (row['Từ ngày'] || row['Từ Ngày'] || '').toString().trim();
                    let endDateStr = (row['Đến ngày'] || row['Đến Ngày'] || '').toString().trim();

                    const emp = employees.find(e => e.employeeCode === empCode);
                    if (!emp || !startDateStr || !endDateStr) {
                        errorCount++;
                        return;
                    }

                    // Xử lý ngày Excel Serial Number
                    if (!isNaN(startDateStr) && Number(startDateStr) > 40000) {
                        startDateStr = XLSX.utils.sheet_to_date(row['Từ ngày'] || row['Từ Ngày']).toISOString().substring(0, 10);
                    } else if (startDateStr.includes('/')) {
                        const parts = startDateStr.split('/');
                        if (parts.length === 3) startDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }

                    if (!isNaN(endDateStr) && Number(endDateStr) > 40000) {
                        endDateStr = XLSX.utils.sheet_to_date(row['Đến ngày'] || row['Đến Ngày']).toISOString().substring(0, 10);
                    } else if (endDateStr.includes('/')) {
                        const parts = endDateStr.split('/');
                        if (parts.length === 3) endDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }

                    // Map loại đơn sang database
                    let type = 'annual_leave';
                    if (rawType.includes('ốm') || rawType.includes('om') || rawType.includes('bệnh') || rawType.includes('sick')) {
                        type = 'sick_leave';
                    } else if (rawType.includes('không lương') || rawType.includes('khong luong') || rawType.includes('unpaid')) {
                        type = 'unpaid_leave';
                    } else if (rawType.includes('online') || rawType.includes('remote') || rawType.includes('ở nhà')) {
                        type = 'remote_work';
                    }

                    const leave = {
                        employeeId: emp.id,
                        type,
                        startDate: startDateStr,
                        endDate: endDateStr,
                        status: (row['Trạng thái'] || row['Trạng Thái'] || 'approved').toString().trim() === 'Chờ duyệt' ? 'pending' : 'approved',
                        approvedBy: (row['Người duyệt'] || row['Người Duyệt'] || 'Admin HR').toString().trim(),
                        reason: (row['Lý do'] || row['Lý Do'] || 'Nghỉ phép thường niên').toString().trim()
                    };

                    try {
                        Store.saveLeave(leave);
                        successCount++;
                    } catch (err) {
                        errorCount++;
                    }
                });

                Utils.showToast(`Import đơn phép thành công ${successCount} dòng! Lỗi: ${errorCount}.`, 'success');
                this.render();
                
                if (window.App && typeof window.App.refreshAllData === 'function') {
                    window.App.refreshAllData();
                }
            } catch (err) {
                Utils.showToast('Lỗi đọc file: ' + err.message, 'error');
            }
            this.excelFileInput.value = '';
        };

        reader.readAsArrayBuffer(file);
    },

    downloadTemplate() {
        const employees = Store.getEmployees().filter(e => e.status === 'active');
        if (employees.length === 0) {
            Utils.showToast('Vui lòng thêm nhân viên trước khi tải file mẫu!', 'warning');
            return;
        }

        const templateData = [];
        const currentMonthStr = this.monthPicker.value;

        // Tạo 2 dòng mẫu
        employees.slice(0, 2).forEach(emp => {
            templateData.push({
                'Mã NV': emp.employeeCode,
                'Họ Tên': emp.name,
                'Loại đơn': 'Nghỉ phép năm',
                'Từ ngày': `${currentMonthStr}-05`,
                'Đến ngày': `${currentMonthStr}-05`,
                'Lý do': 'Nghỉ giải quyết việc gia đình',
                'Trạng thái': 'Đã duyệt',
                'Người duyệt': 'Admin HR'
            });
            templateData.push({
                'Mã NV': emp.employeeCode,
                'Họ Tên': emp.name,
                'Loại đơn': 'Làm online',
                'Từ ngày': `${currentMonthStr}-10`,
                'Đến ngày': `${currentMonthStr}-12`,
                'Lý do': 'Làm tại nhà do nhà mất điện',
                'Trạng thái': 'Đã duyệt',
                'Người duyệt': 'Trưởng phòng Kỹ thuật'
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'DonXinNghiMau');
        
        XLSX.writeFile(workbook, `Mau_Don_Phep_${currentMonthStr}.xlsx`);
        Utils.showToast('Đã tải xuống file Excel đơn phép mẫu!');
    },

    render() {
        const currentMonth = this.monthPicker.value;
        const leaves = Store.getLeaves(currentMonth);
        const employees = Store.getEmployees();

        if (leaves.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i data-lucide="file-text" style="width: 48px; height: 48px; stroke-width: 1.5; color: var(--text-muted); margin-bottom: 10px;"></i>
                        <p>Chưa có đơn xin nghỉ hay làm online nào được đăng ký.</p>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        const sorted = [...leaves].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        this.tableBody.innerHTML = sorted.map(leave => {
            const emp = employees.find(e => e.id === leave.employeeId);
            const name = emp ? emp.name : 'Unknown';
            const code = emp ? emp.employeeCode : 'N/A';

            let typeText = 'Nghỉ phép năm';
            let typeColor = 'badge-success';
            if (leave.type === 'sick_leave') {
                typeText = 'Nghỉ ốm';
                typeColor = 'badge-info';
            } else if (leave.type === 'unpaid_leave') {
                typeText = 'Nghỉ không lương';
                typeColor = 'badge-danger';
            } else if (leave.type === 'remote_work') {
                typeText = 'Làm online (remote)';
                typeColor = 'badge-warning';
            }

            let statusText = 'Chờ duyệt';
            let statusColor = 'badge-warning';
            if (leave.status === 'approved') {
                statusText = 'Đã duyệt';
                statusColor = 'badge-success';
            } else if (leave.status === 'rejected') {
                statusText = 'Bị từ chối';
                statusColor = 'badge-danger';
            }

            // Nút duyệt nhanh chỉ hiển thị nếu trạng thái là chờ duyệt
            const approveBtn = leave.status === 'pending' ? `
                <button class="action-icon approve" data-id="${leave.id}" data-action="approve" title="Duyệt nhanh">
                    <i data-lucide="check"></i>
                </button>
            ` : '';

            return `
                <tr>
                    <td style="font-weight:600; color:#fff;">${code}</td>
                    <td style="font-weight:500;">${name}</td>
                    <td><span class="badge ${typeColor}">${typeText}</span></td>
                    <td>${Utils.formatDate(leave.startDate)}</td>
                    <td>${Utils.formatDate(leave.endDate)}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${leave.reason}">${leave.reason}</td>
                    <td><span class="badge ${statusColor}">${statusText}</span></td>
                    <td>${leave.approvedBy || '-'}</td>
                    <td>
                        <div class="table-actions">
                            ${approveBtn}
                            <button class="action-icon edit" data-id="${leave.id}" data-action="edit" title="Sửa/Chi tiết">
                                <i data-lucide="eye"></i>
                            </button>
                            <button class="action-icon delete" data-id="${leave.id}" data-action="delete" title="Xóa">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons();
    }
};
