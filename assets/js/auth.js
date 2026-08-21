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

    // Synchronous login for standard user array (synced with Cloud Firestore)
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

        const hashedInput = (typeof ClubUtils !== "undefined" && ClubUtils.sha256) ? ClubUtils.sha256(password) : password;
        if (user.password !== hashedInput) {
            return { success: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
        }
        if (user.status === "Blocked") {
            return { success: false, message: "Tài khoản của bạn đang bị khóa!" };
        }

        const userSession = { ...user };
        delete userSession.password;

        sessionStorage.setItem("club_current_user", JSON.stringify(userSession));
        ClubUtils.addLog("Đăng nhập hệ thống: " + user.username);
        return { success: true };
    },

    // Asynchronous Hybrid Login (Supports Local/Firestore Users & optional Firebase Auth Email)
    loginAsync: async function(usernameOrEmail, password) {
        // 1. First try local / Cloud Firestore synced users collection
        const res = this.login(usernameOrEmail, password);
        if (res.success) return res;

        // 2. If user typed an email address and Firebase Auth SDK is available, try Firebase Auth
        if (usernameOrEmail.includes("@") && typeof firebase !== "undefined" && firebase.auth) {
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
                console.error("🔥 Firebase Auth Login Error:", fbErr);
                if (fbErr.code === "auth/operation-not-allowed") {
                    return { success: false, message: "Phương thức Email/Password chưa được bật trong Firebase Console! (Vào tab Authentication -> Sign-in method -> Enable Email/Password)" };
                }
                if (fbErr.code === "auth/unauthorized-domain") {
                    return { success: false, message: "Tên miền (Domain) trang web chưa được cấp quyền trong Firebase Console! (Vào Authentication -> Settings -> Authorized domains -> Add xkien189.github.io)" };
                }
                if (fbErr.code === "auth/user-not-found" || fbErr.code === "auth/wrong-password" || fbErr.code === "auth/invalid-credential") {
                    return { success: false, message: "Email hoặc Mật khẩu Firebase không chính xác!" };
                }
                return { success: false, message: fbErr.message || "Đăng nhập Firebase thất bại!" };
            }
        }

        return { success: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
    },

    logout: function() {
        ClubUtils.addLog("Đăng xuất khỏi hệ thống");
        sessionStorage.removeItem("club_current_user");
        if (typeof firebase !== "undefined" && firebase.auth) {
            try {
                firebase.auth().signOut().catch(() => {});
            } catch(e) {}
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
