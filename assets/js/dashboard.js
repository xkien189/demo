document.addEventListener("DOMContentLoaded", () => {
    // Confirm session
    if (!ClubAuth.checkRouteGuard()) return;

    // Load Settings slogan
    const settings = ClubStorage.getData("club_settings") || {};
    document.getElementById("slogan-txt").innerText = settings.slogan || "";

    // Generate metrics stats
    renderMetrics();

    // Render quick action buttons by permission
    renderQuickActions();

    // Render Leaderboard Rank
    renderDashboardLeaderboard();

    // Render Urgent Tasks
    renderUrgentTasks();

    // Render notifications
    renderRecentNotifications();

    // Initialize Chart.js
    initTasksChart();
});

function renderMetrics() {
    const members = ClubStorage.getData("club_members") || [];
    const departments = ClubStorage.getData("club_departments") || [];
    const tasks = ClubStorage.getData("club_tasks") || [];

    const activeMembers = members.filter(m => m.status === "Active").length;
    const totalDepts = departments.length;
    const totalTasks = tasks.length;
    
    const completedTasks = tasks.filter(t => t.status === "Completed").length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById("stat-members").innerText = activeMembers;
    document.getElementById("stat-depts").innerText = totalDepts;
    document.getElementById("stat-tasks").innerText = totalTasks;
    document.getElementById("stat-progress").innerText = `${progressPercent}%`;
}

function renderQuickActions() {
    const btnContainer = document.getElementById("quick-action-btns");
    if (!btnContainer) return;

    const user = ClubAuth.getCurrentUser();
    
    if (["admin", "vice", "leader"].includes(user.role)) {
        let html = `<a href="task-edit.html" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Giao việc mới</a>`;
        if (["admin", "vice"].includes(user.role)) {
            html += ` <a href="member-edit.html" class="btn btn-secondary ms-2"><i class="bi bi-person-plus"></i> Thêm thành viên</a>`;
        }
        btnContainer.innerHTML = html;
    }
}

function renderDashboardLeaderboard() {
    const container = document.getElementById("leaderboard-container");
    if (!container) return;

    const members = ClubStorage.getData("club_members") || [];
    // Sort members by activityScore descending, pick top 5
    const topMembers = [...members]
        .filter(m => m.status === "Active")
        .sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0))
        .slice(0, 5);

    if (topMembers.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-3">Không có dữ liệu xếp hạng</div>`;
        return;
    }

    container.innerHTML = topMembers.map((m, idx) => {
        let rankBadge = "";
        if (idx === 0) rankBadge = '<i class="bi bi-trophy-fill text-warning me-1"></i>';
        else if (idx === 1) rankBadge = '<i class="bi bi-trophy-fill text-secondary me-1"></i>';
        else if (idx === 2) rankBadge = '<i class="bi bi-trophy-fill text-danger me-1"></i>';
        else rankBadge = `<span class="fw-bold me-2 text-muted">#${idx + 1}</span>`;

        return `
            <div class="d-flex align-items-center justify-content-between p-2 mb-2 rounded border bg-light-primary" style="background-color: var(--primary-light);">
                <div class="d-flex align-items-center gap-2 text-truncate">
                    ${rankBadge}
                    <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" class="rounded-circle" style="width: 28px; height: 28px; object-fit: cover;">
                    <div class="text-truncate">
                        <div class="fw-bold text-dark small text-truncate" style="max-width: 110px;">${m.name}</div>
                        <div class="text-muted text-truncate" style="font-size: 0.65rem; max-width: 110px;">${m.department}</div>
                    </div>
                </div>
                <div class="badge bg-primary text-white" style="font-size: 0.75rem;">${m.activityScore || 0} đ</div>
            </div>
        `;
    }).join("");
}

