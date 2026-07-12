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
        const toastColor = type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#2563eb';
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

    formatDate: function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('vi-VN');
    },

    // Save action logging
    addLog: function(action) {
        const currentUser = JSON.parse(sessionStorage.getItem("club_current_user"));
        const username = currentUser ? currentUser.username : "Ẩn danh";
        const logs = ClubStorage.getData("club_logs") || [];
        const time = new Date().toISOString().replace('T', ' ').substring(0, 19);
        logs.unshift({ time, user: username, action });
        ClubStorage.saveData("club_logs", logs.slice(0, 50));
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
