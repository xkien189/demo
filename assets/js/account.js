document.addEventListener("DOMContentLoaded", () => {
    // Restrict access strictly to admin & vice roles
    if (!ClubAuth.checkRouteGuard(["admin", "vice"])) return;

    renderAccountsList();
    document.getElementById("role-edit-form").addEventListener("submit", handleRoleEditSubmit);
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

        const isSelf = currentAdmin.username === u.username;
        const isCoreAdmin = u.username === "admin";
        
        let actionButtons = "";
        
        // Prevent editing self or core admin account if not super-admin
        if (!isSelf && !isCoreAdmin) {
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
            `;
        } else {
            actionButtons = `<span class="badge bg-secondary">System Secured</span>`;
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
