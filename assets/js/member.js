document.addEventListener("DOMContentLoaded", () => {
    // Member module route restrictions
    if (!ClubAuth.checkRouteGuard()) return;

    const path = window.location.pathname;

    if (path.includes("members.html")) {
        initMembersListPage();
    } else if (path.includes("member-detail.html")) {
        initMemberDetailPage();
    } else if (path.includes("member-edit.html")) {
        initMemberEditPage();
    }
});

// Listing Logic
let currentMembers = [];
let currentPage = 1;
const itemsPerPage = 5;

function initMembersListPage() {
    const user = ClubAuth.getCurrentUser();
    
    // Add Add-Member button if permissions match
    const addBtnArea = document.getElementById("add-member-btn-area");
    if (addBtnArea && ["admin", "vice", "leader", "assistant"].includes(user.role)) {
        addBtnArea.innerHTML = `
            <a href="member-edit.html" class="btn btn-primary">
                <i class="bi bi-person-plus"></i> Thêm thành viên
            </a>
        `;
    }

    // Populate Department dropdown
    populateDeptDropdown("filter-dept");

    // Fetch and bind actions
    loadMembersData();
    
    document.getElementById("search-input").addEventListener("input", filterAndRenderMembers);
    document.getElementById("filter-dept").addEventListener("change", filterAndRenderMembers);
    document.getElementById("filter-status").addEventListener("change", filterAndRenderMembers);
    document.getElementById("reset-filters").addEventListener("click", () => {
        document.getElementById("search-input").value = "";
        document.getElementById("filter-dept").value = "";
        document.getElementById("filter-status").value = "";
        filterAndRenderMembers();
    });
}

function populateDeptDropdown(elementId, selectedVal = "") {
    const dropdown = document.getElementById(elementId);
    if (!dropdown) return;
    const depts = ClubStorage.getData("club_departments") || [];
    
    let html = elementId.includes("filter") ? '<option value="">Tất cả Ban</option>' : '';
    depts.forEach(d => {
        const selected = d.name === selectedVal ? 'selected' : '';
        html += `<option value="${d.name}" ${selected}>${d.name}</option>`;
    });
    dropdown.innerHTML = html;
}

function loadMembersData() {
    currentMembers = ClubStorage.getData("club_members") || [];
    filterAndRenderMembers();
    renderMembersLeaderboard();
}

function renderMembersLeaderboard() {
    const container = document.getElementById("members-leaderboard");
    if (!container) return;

    // Sort by score
    const topMembers = [...currentMembers]
        .filter(m => m.status === "Active")
        .sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0));

    if (topMembers.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-3">Không có dữ liệu</div>`;
        return;
    }

    container.innerHTML = topMembers.map((m, idx) => {
        let medal = "";
        if (idx === 0) medal = "🥇";
        else if (idx === 1) medal = "🥈";
        else if (idx === 2) medal = "🥉";
        else medal = `<span class="fw-bold text-muted small me-1">#${idx+1}</span>`;

        return `
            <div class="d-flex align-items-center justify-content-between p-2 mb-2 rounded border bg-light-primary" style="background-color: var(--primary-light);">
                <div class="d-flex align-items-center gap-2">
                    ${medal}
                    <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" class="rounded-circle" style="width: 28px; height: 28px; object-fit: cover;">
                    <div>
                        <div class="fw-bold text-dark small text-truncate" style="max-width: 90px;">${m.name}</div>
                        <div class="text-muted text-truncate" style="font-size: 0.6rem; max-width: 90px;">${m.department}</div>
                    </div>
                </div>
                <div class="badge bg-primary text-white" style="font-size: 0.75rem;">${m.activityScore || 0} đ</div>
            </div>
        `;
    }).join("");
}

