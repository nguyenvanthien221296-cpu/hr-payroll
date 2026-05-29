/* ==========================================
   HR PAYROLL AUDIT LOGS MODULE
   ========================================== */

const AuditLogModule = {
    init() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM() {
        this.tableBody = document.querySelector('#table-audit-log tbody');
        this.searchField = document.getElementById('audit-search');
        this.categoryFilter = document.getElementById('audit-category-filter');
        this.typeFilter = document.getElementById('audit-type-filter');
        this.btnClear = document.getElementById('btn-clear-audit');
        this.btnExport = document.getElementById('btn-export-audit-excel');
    },

    bindEvents() {
        if (this.searchField) {
            this.searchField.addEventListener('input', () => this.render());
        }
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', () => this.render());
        }
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.render());
        }
        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => this.handleClearLogs());
        }
        if (this.btnExport) {
            this.btnExport.addEventListener('click', () => this.exportToExcel());
        }
    },

    getFilteredLogs() {
        const logs = Store.getActivities();
        const keyword = this.searchField ? this.searchField.value.trim().toLowerCase() : '';
        const category = this.categoryFilter ? this.categoryFilter.value : '';
        const type = this.typeFilter ? this.typeFilter.value : '';

        return logs.filter(log => {
            const matchesKeyword = !keyword || 
                log.text.toLowerCase().includes(keyword) || 
                (log.user && log.user.toLowerCase().includes(keyword));
            
            const matchesCategory = !category || log.category === category;
            const matchesType = !type || log.type === type;

            return matchesKeyword && matchesCategory && matchesType;
        });
    },

    render() {
        if (!this.tableBody) return;

        const filtered = this.getFilteredLogs();
        
        // Tối ưu hóa UI: Chỉ vẽ 200 dòng mới nhất để tránh lag giao diện
        const displayLogs = filtered.slice(0, 200);

        if (displayLogs.length === 0) {
            this.tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Không tìm thấy nhật ký hoạt động nào phù hợp.</td></tr>`;
            return;
        }

        const categoryLabels = {
            system: 'Hệ thống',
            employee: 'Nhân sự',
            attendance: 'Chấm công',
            leave: 'Phép & Online',
            payroll: 'Lương 3P',
            settings: 'Cấu hình',
            export: 'Xuất Excel'
        };

        const categoryBadges = {
            system: 'background: rgba(108, 117, 125, 0.15); color: #adb5bd; border: 1px solid rgba(108, 117, 125, 0.25);',
            employee: 'background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.25);',
            attendance: 'background: rgba(9, 132, 227, 0.15); color: #0984e3; border: 1px solid rgba(9, 132, 227, 0.25);',
            leave: 'background: rgba(0, 206, 201, 0.15); color: #00cec9; border: 1px solid rgba(0, 206, 201, 0.25);',
            payroll: 'background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.25);',
            settings: 'background: rgba(253, 150, 68, 0.15); color: #fd9644; border: 1px solid rgba(253, 150, 68, 0.25);',
            export: 'background: rgba(108, 92, 231, 0.15); color: #6c5ce7; border: 1px solid rgba(108, 92, 231, 0.25);'
        };

        const typeBadges = {
            success: 'background: rgba(46, 204, 113, 0.12); color: #2ecc71;',
            info: 'background: rgba(9, 132, 227, 0.12); color: #0984e3;',
            warning: 'background: rgba(253, 150, 68, 0.12); color: #fd9644;',
            danger: 'background: rgba(235, 94, 85, 0.12); color: #eb5e55;'
        };

        const typeLabels = {
            success: 'Thành công',
            info: 'Thông tin',
            warning: 'Cảnh báo',
            danger: 'Nguy hiểm'
        };

        this.tableBody.innerHTML = displayLogs.map(log => {
            const formattedTime = Utils.formatDateTime ? Utils.formatDateTime(log.time) : new Date(log.time).toLocaleString('vi-VN');
            const catLabel = categoryLabels[log.category] || log.category || 'Hệ thống';
            const catBadge = categoryBadges[log.category] || categoryBadges.system;
            const typeLabel = typeLabels[log.type] || 'Thông tin';
            const typeBadge = typeBadges[log.type] || typeBadges.info;

            return `
                <tr>
                    <td style="font-weight: 500; color: #a8a8b3;">${formattedTime}</td>
                    <td style="font-weight: 600; color: #fff;">${log.user || 'Admin'}</td>
                    <td>
                        <span class="status-badge" style="padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; ${catBadge}">
                            ${catLabel}
                        </span>
                    </td>
                    <td style="color: #e2e2e9; font-weight: 500;">${log.text}</td>
                    <td>
                        <span class="status-badge" style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; ${typeBadge}">
                            ● ${typeLabel}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    handleClearLogs() {
        if (confirm('CẢNH BÁO BẢO MẬT:\n\nBạn có chắc chắn muốn xóa TOÀN BỘ lịch sử nhật ký hệ thống không?\nThao tác này không thể hoàn tác và sẽ xóa sạch mọi dấu vết kiểm toán.')) {
            Store.clearActivities();
            Utils.showToast('Đã xóa sạch lịch sử nhật ký hệ thống!', 'danger');
            this.render();
            
            if (window.App && typeof window.App.refreshDashboard === 'function') {
                window.App.refreshDashboard();
            }
        }
    },

    exportToExcel() {
        const allLogs = this.getFilteredLogs(); // Lấy toàn bộ log thỏa mãn bộ lọc (tối đa 5000)

        if (allLogs.length === 0) {
            Utils.showToast('Không có dữ liệu nhật ký để xuất!', 'warning');
            return;
        }

        const categoryLabels = {
            system: 'Hệ thống',
            employee: 'Nhân sự',
            attendance: 'Chấm công',
            leave: 'Phép & Online',
            payroll: 'Lương 3P',
            settings: 'Cấu hình',
            export: 'Xuất Excel'
        };

        const typeLabels = {
            success: 'Thành công (Success)',
            info: 'Thông tin (Info)',
            warning: 'Cảnh báo (Warning)',
            danger: 'Nguy hiểm (Danger)'
        };

        const data = allLogs.map(log => ({
            'Thời gian thực hiện': new Date(log.time).toLocaleString('vi-VN'),
            'Người thực hiện': log.user || 'Admin Pro 3P',
            'Danh mục hoạt động': categoryLabels[log.category] || log.category || 'Hệ thống',
            'Nội dung chi tiết': log.text,
            'Trạng thái': typeLabels[log.type] || 'Thông tin (Info)'
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Nhat_Ky_Hoat_Dong');

        // Định dạng độ rộng cột
        worksheet['!cols'] = [
            { wch: 25 }, // Thời gian
            { wch: 18 }, // Người làm
            { wch: 20 }, // Danh mục
            { wch: 75 }, // Nội dung
            { wch: 22 }  // Trạng thái
        ];

        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Nhat_Ky_Kiem_Toan_He_Thong_${dateStr}.xlsx`);
        Utils.showToast('Đã xuất toàn bộ lịch sử nhật ký hệ thống thành công!');
        
        Store.addActivity(`Đã tải xuống tệp Excel lịch sử kiểm toán hệ thống.`, 'success', 'export');
        this.render();
    }
};
