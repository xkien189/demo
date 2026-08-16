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

    // Synchronous login for standard user array
    login: function(usernameOrEmail, password) {
        const users = ClubStorage.getData("club_users") || [];
        const input = (usernameOrEmail || "").trim().toLowerCase();

        const user = users.find(u => 
            u.username.toLowerCase() === input || 
            (u.email && u.email.toLowerCase() === input)
        );

        if (!user) {
            return { success: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
        }
        if (user.password !== password) {
            return { success: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
        }
        if (user.status === "Blocked") {
            return { success: false, message: "Tài khoản của bạn đang bị khóa!" };
        }

        sessionStorage.setItem("club_current_user", JSON.stringify(user));
        ClubUtils.addLog("Đăng nhập hệ thống: " + user.username);
        return { success: true };
    },

    // Asynchronous Hybrid Login (Supports Local/Firestore Users & Firebase Auth Email)
    loginAsync: async function(usernameOrEmail, password) {
        // First try synchronous local/synced Firestore check
        const res = this.login(usernameOrEmail, password);
        if (res.success) return res;

        // Second, try Firebase Auth SDK if user entered email/password
        if (typeof firebase !== "undefined" && firebase.auth) {
            try {
                const userCred = await firebase.auth().signInWithEmailAndPassword(usernameOrEmail, password);
                const fbUser = userCred.user;
                
                let users = ClubStorage.getData("club_users") || [];
                let existingUser = users.find(u => u.username.toLowerCase() === fbUser.email.toLowerCase() || u.memberId === fbUser.uid);
                if (!existingUser) {
                    existingUser = {
                        username: fbUser.email.split('@')[0],
                        password: password,
                        memberId: "FB_" + fbUser.uid.substring(0, 5),
                        role: "member",
                        status: "Active",
                        email: fbUser.email
                    };
                    users.push(existingUser);
                    ClubStorage.saveData("club_users", users);
                }

                sessionStorage.setItem("club_current_user", JSON.stringify(existingUser));
                ClubUtils.addLog("Đăng nhập qua Firebase Auth: " + fbUser.email);
                return { success: true };
            } catch (fbErr) {
                console.warn("Firebase Auth attempt notice:", fbErr.message);
            }
        }

        return { success: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
    },

    logout: function() {
        ClubUtils.addLog("Đăng xuất khỏi hệ thống");
        sessionStorage.removeItem("club_current_user");
        if (typeof firebase !== "undefined" && firebase.auth) {
            firebase.auth().signOut().catch(() => {});
        }
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