function filterAndRenderMembers() {
    const searchVal = document.getElementById("search-input").value.toLowerCase();
    const deptVal = document.getElementById("filter-dept").value;
    const statusVal = document.getElementById("filter-status").value;

    const filtered = currentMembers.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchVal) || 
                              m.email.toLowerCase().includes(searchVal) || 
                              m.id.toLowerCase().includes(searchVal) ||
                              m.phone.includes(searchVal);
        const matchesDept = deptVal === "" || m.department === deptVal;
        const matchesStatus = statusVal === "" || m.status === statusVal;

        return matchesSearch && matchesDept && matchesStatus;
    });

    renderMembersTable(filtered);
}

function renderMembersTable(list) {
    const tbody = document.getElementById("members-tbody");
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Không tìm thấy thành viên nào</td></tr>`;
        updatePaginationInfo(0, 0, 0);
        return;
    }

    // Pagination bounds
    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
    const paginatedList = list.slice(startIdx, endIdx);

    const currentUser = ClubAuth.getCurrentUser();

    let html = "";
    paginatedList.forEach(m => {
        const roleLabel = ClubAuth.ROLES[m.role]?.title || m.role;
        const statusBadge = m.status === "Active" ? "bg-success" : "bg-danger";
        
        let actionButtons = `
            <a href="member-detail.html?id=${m.id}" class="btn btn-secondary btn-sm" title="Chi tiết">
                <i class="bi bi-eye"></i>
            </a>
        `;

        if (["admin", "vice", "leader", "assistant"].includes(currentUser.role)) {
            actionButtons += `
                <a href="member-edit.html?id=${m.id}" class="btn btn-primary btn-sm ms-1" title="Sửa">
                    <i class="bi bi-pencil"></i>
                </a>
            `;
        }

        if (currentUser.role === "admin" || (currentUser.role === "vice" && m.role !== "admin")) {
            actionButtons += `
                <button onclick="deleteMember('${m.id}')" class="btn btn-danger btn-sm ms-1" title="Xóa">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        }

        html += `
            <tr>
                <td>
                    <div class="user-cell">
                        <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" class="user-cell-img">
                        <div>
                            <div class="user-cell-name">${m.name}</div>
                            <div class="user-cell-sub">${m.email}</div>
                        </div>
                    </div>
                </td>
                <td>${m.id}</td>
                <td>${m.department}</td>
                <td><span class="badge bg-light-primary">${roleLabel}</span></td>
                <td>${ClubUtils.formatDate(m.joinDate)}</td>
                <td><span class="badge ${statusBadge}">${m.status}</span></td>
                <td>
                    <span class="badge bg-success fw-bold" title="Điểm hoạt động">
                        <i class="bi bi-star-fill me-1"></i>${m.activityScore || 0} điểm
                    </span>
                </td>
                <td class="text-end">${actionButtons}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updatePaginationInfo(startIdx + 1, endIdx, totalItems);
    renderPaginationControls(totalPages);
}

function updatePaginationInfo(start, end, total) {
    const info = document.getElementById("pagination-info");
    if (info) {
        info.innerText = total > 0 ? `Hiển thị ${start} - ${end} trong tổng số ${total} thành viên` : "Hiển thị 0 thành viên";
    }
}

function renderPaginationControls(totalPages) {
    const pagin = document.getElementById("members-pagination");
    if (!pagin) return;

    let html = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" onclick="changePage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }

    html += `
        <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" onclick="changePage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></a>
        </li>
    `;

    pagin.innerHTML = html;
}

window.changePage = function(page) {
    currentPage = page;
    filterAndRenderMembers();
};

window.deleteMember = function(memberId) {
    ClubUtils.showConfirm(
        "Xác nhận xóa thành viên?",
        `Tất cả thông tin liên quan tới thành viên ${memberId} sẽ bị xóa vĩnh viễn!`,
        "Xóa ngay",
        "Hủy"
    ).then((result) => {
        if (result.isConfirmed) {
            let members = ClubStorage.getData("club_members") || [];
            const memberIndex = members.findIndex(m => m.id === memberId);
            
            if (memberIndex !== -1) {
                const deletedName = members[memberIndex].name;
                members.splice(memberIndex, 1);
                ClubStorage.saveData("club_members", members);

                // Also delete related user accounts
                let users = ClubStorage.getData("club_users") || [];
                users = users.filter(u => u.memberId !== memberId);
                ClubStorage.saveData("club_users", users);

                ClubUtils.addLog(`Xóa thành viên: ${deletedName} (${memberId})`);
                ClubUtils.showToast("Đã xóa!", `Thành viên ${deletedName} đã bị xóa khỏi hệ thống.`, "success");
                loadMembersData();
            }
        }
    });
};

// Details page Logic
function initMemberDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
        window.location.href = "members.html";
        return;
    }

    const members = ClubStorage.getData("club_members") || [];
    const m = members.find(item => item.id === id);
    if (!m) {
        window.location.href = "members.html";
        return;
    }

    document.getElementById("member-avatar").src = m.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
    document.getElementById("member-name").innerText = m.name;
    document.getElementById("member-id-txt").innerText = `Mã thành viên: ${m.id}`;
    
    const badge = document.getElementById("member-status-badge");
    badge.innerText = m.status;
    badge.className = `badge ${m.status === "Active" ? "bg-success" : "bg-danger"}`;

    document.getElementById("member-dept").innerText = m.department;
    document.getElementById("member-role").innerText = ClubAuth.ROLES[m.role]?.title || m.role;
    document.getElementById("member-email").innerText = m.email;
    document.getElementById("member-phone").innerText = m.phone;
    document.getElementById("member-joindate").innerText = ClubUtils.formatDate(m.joinDate);

    const scoreEl = document.getElementById("member-score");
    if (scoreEl) scoreEl.innerText = `${m.activityScore || 0} điểm`;

    // Edit permission setup
    const user = ClubAuth.getCurrentUser();
    if (["admin", "vice", "leader", "assistant"].includes(user.role)) {
        document.getElementById("edit-action-area").innerHTML = `
            <a href="member-edit.html?id=${m.id}" class="btn btn-primary btn-sm">
                <i class="bi bi-pencil"></i> Chỉnh sửa
            </a>
        `;
    }

    // List assigned tasks
    const tasks = ClubStorage.getData("club_tasks") || [];
    const memberTasks = tasks.filter(t => t.assigneeId === m.id);
    const tasksTbody = document.getElementById("member-tasks-tbody");
    
    if (memberTasks.length === 0) {
        tasksTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Chưa có công việc được giao</td></tr>`;
        return;
    }

    tasksTbody.innerHTML = memberTasks.map(t => {
        let badgeColor = "bg-primary";
        if (t.priority === "High") badgeColor = "bg-danger";
        if (t.priority === "Medium") badgeColor = "bg-warning";
        
        let statusBadge = "bg-warning";
        if (t.status === "Completed") statusBadge = "bg-success";
        if (t.status === "In Progress") statusBadge = "bg-primary";

        return `
            <tr style="cursor: pointer;" onclick="location.href='task-detail.html?id=${t.id}'">
                <td>${t.id}</td>
                <td><span class="text-primary fw-bold">${t.title}</span></td>
                <td><span class="badge ${badgeColor}">${t.priority}</span></td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="progress flex-grow-1" style="height: 6px; width: 60px;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${t.progress}%"></div>
                        </div>
                        <span class="small">${t.progress}%</span>
                    </div>
                </td>
                <td><span class="badge ${statusBadge}">${t.status}</span></td>
            </tr>
        `;
    }).join("");
}

