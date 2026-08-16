document.addEventListener("DOMContentLoaded", () => {
    if (!ClubAuth.checkRouteGuard()) return;

    const path = window.location.pathname;

    if (path.includes("tasks.html")) {
        initTasksListPage();
    } else if (path.includes("task-detail.html")) {
        initTaskDetailPage();
    } else if (path.includes("task-edit.html")) {
        initTaskEditPage();
    }
});

function initTasksListPage() {
    const user = ClubAuth.getCurrentUser();
    const member = ClubAuth.getCurrentMember();

    // Populate drop down filters
    populateDeptDropdown("filter-task-dept");

    // Add task button if admin, vice, leader
    const addBtnArea = document.getElementById("add-task-btn-area");
    if (addBtnArea && ["admin", "vice", "leader"].includes(user.role)) {
        addBtnArea.innerHTML = `
            <a href="task-edit.html" class="btn btn-primary">
                <i class="bi bi-plus-lg"></i> Giao việc mới
            </a>
        `;
    }

    renderTasksList();
    renderAIWorkInsights();

    document.getElementById("search-task").addEventListener("input", renderTasksList);
    document.getElementById("filter-task-dept").addEventListener("change", renderTasksList);
    document.getElementById("filter-task-status").addEventListener("change", renderTasksList);
    document.getElementById("filter-task-priority").addEventListener("change", renderTasksList);
    
    document.getElementById("reset-task-filters").addEventListener("click", () => {
        document.getElementById("search-task").value = "";
        document.getElementById("filter-task-dept").value = "";
        document.getElementById("filter-task-status").value = "";
        document.getElementById("filter-task-priority").value = "";
        renderTasksList();
    });
}