function renderUrgentTasks() {
    const container = document.getElementById("urgent-tasks-container");
    if (!container) return;

    const tasks = ClubStorage.getData("club_tasks") || [];
    // Sort tasks by deadline (earliest first) and select non-completed tasks
    const pendingTasks = tasks
        .filter(t => t.status !== "Completed" && t.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (pendingTasks.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-3">Không có công việc nào sắp đến hạn</div>`;
        return;
    }

    container.innerHTML = pendingTasks.slice(0, 3).map(t => {
        let badgeColor = "bg-primary";
        if (t.priority === "High") badgeColor = "bg-danger";
        if (t.priority === "Medium") badgeColor = "bg-warning";
        
        return `
            <div class="card mb-2 p-3 shadow-none border" style="cursor: pointer;" onclick="location.href='task-detail.html?id=${t.id}'">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge ${badgeColor}">${t.priority}</span>
                    <small class="text-danger fw-bold"><i class="bi bi-clock me-1"></i>Hạn: ${ClubUtils.formatDate(t.deadline)}</small>
                </div>
                <div class="fw-bold text-truncate text-primary" style="font-size: 0.9rem;">${t.title}</div>
                <div class="progress mt-2" style="height: 6px;">
                    <div class="progress-bar bg-success" role="progressbar" style="width: ${t.progress}%" aria-valuenow="${t.progress}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderRecentNotifications() {
    const container = document.getElementById("notifications-container");
    if (!container) return;

    const notifications = ClubStorage.getData("club_notifications") || [];
    if (notifications.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-3">Không có thông báo mới</div>`;
        return;
    }

    container.innerHTML = notifications.slice(0, 3).map(n => `
        <div class="p-3 mb-2 rounded border-start border-4 border-primary bg-light-primary" style="background-color: var(--primary-light);">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-dark" style="font-size: 0.9rem;">${n.title}</span>
                <small class="text-muted">${n.date}</small>
            </div>
            <p class="mb-0 text-secondary small text-truncate" style="max-width: 90%;">${n.text}</p>
        </div>
    `).join("");
}

function renderActivityLogs() {
    const container = document.getElementById("logs-container");
    if (!container) return;

    const logs = ClubStorage.getData("club_logs") || [];
    if (logs.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-3">Chưa ghi nhận hoạt động nào</div>`;
        return;
    }

    container.innerHTML = logs.slice(0, 5).map(log => {
        let typeClass = "success";
        if (log.action.includes("Đăng nhập") || log.action.includes("Đăng xuất")) {
            typeClass = "info";
        } else if (log.action.includes("Xóa")) {
            typeClass = "danger";
        }
        
        return `
            <li class="activity-item ${typeClass}">
                <div class="activity-dot"></div>
                <div class="activity-time fw-semibold">${log.time}</div>
                <div class="activity-text"><strong>${log.user}</strong>: ${log.action}</div>
            </li>
        `;
    }).join("");
}

function initTasksChart() {
    const canvas = document.getElementById("tasksChart");
    if (!canvas) return;

    const depts = ClubStorage.getData("club_departments") || [];
    const tasks = ClubStorage.getData("club_tasks") || [];

    const labels = depts.map(d => d.name);
    const completedCounts = depts.map(d => tasks.filter(t => t.department === d.name && t.status === "Completed").length);
    const inProgressCounts = depts.map(d => tasks.filter(t => t.department === d.name && t.status === "In Progress").length);
    const pendingCounts = depts.map(d => tasks.filter(t => t.department === d.name && t.status === "Pending").length);

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Đã hoàn thành',
                    data: completedCounts,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                },
                {
                    label: 'Đang thực hiện',
                    data: inProgressCounts,
                    backgroundColor: '#2563eb',
                    borderRadius: 4
                },
                {
                    label: 'Chờ xử lý',
                    data: pendingCounts,
                    backgroundColor: '#f59e0b',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#f9fafb' : '#475569'
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: document.body.getAttribute('data-theme') === 'dark' ? '#f9fafb' : '#475569' }
                },
                y: {
                    stacked: true,
                    grid: { color: document.body.getAttribute('data-theme') === 'dark' ? '#374151' : '#e2e8f0' },
                    ticks: {
                        stepSize: 1,
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#f9fafb' : '#475569'
                    }
                }
            }
        }
    });
}
