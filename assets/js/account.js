document.addEventListener("DOMContentLoaded", () => {
    // Restrict access strictly to admin & vice roles
    if (!ClubAuth.checkRouteGuard(["admin", "vice"])) return;

    renderAccountsList();
    document.getElementById("role-edit-form")?.addEventListener("submit", handleRoleEditSubmit);
    document.getElementById("add-account-form")?.addEventListener("submit", handleAddAccountSubmit);

    // Render Add Account Button in header if placeholder exists
    const btnArea = document.getElementById("add-account-btn-area");
    if (btnArea) {
        btnArea.innerHTML = `
            <button class="btn btn-primary btn-sm" onclick="openAddAccountModal()">
                <i class="bi bi-person-plus-fill me-1"></i> Thêm tài khoản mới
            </button>
        `;
    }

    // Register Firestore real-time sync refresh
    if (typeof ClubStorage.registerUIRefresh === "function") {
        ClubStorage.registerUIRefresh("club_users", () => renderAccountsList());
    }
});

function renderAccountsList() {
    const tbody = document.getElementById("accounts-tbody");
    if (!tbody) return;

    const users = ClubStorage.getData("club_users") || [];
    const members = ClubStorage.getData("club_members") || [];
    const currentAdmin = ClubAuth.getCurrentUser();

    tbody.innerHTML = users.map(u => {
        const linkMember = members.find(m => m.id === u.memberId);
        
        let statusBadge = "bg-success";
        if (u.status === "Blocked") statusBadge = "bg-danger";

        const isSelf = currentAdmin && currentAdmin.username === u.username;
        let actionButtons = "";
        
        // Admin can manage/delete any account EXCEPT their own active account
        if (!isSelf) {
            const blockIcon = u.status === "Active" ? "bi-lock" : "bi-unlock";
            const blockColor = u.status === "Active" ? "btn-danger" : "btn-success";
            const blockTitle = u.status === "Active" ? "Khóa tài khoản" : "Mở khóa tài khoản";

            actionButtons = `
                <button onclick="openRoleModal('${u.username}', '${u.role}')" class="btn btn-primary btn-sm" title="Đổi quyền">
                    <i class="bi bi-shield-shaded"></i> Đổi Quyền
                </button>
                <button onclick="toggleBlock('${u.username}')" class="btn ${blockColor} btn-sm ms-1" title="${blockTitle}">
                    <i class="bi ${blockIcon}"></i>
                </button>
                <button onclick="resetPassword('${u.username}')" class="btn btn-warning btn-sm ms-1" title="Reset mật khẩu">
                    <i class="bi bi-arrow-clockwise"></i> Reset Pass
                </button>
                <button onclick="deleteAccount('${u.username}')" class="btn btn-danger btn-sm ms-1" title="Xóa tài khoản">
                    <i class="bi bi-trash"></i> Xóa
                </button>
            `;
        } else {
            actionButtons = `<span class="badge bg-secondary"><i class="bi bi-shield-check me-1"></i>Tài khoản của bạn</span>`;
        }

        return `
            <tr>
                <td><strong class="text-primary">${u.username}</strong></td>
                <td>
                    <div class="user-cell">
                        <img src="${linkMember?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" class="user-cell-img" style="width: 32px; height: 32px;">
                        <div>
                            <div class="user-cell-name small">${linkMember?.name || "Chưa liên kết"}</div>
                            <div class="user-cell-sub">${u.memberId}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-light-primary">${ClubAuth.ROLES[u.role]?.title || u.role}</span></td>
                <td><span class="badge ${statusBadge}">${u.status}</span></td>
                <td class="text-end">${actionButtons}</td>
            </tr>
        `;
    }).join("");
}

// Delete account logic (Self-deletion prohibited)
window.deleteAccount = function(username) {
    const currentAdmin = ClubAuth.getCurrentUser();
    if (currentAdmin && currentAdmin.username === username) {
        ClubUtils.showAlert("Không thể xóa", "Bạn không thể xóa tài khoản chính mình!", "error");
        return;
    }

    ClubUtils.showConfirm(
        `Xác nhận xóa tài khoản "${username}"?`,
        "Tài khoản này sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể đăng nhập nữa!",
        "Đồng ý xóa",
        "Hủy"
    ).then((result) => {
        if (result.isConfirmed) {
            let users = ClubStorage.getData("club_users") || [];
            const userToDelete = users.find(u => u.username === username);
            const memberId = userToDelete ? userToDelete.memberId : null;

            users = users.filter(u => u.username !== username);
            ClubStorage.saveData("club_users", users);

            // Also delete the linked member profile
            if (memberId) {
                let members = ClubStorage.getData("club_members") || [];
                members = members.filter(m => m.id !== memberId);
                ClubStorage.saveData("club_members", members);
            }

            ClubUtils.addLog(`Xóa tài khoản đăng nhập và hồ sơ: ${username}`);
            ClubUtils.showToast("Đã xóa!", `Tài khoản ${username} và hồ sơ thành viên liên kết đã bị xóa.`, "success");
            renderAccountsList();
        }
    });
};

// Add Account Modal
window.openAddAccountModal = function() {
    const modalEl = document.getElementById("addAccountModal");
    if (!modalEl) return;

    const memberSelect = document.getElementById("new-member-id");
    if (memberSelect) {
        const members = ClubStorage.getData("club_members") || [];
        let html = `<option value="">-- Chọn thành viên liên kết --</option>`;
        members.forEach(m => {
            html += `<option value="${m.id}">${m.name} (${m.id}) - ${m.department}</option>`;
        });
        memberSelect.innerHTML = html;
    }

    document.getElementById("add-account-form")?.reset();
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};