function renderTasksList() {
    const searchVal = document.getElementById("search-task").value.toLowerCase();
    const deptVal = document.getElementById("filter-task-dept").value;
    const statusVal = document.getElementById("filter-task-status").value;
    const priorityVal = document.getElementById("filter-task-priority").value;

    const tasks = ClubStorage.getData("club_tasks") || [];
    const members = ClubStorage.getData("club_members") || [];
    const user = ClubAuth.getCurrentUser();
    const member = ClubAuth.getCurrentMember();

    // Role filtration rule: member & guest only view their assigned tasks. Others view all.
    let allowedTasks = tasks;
    if (["admin", "vice"].includes(user.role)) {
        allowedTasks = tasks;
    } else if (["leader", "assistant"].includes(user.role) && member) {
        allowedTasks = tasks.filter(t => t.department === member.department);
    } else if (["member", "guest"].includes(user.role) && member) {
        allowedTasks = tasks.filter(t => t.assigneeId === member.id);
    }

    const filtered = allowedTasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchVal);
        const matchesDept = deptVal === "" || t.department === deptVal;
        const matchesStatus = statusVal === "" || t.status === statusVal;
        const matchesPriority = priorityVal === "" || t.priority === priorityVal;
        return matchesSearch && matchesDept && matchesStatus && matchesPriority;
    });

    const tbody = document.getElementById("tasks-tbody");
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Không tìm thấy công việc nào</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(t => {
        const assignee = members.find(m => m.id === t.assigneeId);
        
        let priorityBadge = "bg-primary";
        if (t.priority === "High") priorityBadge = "bg-danger";
        if (t.priority === "Medium") priorityBadge = "bg-warning";
        
        let statusBadge = "bg-warning";
        if (t.status === "Completed") statusBadge = "bg-success";
        if (t.status === "In Progress") statusBadge = "bg-primary";

        let actions = `
            <a href="task-detail.html?id=${t.id}" class="btn btn-secondary btn-sm" title="Chi tiết">
                <i class="bi bi-eye"></i>
            </a>
        `;

        if (["admin", "vice", "leader"].includes(user.role)) {
            actions += `
                <a href="task-edit.html?id=${t.id}" class="btn btn-primary btn-sm ms-1" title="Sửa">
                    <i class="bi bi-pencil"></i>
                </a>
                <button onclick="deleteTask('${t.id}')" class="btn btn-danger btn-sm ms-1" title="Xóa">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        }

        return `
            <tr>
                <td>${t.id}</td>
                <td><span class="text-primary fw-bold">${t.title}</span></td>
                <td>${t.department}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${assignee?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" class="rounded-circle me-2" style="width: 28px; height: 28px; object-fit: cover;">
                        <span class="small">${assignee?.name || "Chưa phân công"}</span>
                    </div>
                </td>
                <td><span class="badge ${priorityBadge}">${t.priority}</span></td>
                <td>${ClubUtils.formatDate(t.deadline)}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="progress flex-grow-1" style="height: 6px; width: 60px;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${t.progress}%"></div>
                        </div>
                        <span class="small">${t.progress}%</span>
                    </div>
                </td>
                <td><span class="badge ${statusBadge}">${t.status}</span></td>
                <td class="text-end">${actions}</td>
            </tr>
        `;
    }).join("");
}

window.deleteTask = function(taskId) {
    ClubUtils.showConfirm(
        "Xác nhận xóa công việc?",
        "Thao tác này sẽ xóa vĩnh viễn công việc này khỏi danh sách CLB!",
        "Xóa",
        "Hủy"
    ).then((result) => {
        if (result.isConfirmed) {
            let tasks = ClubStorage.getData("club_tasks") || [];
            const idx = tasks.findIndex(t => t.id === taskId);
            if (idx !== -1) {
                const title = tasks[idx].title;
                tasks.splice(idx, 1);
                ClubStorage.saveData("club_tasks", tasks);
                ClubUtils.addLog(`Xóa công việc: ${title} (${taskId})`);
                ClubUtils.showToast("Đã xóa!", "Công việc đã được xóa.", "success");
                renderTasksList();
            }
        }
    });
};

// Details controller
let activeTask = null;

function initTaskDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
        window.location.href = "tasks.html";
        return;
    }

    const tasks = ClubStorage.getData("club_tasks") || [];
    activeTask = tasks.find(t => t.id === id);
    if (!activeTask) {
        window.location.href = "tasks.html";
        return;
    }

    const members = ClubStorage.getData("club_members") || [];
    const assignee = members.find(m => m.id === activeTask.assigneeId);
    const creator = members.find(m => m.id === activeTask.creatorId);

    // Update basic texts
    document.getElementById("task-title-txt").innerText = activeTask.title;
    document.getElementById("task-desc-txt").innerText = activeTask.description || "Không có mô tả.";
    document.getElementById("task-dept-txt").innerText = activeTask.department;
    document.getElementById("task-start-txt").innerText = ClubUtils.formatDate(activeTask.startDate);
    document.getElementById("task-deadline-txt").innerText = ClubUtils.formatDate(activeTask.deadline);
    document.getElementById("task-assignee-txt").innerText = assignee ? `${assignee.name} (${assignee.id})` : "Chưa phân công";
    document.getElementById("task-creator-txt").innerText = creator ? `${creator.name} (${creator.id})` : "Hệ thống";

    // Badges
    const priBadge = document.getElementById("task-priority-badge");
    priBadge.innerText = activeTask.priority;
    let priColor = "bg-primary";
    if (activeTask.priority === "High") priColor = "bg-danger";
    if (activeTask.priority === "Medium") priColor = "bg-warning";
    priBadge.className = `badge mt-1 ${priColor}`;

    const statBadge = document.getElementById("task-status-badge");
    statBadge.innerText = activeTask.status;
    let statColor = "bg-warning";
    if (activeTask.status === "Completed") statColor = "bg-success";
    if (activeTask.status === "In Progress") statColor = "bg-primary";
    statBadge.className = `badge mt-1 ${statColor}`;

    // Progress
    document.getElementById("progress-percent-txt").innerText = `${activeTask.progress}%`;
    document.getElementById("progress-slider").value = activeTask.progress;
    document.getElementById("status-select").value = activeTask.status;

    // Permissions: Edit Buttons configuration
    const user = ClubAuth.getCurrentUser();
    if (["admin", "vice", "leader"].includes(user.role)) {
        document.getElementById("task-action-btns").innerHTML = `
            <a href="task-edit.html?id=${activeTask.id}" class="btn btn-primary btn-sm">
                <i class="bi bi-pencil"></i> Sửa
            </a>
        `;
    }

    // Render lists
    renderComments();
    renderAttachments();
    renderTaskHistory();

    // Bind event submit forms
    document.getElementById("comment-form").addEventListener("submit", handleCommentSubmit);
    document.getElementById("progress-form").addEventListener("submit", handleProgressSubmit);
    document.getElementById("upload-form").addEventListener("submit", handleProofSubmit);
}

function renderComments() {
    const comments = activeTask.comments || [];
    const container = document.getElementById("comments-container");
    
    if (comments.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-3">Chưa có ý kiến thảo luận nào</div>`;
        return;
    }

    container.innerHTML = comments.map(c => `
        <div class="mb-3 d-flex gap-2">
            <div class="bg-light-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-weight: bold; font-size: 0.8rem;">
                ${c.author.substring(0, 2).toUpperCase()}
            </div>
            <div class="flex-grow-1 p-2 rounded bg-light" style="background-color: var(--bg-tertiary) !important;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-bold small text-dark">${c.author}</span>
                    <small class="text-muted" style="font-size: 0.7rem;">${c.time}</small>
                </div>
                <div class="small text-secondary">${c.text}</div>
            </div>
        </div>
    `).join("");
    container.scrollTop = container.scrollHeight;
}

function renderAttachments() {
    const attachs = activeTask.attachments || [];
    const container = document.getElementById("attachments-container");

    if (attachs.length === 0) {
        container.innerHTML = `<div class="text-center text-muted small py-2">Chưa đính kèm minh chứng</div>`;
        return;
    }

    container.innerHTML = attachs.map((a, idx) => {
        const isImage = a.type && a.type.startsWith("image/");
        const hasSrc = !!a.dataUrl;
        let thumbHtml = "";
        if (isImage && hasSrc) {
            thumbHtml = `<img src="${a.dataUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;margin-right:8px;" alt="${a.name}">`;
        } else {
            thumbHtml = `<i class="bi bi-file-earmark-check text-success me-2" style="font-size:1.3rem;"></i>`;
        }

        const downloadBtn = hasSrc
            ? `<a href="${a.dataUrl}" download="${a.name}" class="btn btn-sm btn-icon btn-success me-1" style="width:28px;height:28px;font-size:0.75rem;" title="Tải về"><i class="bi bi-download"></i></a>`
            : '';

        return `
        <div class="d-flex justify-content-between align-items-center p-2 mb-2 rounded border" style="background-color: var(--primary-light);">
            <div class="d-flex align-items-center flex-grow-1 min-width-0">
                ${thumbHtml}
                <div class="min-width-0">
                    <div class="fw-bold small text-truncate" style="max-width: 160px;" title="${a.name}">${a.name}</div>
                    <div class="text-muted" style="font-size: 0.7rem;">${a.size}${a.uploadedAt ? ' · ' + a.uploadedAt : ''}</div>
                </div>
            </div>
            <div class="d-flex align-items-center">
                ${downloadBtn}
                <button onclick="removeAttachment(${idx})" class="btn btn-sm btn-icon btn-danger" style="width:28px;height:28px;font-size:0.7rem;" title="Xóa"><i class="bi bi-trash"></i></button>
            </div>
        </div>`;
    }).join("");
    container.scrollTop = container.scrollHeight;
}

function renderTaskHistory() {
    const hist = activeTask.history || [];
    const list = document.getElementById("task-history-list");
    list.innerHTML = hist.map(h => `
        <li class="list-group-item bg-transparent text-secondary small py-2 border-0">
            <span class="text-muted">[${h.time}]</span> <strong>${h.user}</strong>: ${h.text}
        </li>
    `).join("");
}

function handleCommentSubmit(e) {
    e.preventDefault();
    const user = ClubAuth.getCurrentUser();
    const member = ClubAuth.getCurrentMember();
    const textarea = document.getElementById("comment-textarea");
    const authorName = member ? member.name : user.username;

    const newComment = {
        author: authorName,
        text: textarea.value.trim(),
        time: ClubUtils.nowString()
    };

    activeTask.comments = activeTask.comments || [];
    activeTask.comments.push(newComment);
    updateActiveTask();
    
    textarea.value = "";
    renderComments();
    ClubUtils.showToast("Bình luận thành công!", "Ý kiến thảo luận đã được gửi.", "success");
}

function handleProgressSubmit(e) {
    e.preventDefault();
    const user = ClubAuth.getCurrentUser();
    const member = ClubAuth.getCurrentMember();
    const sliderVal = parseInt(document.getElementById("progress-slider").value);
    const selectVal = document.getElementById("status-select").value;
    const authorName = member ? member.name : user.username;

    const time = ClubUtils.nowString();
    
    let historyLogs = [];
    if (activeTask.progress !== sliderVal) {
        historyLogs.push(`Tiến độ thay đổi từ ${activeTask.progress}% thành ${sliderVal}%`);
    }
    if (activeTask.status !== selectVal) {
        historyLogs.push(`Trạng thái thay đổi từ "${activeTask.status}" thành "${selectVal}"`);
    }

    if (historyLogs.length === 0) {
        ClubUtils.showToast("Không có thay đổi", "Bạn chưa cập nhật thông số nào.", "warning");
        return;
    }

    const previousStatus = activeTask.status;
    activeTask.progress = sliderVal;
    activeTask.status = selectVal;
    activeTask.history = activeTask.history || [];
    
    historyLogs.forEach(logText => {
        activeTask.history.unshift({
            user: authorName,
            text: logText,
            time: time
        });
    });

    // Check Completed Transition to award Activity Score
    if (previousStatus !== "Completed" && selectVal === "Completed") {
        let members = ClubStorage.getData("club_members") || [];
        const mIdx = members.findIndex(m => m.id === activeTask.assigneeId);
        if (mIdx !== -1) {
            let scoreToAdd = 10; // Low
            if (activeTask.priority === "High") scoreToAdd = 30;
            if (activeTask.priority === "Medium") scoreToAdd = 20;

            members[mIdx].activityScore = (members[mIdx].activityScore || 0) + scoreToAdd;
            ClubStorage.saveData("club_members", members);
            
            ClubUtils.addLog(`Cộng ${scoreToAdd} điểm hoạt động cho ${members[mIdx].name} do hoàn thành task`);
            ClubUtils.showToast("Hoàn thành công việc!", `Đã cộng +${scoreToAdd} điểm hoạt động cho thành viên.`, "success");
        }
    }

    updateActiveTask();
    
    // Refresh Detail UI
    document.getElementById("progress-percent-txt").innerText = `${sliderVal}%`;
    const statBadge = document.getElementById("task-status-badge");
    statBadge.innerText = selectVal;
    let statColor = "bg-warning";
    if (selectVal === "Completed") statColor = "bg-success";
    if (selectVal === "In Progress") statColor = "bg-primary";
    statBadge.className = `badge mt-1 ${statColor}`;

    renderTaskHistory();
    ClubUtils.showToast("Đã cập nhật!", "Tiến độ công việc đã được ghi nhận.", "success");
}

function handleProofSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById("proof-file");
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
        ClubUtils.showAlert("File quá lớn", `Vui lòng chọn file nhỏ hơn ${maxSizeMB}MB.`, "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(ev) {
        const newAttach = {
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            type: file.type,
            dataUrl: ev.target.result,
            uploadedAt: ClubUtils.nowString()
        };

        activeTask.attachments = activeTask.attachments || [];
        activeTask.attachments.push(newAttach);

        const user = ClubAuth.getCurrentUser();
        const member = ClubAuth.getCurrentMember();
        const authorName = member ? member.name : user.username;
        activeTask.history = activeTask.history || [];
        activeTask.history.unshift({
            user: authorName,
            text: `Đã tải lên minh chứng: ${file.name} (${newAttach.size})`,
            time: ClubUtils.nowString()
        });

        updateActiveTask();
        fileInput.value = "";

        renderAttachments();
        renderTaskHistory();
        ClubUtils.showToast("Thành công!", "Đã tải lên minh chứng công việc.", "success");
    };
    reader.onerror = function() {
        ClubUtils.showAlert("Lỗi", "Không thể đọc file. Vui lòng thử lại.", "error");
    };
    reader.readAsDataURL(file);
}

window.removeAttachment = function(idx) {
    activeTask.attachments.splice(idx, 1);
    updateActiveTask();
    renderAttachments();
    ClubUtils.showToast("Đã gỡ bỏ", "Đã gỡ minh chứng đính kèm.", "warning");
};

function updateActiveTask() {
    let tasks = ClubStorage.getData("club_tasks") || [];
    const index = tasks.findIndex(t => t.id === activeTask.id);
    if (index !== -1) {
        tasks[index] = activeTask;
        ClubStorage.saveData("club_tasks", tasks);
    }
}

// Edit module control logic
function initTaskEditPage() {
    const user = ClubAuth.getCurrentUser();
    const currentMember = ClubAuth.getCurrentMember();
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const isEdit = id !== null;

    populateDeptDropdown("t-dept");

    if (user && user.role === "leader" && currentMember) {
        const deptSelect = document.getElementById("t-dept");
        if (deptSelect) {
            deptSelect.value = currentMember.department;
            deptSelect.disabled = true; // Leader cannot change department
            populateAssigneesDropdown(currentMember.department, "");
        }
    }

    // Dynamic selection of assigned members based on selected department
    document.getElementById("t-dept").addEventListener("change", (e) => {
        populateAssigneesDropdown(e.target.value);
    });

    const tasks = ClubStorage.getData("club_tasks") || [];

    if (isEdit) {
        document.getElementById("task-form-title").innerText = "Chỉnh sửa công việc";
        const t = tasks.find(x => x.id === id);
        if (!t) {
            window.location.href = "tasks.html";
            return;
        }

        document.getElementById("t-title").value = t.title;
        document.getElementById("t-desc").value = t.description;
        document.getElementById("t-dept").value = t.department;
        
        populateAssigneesDropdown(t.department, t.assigneeId);
        document.getElementById("t-priority").value = t.priority;
        document.getElementById("t-start").value = t.startDate;
        document.getElementById("t-deadline").value = t.deadline;
    } else {
        document.getElementById("task-form-title").innerText = "Giao công việc mới";
        document.getElementById("t-start").value = new Date().toISOString().substring(0, 10);
        // Default assignee setup
        populateAssigneesDropdown("");
    }

    document.getElementById("task-form").addEventListener("submit", (e) => {
        e.preventDefault();

        const title = document.getElementById("t-title").value.trim();
        const desc = document.getElementById("t-desc").value.trim();
        const dept = document.getElementById("t-dept").value;
        const assignee = document.getElementById("t-assignee").value;
        const priority = document.getElementById("t-priority").value;
        const start = document.getElementById("t-start").value;
        const deadline = document.getElementById("t-deadline").value;

        // Validation bounds check
        if (new Date(deadline) < new Date(start)) {
            ClubUtils.showAlert("Lỗi thời gian", "Hạn hoàn thành (Deadline) không được nhỏ hơn Ngày bắt đầu!", "error");
            return;
        }

        let tasksList = ClubStorage.getData("club_tasks") || [];
        const currentUser = ClubAuth.getCurrentUser();

        if (isEdit) {
            const index = tasksList.findIndex(x => x.id === id);
            if (index !== -1) {
                tasksList[index] = {
                    ...tasksList[index],
                    title,
                    description: desc,
                    department: dept,
                    assigneeId: assignee,
                    priority,
                    startDate: start,
                    deadline
                };
                ClubStorage.saveData("club_tasks", tasksList);
                ClubUtils.addLog(`Sửa công việc: ${title} (${id})`);
                ClubUtils.showToast("Thành công!", "Đã cập nhật công việc.", "success");
                setTimeout(() => { window.location.href = `task-detail.html?id=${id}`; }, 1000);
            }
        } else {
            // Auto generate ID
            const newId = "T0" + (tasksList.length + 1).toString().padStart(2, '0');
            const newTask = {
                id: newId,
                title,
                description: desc,
                department: dept,
                assigneeId: assignee,
                creatorId: currentUser.memberId || "M001",
                startDate: start,
                deadline,
                priority,
                status: "Pending",
                progress: 0,
                comments: [],
                history: [{
                    user: currentUser.username,
                    text: "Tạo công việc và phân công nhiệm vụ",
                    time: ClubUtils.nowString()
                }],
                attachments: []
            };

            tasksList.push(newTask);
            ClubStorage.saveData("club_tasks", tasksList);
            
            ClubUtils.addLog(`Giao công việc mới: ${title} (${newId})`);
            ClubUtils.showAlert("Giao việc thành công!", `Đã thêm mới nhiệm vụ "${title}" trên hệ thống.`, "success")
                .then(() => {
                    window.location.href = "tasks.html";
                });
        }
    });
}

function populateDeptDropdown(elementId, selectedVal = "") {
    const dropdown = document.getElementById(elementId);
    if (!dropdown) return;
    const user = ClubAuth.getCurrentUser();
    const member = ClubAuth.getCurrentMember();
    let depts = ClubStorage.getData("club_departments") || [];
    
    // Leader can only see/use their own department
    if (user && user.role === "leader" && member) {
        depts = depts.filter(d => d.name === member.department);
    }
    
    let html = elementId.includes("filter") ? '<option value="">Tất cả Ban</option>' : '<option value="">-- Chọn Ban --</option>';
    depts.forEach(d => {
        const selected = d.name === selectedVal ? 'selected' : '';
        html += `<option value="${d.name}" ${selected}>${d.name}</option>`;
    });
    dropdown.innerHTML = html;
}

function populateAssigneesDropdown(deptName, selectedId = "") {
    const dropdown = document.getElementById("t-assignee");
    if (!dropdown) return;

    const user = ClubAuth.getCurrentUser();
    const currentMember = ClubAuth.getCurrentMember();
    let members = ClubStorage.getData("club_members") || [];
    
    // Exclude Chủ nhiệm (admin role) from assignee list
    members = members.filter(m => m.role !== 'admin');
    
    // Leader can only assign to their own department
    if (user && user.role === "leader" && currentMember) {
        members = members.filter(m => m.department === currentMember.department);
    }
    
    // If a dept is selected, further filter by dept
    const filteredMembers = deptName ? members.filter(m => m.department === deptName) : members;

    let html = '<option value="">-- Chọn thành viên phụ trách --</option>';
    filteredMembers.forEach(m => {
        const selected = m.id === selectedId ? 'selected' : '';
        html += `<option value="${m.id}" ${selected}>${m.name} (${m.id}) - ${m.department}</option>`;
    });
    dropdown.innerHTML = html;
}

window.renderAIWorkInsights = function(retryCount) {
    const container = document.getElementById("ai-work-insights-content");
    if (!container) return;

    retryCount = retryCount || 0;

    // If AIService not loaded yet, retry up to 10 times (5 seconds total)
    if (typeof AIService === "undefined") {
        if (retryCount >= 10) {
            container.innerHTML = `<span class="text-warning small"><i class="bi bi-exclamation-triangle me-1"></i>Không thể tải AI Service. Vui lòng tải lại trang.</span>`;
            return;
        }
        setTimeout(() => window.renderAIWorkInsights(retryCount + 1), 500);
        return;
    }

    try {
        const insights = AIService.getWorkInsights();
        let html = `<ul class="mb-0 ps-3">`;
        insights.insights.forEach(item => {
            html += `<li class="mb-1">${item}</li>`;
        });
        html += `</ul>`;
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<span class="text-danger small"><i class="bi bi-x-circle me-1"></i>Lỗi phân tích AI: ${err.message}</span>`;
    }
};

