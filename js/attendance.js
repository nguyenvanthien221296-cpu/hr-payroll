/* ==========================================
   HR PAYROLL ATTENDANCE MODULE
   ========================================== */

const AttendanceModule = {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.setDefaultMonth();
        this.render();
    },

    cacheDOM() {
        this.viewSection = document.getElementById('view-attendance');
        this.tableBody = document.querySelector('#table-attendance tbody');
        this.monthPicker = document.getElementById('attendance-month');
        this.form = document.getElementById('form-attendance');
        this.modal = document.getElementById('modal-attendance');
        this.btnAdd = document.getElementById('btn-add-attendance');
        this.btnCancel = document.getElementById('btn-cancel-attendance');
        this.btnCloseModal = document.getElementById('btn-close-attendance-modal');

        // Form Fields
        this.fieldId = document.getElementById('att-id');
        this.fieldEmpId = document.getElementById('att-emp-id');
        this.fieldDate = document.getElementById('att-date');
        this.fieldCheckIn = document.getElementById('att-checkin');
        this.fieldCheckOut = document.getElementById('att-checkout');
        this.fieldOTHours = document.getElementById('att-ot-hours');
        this.fieldStatus = document.getElementById('att-status');
        this.fieldNote = document.getElementById('att-note');

        // Import/Export Excel
        this.btnImportTrigger = document.getElementById('btn-import-attendance-trigger');
        this.excelFileInput = document.getElementById('excel-attendance-file');
        this.btnDownloadTemplate = document.getElementById('btn-download-attendance-template');
    },

    bindEvents() {
        this.monthPicker.addEventListener('change', () => this.render());
        this.btnAdd.addEventListener('click', () => this.openModal());
        this.btnCancel.addEventListener('click', () => this.closeModal());
        this.btnCloseModal.addEventListener('click', () => this.closeModal());
        
        // Auto compute hours / OT when CheckIn/CheckOut changes in form
        this.fieldCheckIn.addEventListener('change', () => this.autoComputeOT());
        this.fieldCheckOut.addEventListener('change', () => this.autoComputeOT());

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.tableBody.addEventListener('click', (e) => this.handleTableActions(e));

        // Excel actions
        this.btnImportTrigger.addEventListener('click', () => this.excelFileInput.click());
        this.excelFileInput.addEventListener('change', (e) => this.handleExcelImport(e));
        this.btnDownloadTemplate.addEventListener('click', () => this.downloadTemplate());
    },

    setDefaultMonth() {
        // Set mặc định tháng hiện tại
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

    openModal(att = null) {
        this.form.reset();
        this.populateEmployeeDropdown();

        if (att) {
            document.getElementById('attendance-modal-title').innerText = 'Chỉnh sửa chấm công';
            this.fieldId.value = att.id;
            this.fieldEmpId.value = att.employeeId;
            this.fieldEmpId.disabled = true;
            this.fieldDate.value = att.date;
            this.fieldDate.disabled = true;
            this.fieldCheckIn.value = att.checkIn || '';
            this.fieldCheckOut.value = att.checkOut || '';
            this.fieldOTHours.value = att.overtimeHours || 0;
            this.fieldStatus.value = att.status;
            this.fieldNote.value = att.note || '';
        } else {
            document.getElementById('attendance-modal-title').innerText = 'Thêm dòng chấm công';
            this.fieldId.value = '';
            this.fieldEmpId.disabled = false;
            this.fieldDate.disabled = false;
            this.fieldDate.value = new Date().toISOString().substring(0, 10);
            this.fieldCheckIn.value = '08:00';
            this.fieldCheckOut.value = '17:00';
            this.fieldOTHours.value = 0;
            this.fieldStatus.value = 'full';
            this.fieldNote.value = '';
        }

        this.modal.classList.add('active');
    },

    closeModal() {
        this.modal.classList.remove('active');
    },

    autoComputeOT() {
        const checkIn = this.fieldCheckIn.value;
        const checkOut = this.fieldCheckOut.value;
        if (!checkIn || !checkOut) return;

        const workHours = Utils.calculateHours(checkIn, checkOut);
        
        // Cấu hình giờ tiêu chuẩn (mặc định 8 tiếng)
        const settings = Store.getSettings();
        const stdHours = settings.standardWorkHours || 8;

        if (workHours > stdHours) {
            // Giờ OT là giờ làm việc thực tế vượt quá 8 tiếng (đã trừ nghỉ trưa)
            this.fieldOTHours.value = Math.max(0, workHours - stdHours);
        } else {
            this.fieldOTHours.value = 0;
        }
    },

    handleSubmit(e) {
        e.preventDefault();

        const att = {
            id: this.fieldId.value || null,
            employeeId: this.fieldEmpId.value,
            date: this.fieldDate.value,
            checkIn: this.fieldCheckIn.value,
            checkOut: this.fieldCheckOut.value,
            workHours: Utils.calculateHours(this.fieldCheckIn.value, this.fieldCheckOut.value),
            overtimeHours: Number(this.fieldOTHours.value || 0),
            status: this.fieldStatus.value,
            note: this.fieldNote.value.trim()
        };

        try {
            const success = Store.saveAttendance(att);
            if (success) {
                Utils.showToast('Lưu bản ghi chấm công thành công!');
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
        const attendance = Store.getAttendance(currentMonth);
        const att = attendance.find(x => x.id === id);

        if (!att) return;

        if (action === 'edit') {
            this.openModal(att);
        } else if (action === 'delete') {
            if (confirm(`Bạn có chắc chắn muốn xóa bản ghi chấm công ngày ${Utils.formatDate(att.date)}?`)) {
                Store.deleteAttendance(id);
                Utils.showToast('Đã xóa dòng chấm công!');
                this.render();
                
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
                    throw new Error('File Excel rỗng hoặc định dạng không đúng!');
                }

                const employees = Store.getEmployees();
                let successCount = 0;
                let errorCount = 0;

                jsonData.forEach(row => {
                    const empCode = (row['Mã nhân viên'] || row['Mã NV'] || row['Ma NV'] || '').toString().trim();
                    const dateStr = (row['Ngày'] || row['Ngay'] || '').toString().trim();
                    
                    const emp = employees.find(e => e.employeeCode === empCode);
                    if (!emp || !dateStr) {
                        errorCount++;
                        return;
                    }

                    // Xử lý ngày từ Excel (nếu là số ngày Excel)
                    let formattedDate = dateStr;
                    if (!isNaN(dateStr) && Number(dateStr) > 40000) {
                        // Ngày Excel là số Serial Number
                        const dateObj = XLSX.utils.sheet_to_date(row['Ngày'] || row['Ngay']);
                        formattedDate = dateObj.toISOString().substring(0, 10);
                    } else if (dateStr.includes('/')) {
                        // Hỗ trợ DD/MM/YYYY -> YYYY-MM-DD
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        }
                    }

                    const checkIn = (row['Giờ vào'] || row['Giờ Vào'] || row['CheckIn'] || '08:00').toString().trim();
                    const checkOut = (row['Giờ ra'] || row['Giờ Ra'] || row['CheckOut'] || '17:00').toString().trim();
                    const otHours = Number(row['Giờ OT'] || row['OT'] || 0);
                    const note = (row['Ghi chú'] || row['Ghi Chu'] || '').toString().trim();

                    const workHours = Utils.calculateHours(checkIn, checkOut);
                    const att = {
                        employeeId: emp.id,
                        date: formattedDate,
                        checkIn,
                        checkOut,
                        workHours,
                        overtimeHours: otHours,
                        status: workHours >= 8 ? 'full' : (workHours > 0 ? 'half' : 'unpaid'),
                        note
                    };

                    try {
                        // Lưu và đè bản ghi cũ nếu cùng NV & Ngày
                        const allAtt = Store.getAttendance();
                        const existingAtt = allAtt.find(a => a.employeeId === att.employeeId && a.date === att.date);
                        if (existingAtt) {
                            att.id = existingAtt.id;
                        }
                        Store.saveAttendance(att);
                        successCount++;
                    } catch (err) {
                        errorCount++;
                    }
                });

                Utils.showToast(`Import chấm công thành công ${successCount} dòng! Lỗi: ${errorCount}.`, 'success');
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

        // Tạo dữ liệu mẫu đi kèm danh sách nhân viên hiện tại để tiện điền
        const templateData = [];
        const now = new Date();
        const currentMonthStr = this.monthPicker.value; // YYYY-MM
        const daysInMonth = new Date(currentMonthStr.split('-')[0], currentMonthStr.split('-')[1], 0).getDate();

        // Lấy 2 ngày đầu tháng làm mẫu cho mỗi nhân viên
        employees.forEach(emp => {
            templateData.push({
                'Mã NV': emp.employeeCode,
                'Họ Tên': emp.name,
                'Ngày': `${currentMonthStr}-01`,
                'Giờ Vào': '08:00',
                'Giờ Ra': '17:00',
                'Giờ OT': 0,
                'Ghi Chú': 'Ngày công thường'
            });
            templateData.push({
                'Mã NV': emp.employeeCode,
                'Họ Tên': emp.name,
                'Ngày': `${currentMonthStr}-02`,
                'Giờ Vào': '08:00',
                'Giờ Ra': '19:00',
                'Giờ OT': 2,
                'Ghi Chú': 'OT 2 tiếng'
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ChamCongMau');
        
        // Xuất file tải về
        XLSX.writeFile(workbook, `Mau_Cham_Cong_${currentMonthStr}.xlsx`);
        Utils.showToast('Đã tải xuống file Excel chấm công mẫu!');
    },

    render() {
        const currentMonth = this.monthPicker.value;
        const attendance = Store.getAttendance(currentMonth);
        const employees = Store.getEmployees();

        if (attendance.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i data-lucide="calendar" style="width: 48px; height: 48px; stroke-width: 1.5; color: var(--text-muted); margin-bottom: 10px;"></i>
                        <p>Chưa có dữ liệu chấm công cho tháng này.</p>
                        <span style="font-size: 11px; color: var(--text-muted);">Hãy Tải file mẫu -> Điền giờ -> Nhập từ Excel để xem bảng công.</span>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }

        // Sắp xếp ngày tăng dần
        const sorted = [...attendance].sort((a, b) => new Date(a.date) - new Date(b.date));

        this.tableBody.innerHTML = sorted.map(att => {
            const emp = employees.find(e => e.id === att.employeeId);
            const name = emp ? emp.name : 'Unknown';
            const code = emp ? emp.employeeCode : 'N/A';
            
            // Phân tích trạng thái trễ / về sớm
            let statusBadge = '<span class="badge badge-success">Bình thường</span>';
            if (att.status === 'unpaid') {
                statusBadge = '<span class="badge badge-danger">Vắng mặt</span>';
            } else {
                const partsIn = att.checkIn.split(':').map(Number);
                if (partsIn[0] > 8 || (partsIn[0] === 8 && partsIn[1] > 15)) {
                    statusBadge = '<span class="badge badge-warning">Đi trễ</span>';
                }
            }

            return `
                <tr>
                    <td style="font-weight:600; color:#fff;">${code}</td>
                    <td style="font-weight:500;">${name}</td>
                    <td>${Utils.formatDate(att.date)}</td>
                    <td>${att.checkIn || '-'}</td>
                    <td>${att.checkOut || '-'}</td>
                    <td>${att.workHours} h</td>
                    <td><strong style="color: ${att.overtimeHours > 0 ? 'var(--info-color)' : 'inherit'};">${att.overtimeHours > 0 ? '+' + att.overtimeHours + ' h' : '-'}</strong></td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-icon edit" data-id="${att.id}" data-action="edit" title="Sửa">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button class="action-icon delete" data-id="${att.id}" data-action="delete" title="Xóa">
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