// Edit Form Logic
function initMemberEditPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    
    const members = ClubStorage.getData("club_members") || [];
    const isEdit = id !== null;

    // Populate department drop down
    populateDeptDropdown("m-dept");

    if (isEdit) {
        document.getElementById("form-title").innerText = "Chỉnh sửa thông tin thành viên";
        const m = members.find(item => item.id === id);
        if (!m) {
            window.location.href = "members.html";
            return;
        }
        
        document.getElementById("m-id").value = m.id;
        document.getElementById("m-id").disabled = true; // Key cannot be edited
        document.getElementById("m-name").value = m.name;
        document.getElementById("m-email").value = m.email;
        document.getElementById("m-phone").value = m.phone;
        document.getElementById("m-dept").value = m.department;
        document.getElementById("m-role").value = m.role;
        document.getElementById("m-joindate").value = m.joinDate;
        document.getElementById("m-status").value = m.status;
        document.getElementById("m-avatar").value = m.avatar || "";
    } else {
        document.getElementById("form-title").innerText = "Thêm thành viên mới";
        // Auto fill today
        document.getElementById("m-joindate").value = new Date().toISOString().substring(0, 10);
    }

    document.getElementById("member-form").addEventListener("submit", (e) => {
        e.preventDefault();
        
        const mId = document.getElementById("m-id").value.trim();
        const mName = document.getElementById("m-name").value.trim();
        const mEmail = document.getElementById("m-email").value.trim();
        const mPhone = document.getElementById("m-phone").value.trim();
        const mDept = document.getElementById("m-dept").value;
        const mRole = document.getElementById("m-role").value;
        const mJoin = document.getElementById("m-joindate").value;
        const mStat = document.getElementById("m-status").value;
        const mAvat = document.getElementById("m-avatar").value.trim();

        let membersList = ClubStorage.getData("club_members") || [];

        if (isEdit) {
            const idx = membersList.findIndex(x => x.id === id);
            if (idx !== -1) {
                membersList[idx] = {
                    ...membersList[idx],
                    name: mName,
                    email: mEmail,
                    phone: mPhone,
                    department: mDept,
                    role: mRole,
                    joinDate: mJoin,
                    status: mStat,
                    avatar: mAvat || membersList[idx].avatar
                };
                
                // Also update user profile role in sync
                let users = ClubStorage.getData("club_users") || [];
                const uIdx = users.findIndex(u => u.memberId === id);
                if (uIdx !== -1) {
                    users[uIdx].role = mRole;
                    users[uIdx].status = mStat;
                    ClubStorage.saveData("club_users", users);
                }
                
                ClubStorage.saveData("club_members", membersList);
                ClubUtils.addLog(`Cập nhật thông tin thành viên: ${mName} (${id})`);
                ClubUtils.showToast("Thành công!", "Đã cập nhật thông tin thành viên.", "success");
                setTimeout(() => { window.location.href = `member-detail.html?id=${id}`; }, 1000);
            }
        } else {
            // Check duplicated ID
            if (membersList.some(x => x.id === mId)) {
                ClubUtils.showAlert("Lỗi trùng lặp", "Mã thành viên này đã tồn tại trên hệ thống!", "error");
                return;
            }

            const newMember = {
                id: mId,
                name: mName,
                email: mEmail,
                phone: mPhone,
                department: mDept,
                role: mRole,
                joinDate: mJoin,
                status: mStat,
                avatar: mAvat || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
            };

            membersList.push(newMember);
            ClubStorage.saveData("club_members", membersList);

            // Create default login account for this member
            let users = ClubStorage.getData("club_users") || [];
            // Generate standard username from full name
            const username = mName.split(" ").pop().toLowerCase() + mId.toLowerCase();
            users.push({
                username: username,
                password: "123",
                memberId: mId,
                role: mRole,
                status: mStat
            });
            ClubStorage.saveData("club_users", users);

            ClubUtils.addLog(`Tạo thành viên mới: ${mName} (${mId})`);
            ClubUtils.showAlert("Tạo thành viên thành công!", `Đã tạo thành viên mới. Tên đăng nhập mặc định: "${username}", mật khẩu: "123"`, "success")
                .then(() => {
                    window.location.href = "members.html";
                });
        }
    });
}
