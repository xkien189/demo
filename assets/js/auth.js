const ClubAuth = {
    // Role configuration translation mapping
    ROLES: {
        admin: { title: "Chủ nhiệm", level: 6 },
        vice: { title: "Phó Chủ nhiệm", level: 5 },
        leader: { title: "Trưởng ban", level: 4 },
        assistant: { title: "Phó ban", level: 3 },
        member: { title: "Thành viên", level: 2 },
        guest: { title: "Cộng tác viên", level: 1 }
    },

    getCurrentUser: function() {
        return JSON.parse(sessionStorage.getItem("club_current_user"));
    },

    getCurrentMember: function() {
        const user = this.getCurrentUser();
        if (!user) return null;
        const members = ClubStorage.getData("club_members") || [];
        return members.find(m => m.id === user.memberId) || null;
    },

    login: function(username, password) {
        const users = ClubStorage.getData("club_users") || [];
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        
        if (!user) {
            return { success: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
        }
        if (user.status === "Blocked") {
            return { success: false, message: "Tài khoản của bạn đang bị khóa!" };
        }
        
        sessionStorage.setItem("club_current_user", JSON.stringify(user));
        ClubUtils.addLog("Đăng nhập vào hệ thống");
        return { success: true };
    },

    logout: function() {
        ClubUtils.addLog("Đăng xuất khỏi hệ thống");
        sessionStorage.removeItem("club_current_user");
        window.location.href = "login.html";
    },

    // Protection check called on page load
    checkRouteGuard: function(requiredRoles = []) {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = "login.html";
            return false;
        }

        if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
            // Toast notification that user does not have permission
            alert("Bạn không có quyền truy cập trang này!");
            window.location.href = "dashboard.html";
            return false;
        }
        return true;
    },

    hasPermission: function(allowedRoles) {
        const user = this.getCurrentUser();
        if (!user) return false;
        return allowedRoles.includes(user.role);
    }
};
