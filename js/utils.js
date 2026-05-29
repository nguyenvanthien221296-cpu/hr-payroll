/* ==========================================
   HR PAYROLL UTILS & HELPERS
   ========================================== */

const Utils = {
    // Định dạng tiền VND (e.g. 10.000.000 đ)
    formatVND(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    },

    // Định dạng ngày (YYYY-MM-DD -> DD/MM/YYYY)
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },

    // Lấy tên tháng từ chuỗi YYYY-MM
    getMonthName(monthStr) {
        if (!monthStr) return '';
        const [year, month] = monthStr.split('-');
        return `Tháng ${month}/${year}`;
    },

    // Tính số ngày làm việc giữa 2 ngày (bao gồm cả 2 ngày)
    getDaysBetween(startDateStr, endDateStr) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    },

    // Tạo ID ngẫu nhiên duy nhất
    generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    },

    // Hiển thị thông báo Toast nhanh gọn trong ứng dụng
    showToast(message, type = 'success') {
        // Kiểm tra xem đã có container toast chưa, nếu chưa thì tạo mới
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '9999';
            toastContainer.style.display = 'flex';
            toastContainer.style.flexDirection = 'column';
            toastContainer.style.gap = '10px';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast-item ${type}`;
        toast.style.background = 'rgba(19, 21, 38, 0.95)';
        toast.style.color = '#fff';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        toast.style.fontSize = '13px';
        toast.style.borderLeft = `5px solid ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#f39c12'}`;
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        toast.innerText = message;

        toastContainer.appendChild(toast);

        // Kích hoạt animation hiện ra
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // Tự biến mất sau 3 giây
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    },

    // Kiểm tra tính hợp lệ của giờ vào/ra (định dạng HH:MM)
    calculateHours(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;
        
        const [inH, inM] = checkIn.split(':').map(Number);
        const [outH, outM] = checkOut.split(':').map(Number);
        
        const start = new Date(2000, 0, 1, inH, inM);
        let end = new Date(2000, 0, 1, outH, outM);
        
        // Nếu giờ ra nhỏ hơn giờ vào (làm ca qua đêm)
        if (end < start) {
            end = new Date(2000, 0, 2, outH, outM);
        }
        
        const diffMs = end - start;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        // Trừ bớt 1 giờ nghỉ trưa nếu làm việc trên 5 tiếng
        let finalHours = diffHours;
        if (finalHours > 5) {
            finalHours -= 1;
        }
        
        return Math.max(0, Math.round(finalHours * 10) / 10); // Làm tròn 1 chữ số thập phân
    },

    // Chuyển đổi chỉ số cột sang ký tự chữ cái Excel (A, B, C...)
    getColLetter(colIdx) {
        let temp = colIdx;
        let letter = '';
        while (temp >= 0) {
            letter = String.fromCharCode((temp % 26) + 65) + letter;
            temp = Math.floor(temp / 26) - 1;
        }
        return letter;
    },

    // Quản lý bộ lọc tiêu đề các cột của các bảng
    filterState: {},

    initializeTableFilters(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const thead = table.querySelector('thead');
        if (!thead) return;

        if (!this.filterState[tableId]) {
            this.filterState[tableId] = {};
        }

        // Nếu đã tồn tại hàng lọc, khôi phục lại giá trị lọc
        let filterRow = thead.querySelector('.filter-row');
        if (filterRow) {
            const inputs = filterRow.querySelectorAll('.table-filter-input');
            inputs.forEach(input => {
                const colIndex = input.dataset.colIndex;
                if (this.filterState[tableId][colIndex] !== undefined) {
                    input.value = this.filterState[tableId][colIndex];
                }
            });
            this.applyTableFilters(tableId);
            return;
        }

        const headerCells = thead.querySelectorAll('tr:first-child th');
        filterRow = document.createElement('tr');
        filterRow.className = 'filter-row';

        headerCells.forEach((th, index) => {
            const td = document.createElement('th');
            td.style.padding = '4px 8px';
            
            const isActionCol = th.innerText.toLowerCase().includes('thao tác') || 
                                th.innerText.toLowerCase().includes('ghi đè') ||
                                th.innerHTML.includes('sliders-horizontal') ||
                                th.querySelector('[data-lucide="sliders-horizontal"]');
            
            if (isActionCol) {
                td.innerHTML = '';
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'table-filter-input';
                input.placeholder = `Lọc...`;
                input.style.width = '100%';
                input.style.boxSizing = 'border-box';
                input.style.background = 'rgba(255, 255, 255, 0.05)';
                input.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                input.style.color = '#fff';
                input.style.borderRadius = '4px';
                input.style.padding = '5px 8px';
                input.style.fontSize = '11px';
                input.style.fontWeight = 'normal';
                
                input.dataset.colIndex = index;
                
                if (this.filterState[tableId][index] !== undefined) {
                    input.value = this.filterState[tableId][index];
                }
                
                input.addEventListener('input', (e) => {
                    this.filterState[tableId][index] = e.target.value;
                    this.applyTableFilters(tableId);
                });
                
                td.appendChild(input);
            }
            filterRow.appendChild(td);
        });

        thead.appendChild(filterRow);
        this.applyTableFilters(tableId);
    },

    applyTableFilters(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        const filterRow = table.querySelector('.filter-row');
        if (!filterRow) return;

        const filterInputs = filterRow.querySelectorAll('.table-filter-input');
        
        const activeFilters = [];
        filterInputs.forEach(input => {
            const val = input.value.trim().toLowerCase();
            const colIndex = parseInt(input.dataset.colIndex);
            if (val) {
                activeFilters.push({ colIndex, val });
            }
        });

        rows.forEach(row => {
            if (row.querySelector('.empty-state')) return;

            const cells = row.querySelectorAll('td');
            let isMatch = true;

            for (let filter of activeFilters) {
                const cell = cells[filter.colIndex];
                if (!cell) continue;

                const inlineInput = cell.querySelector('input');
                let cellText = '';
                if (inlineInput) {
                    cellText = inlineInput.value.toLowerCase();
                } else {
                    cellText = cell.innerText.toLowerCase();
                }

                if (!cellText.includes(filter.val)) {
                    isMatch = false;
                    break;
                }
            }

            row.style.display = isMatch ? '' : 'none';
        });
    }
};
