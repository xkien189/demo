const ClubUtils = {
    // Show premium Swal alert
    showAlert: function(title, text, icon = 'info', confirmText = 'Đồng ý') {
        return Swal.fire({
            title: title,
            text: text,
            icon: icon,
            confirmButtonColor: '#2563eb',
            confirmButtonText: confirmText,
            customClass: {
                popup: 'premium-swal-popup'
            }
        });
    },

    // Show premium Swal confirmation
    showConfirm: function(title, text, confirmText = 'Đồng ý', cancelText = 'Hủy') {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#67748e',
            confirmButtonText: confirmText,
            cancelButtonText: cancelText
        });
    },

    // Toast Notification generator
    showToast: function(title, text, type = 'success') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            icon: type,
            title: title,
            html: text,
            background: document.body.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff',
            color: document.body.getAttribute('data-theme') === 'dark' ? '#f9fafb' : '#0f172a'
        });
    },

    // Format: DD-MM-YYYY
    formatDateOnly: function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    },

    // Format: DD-MM-YYYY HH:mm:ss
    formatDateTime: function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            // Handle strings like "2026-07-05 14:00" or "2026-07-05"
            const parts = dateStr.split(' ');
            const datePart = parts[0] ? parts[0].split('-') : [];
            const timePart = parts[1] || '';
            if (datePart.length === 3) {
                const formatted = `${datePart[2]}-${datePart[1]}-${datePart[0]}`;
                return timePart ? `${formatted} ${timePart}:00` : formatted;
            }
            return dateStr;
        }
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
    },

    // Alias for backward compat
    formatDate: function(dateStr) {
        return this.formatDateOnly(dateStr);
    },

    // Current datetime string: DD-MM-YYYY HH:mm:ss
    nowString: function() {
        return this.formatDateTime(new Date().toISOString());
    },

    // Save action logging
    addLog: function(action) {
        const currentUser = JSON.parse(sessionStorage.getItem("club_current_user"));
        const username = currentUser ? currentUser.username : "Ẩn danh";
        const logs = ClubStorage.getData("club_logs") || [];
        const time = this.nowString();
        logs.unshift({ time, user: username, action });
        ClubStorage.saveData("club_logs", logs.slice(0, 200));
    },

    // Theme state load
    initTheme: function() {
        const savedTheme = localStorage.getItem('club_theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        return savedTheme;
    },

    toggleTheme: function() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('club_theme', newTheme);
        return newTheme;
    }
};

// Auto run theme setup
document.addEventListener("DOMContentLoaded", () => {
    ClubUtils.initTheme();
});