function handleAddAccountSubmit(e) {
    e.preventDefault();

    const username = document.getElementById("new-username").value.trim().toLowerCase();
    const password = document.getElementById("new-password").value.trim();
    const memberId = document.getElementById("new-member-id").value;
    const role = document.getElementById("new-role").value;

    if (!username || !password || !memberId) {
        ClubUtils.showAlert("Lỗi nhập liệu", "Vui lòng nhập đầy đủ thông tin tài khoản!", "warning");
        return;
    }

    let users = ClubStorage.getData("club_users") || [];
    if (users.some(u => u.username.toLowerCase() === username)) {
        ClubUtils.showAlert("Lỗi trùng lặp", `Tên đăng nhập "${username}" đã tồn tại trên hệ thống!`, "warning");
        return;
    }

    // SHA-256 Hash password
    const hashedPassword = typeof ClubUtils !== "undefined" && ClubUtils.sha256 ? ClubUtils.sha256(password) : password;

    const newUser = {
        username: username,
        password: hashedPassword,
        memberId: memberId,
        role: role,
        status: "Active"
    };

    users.push(newUser);
    ClubStorage.saveData("club_users", users);

    // Update role in members list as well
    let members = ClubStorage.getData("club_members") || [];
    const mIdx = members.findIndex(m => m.id === memberId);
    if (mIdx !== -1) {
        members[mIdx].role = role;
        ClubStorage.saveData("club_members", members);
    }

    const currentAdmin = ClubAuth.getCurrentUser();
    ClubUtils.addLog(`Thêm tài khoản đăng nhập mới: ${username} (${role})`);
    ClubUtils.showToast("Thành công!", `Tài khoản ${username} đã được tạo thành công!`, "success");

    const modalEl = document.getElementById("addAccountModal");
    const bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();

    renderAccountsList();
}

window.openRoleModal = function(username, currentRole) {
    document.getElementById("edit-username-key").value = username;
    document.getElementById("a-role-select").value = currentRole;

    const modal = new bootstrap.Modal(document.getElementById("roleEditModal"));
    modal.show();
};

function handleRoleEditSubmit(e) {
    e.preventDefault();

    const username = document.getElementById("edit-username-key").value;
    const newRole = document.getElementById("a-role-select").value;

    let users = ClubStorage.getData("club_users") || [];
    const index = users.findIndex(u => u.username === username);

    if (index !== -1) {
        users[index].role = newRole;
        ClubStorage.saveData("club_users", users);

        // Synchronize in members list
        let members = ClubStorage.getData("club_members") || [];
        const mIdx = members.findIndex(m => m.id === users[index].memberId);
        if (mIdx !== -1) {
            members[mIdx].role = newRole;
            ClubStorage.saveData("club_members", members);
        }

        ClubUtils.addLog(`Đổi vai trò tài khoản: ${username} thành ${ClubAuth.ROLES[newRole]?.title || newRole}`);
        ClubUtils.showToast("Thành công!", "Đã thay đổi quyền hệ thống.", "success");
    }

    const modalEl = document.getElementById("roleEditModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance.hide();

    renderAccountsList();
}

window.toggleBlock = function(username) {
    let users = ClubStorage.getData("club_users") || [];
    const index = users.findIndex(u => u.username === username);

    if (index !== -1) {
        const nextStatus = users[index].status === "Active" ? "Blocked" : "Active";
        const actionText = nextStatus === "Blocked" ? "khóa" : "kích hoạt";

        ClubUtils.showConfirm(
            `Xác nhận ${actionText} tài khoản?`,
            `Tài khoản ${username} sẽ bị ${nextStatus === "Blocked" ? "khóa truy cập" : "mở khóa để hoạt động bình thường"}.`,
            "Đồng ý",
            "Hủy"
        ).then((result) => {
            if (result.isConfirmed) {
                users[index].status = nextStatus;
                
                // Synchronize status in member
                let members = ClubStorage.getData("club_members") || [];
                const mIdx = members.findIndex(m => m.id === users[index].memberId);
                if (mIdx !== -1) {
                    members[mIdx].status = nextStatus;
                    ClubStorage.saveData("club_members", members);
                }

                ClubStorage.saveData("club_users", users);
                ClubUtils.addLog(`Đổi trạng thái tài khoản: ${username} -> ${nextStatus}`);
                ClubUtils.showToast("Thành công!", `Tài khoản đã được ${actionText}.`, "success");
                renderAccountsList();
            }
        });
    }
};

window.resetPassword = function(username) {
    ClubUtils.showConfirm(
        "Reset mật khẩu tài khoản?",
        `Mật khẩu đăng nhập của tài khoản ${username} sẽ được đặt lại về mặc định là "123".`,
        "Đặt lại",
        "Hủy"
    ).then((result) => {
        if (result.isConfirmed) {
            let users = ClubStorage.getData("club_users") || [];
            const index = users.findIndex(u => u.username === username);

            if (index !== -1) {
                users[index].password = typeof ClubUtils !== "undefined" && ClubUtils.sha256 ? ClubUtils.sha256("123") : "123";
                ClubStorage.saveData("club_users", users);
                ClubUtils.addLog(`Reset mật khẩu tài khoản: ${username}`);
                ClubUtils.showToast("Thành công!", "Mật khẩu đã đặt lại về mặc định: 123", "success");
            }
        }
    });
};
