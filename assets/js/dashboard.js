/* ================================================================
   DASHBOARD.JS – CLB CNTT UHL – Modern Calm & Clean v3
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
    if (!ClubAuth.checkRouteGuard(["admin", "vice", "leader", "assistant"])) return;

    const user = ClubAuth.getCurrentUser();
    const settings = ClubStorage.getData("club_settings") || {};
    const sloganEl = document.getElementById("slogan-txt");
    if (sloganEl && settings.slogan) {
        sloganEl.innerText = settings.slogan;
    }

    renderKPIs();
    renderHeaderActions();
    renderAdminAlerts();
    renderQuickActions();
    renderNotificationsMini();
    initTasksChart();
    renderNewMembers();
    renderUpcomingEvents();
    renderActivityFeed();

    // Role-based adaptations
    if (!["admin", "vice"].includes(user.role)) {
        const adminCard = document.getElementById("admin-alert-card");
        if (adminCard) adminCard.style.display = "none";
        const logsBtn = document.getElementById("btn-view-logs");
        if (logsBtn) logsBtn.style.display = "none";
    }

    // Firestore real-time refresh registration
    if (typeof ClubStorage.registerUIRefresh === "function") {
        const refreshAll = () => {
            renderKPIs();
            renderAdminAlerts();
            renderNewMembers();
            renderUpcomingEvents();
            renderActivityFeed();
            renderNotificationsMini();
        };
        ClubStorage.registerUIRefresh("club_members", refreshAll);
        ClubStorage.registerUIRefresh("club_tasks", refreshAll);
        ClubStorage.registerUIRefresh("club_notifications", refreshAll);
        ClubStorage.registerUIRefresh("club_events", refreshAll);
        ClubStorage.registerUIRefresh("club_logs", refreshAll);
    }
});

// ─── 1. KPIs ───────────────────────────────────────────────────
function renderKPIs() {
    const members = ClubStorage.getData("club_members") || [];
    const tasks   = ClubStorage.getData("club_tasks")   || [];
    const events  = ClubStorage.getData("club_events")  || [];

    const activeMembers = members.filter(m => m.status === "Active");
    setText("kpi-members", activeMembers.length);
    setText("kpi-members-trend", `${activeMembers.length} thành viên sẵn sàng`);

    // New members this month
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const newCount = activeMembers.filter(m => {
        if (!m.joinDate) return false;
        const d = new Date(m.joinDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    setText("kpi-new-members", newCount);
    const newTrendEl = document.getElementById("kpi-new-trend");
    if (newTrendEl) {
        newTrendEl.innerHTML = newCount > 0 
            ? `<i class="bi bi-arrow-up-short"></i> +${newCount} trong tháng này` 
            : `<i class="bi bi-dash"></i> Không có TV mới`;
    }

    // In Progress tasks
    const inProgress = tasks.filter(t => t.status === "In Progress").length;
    setText("kpi-inprogress", inProgress);
    setText("kpi-task-trend", `${inProgress}/${tasks.length} tổng công việc`);

    // Overdue tasks
    const today = new Date(); today.setHours(0,0,0,0);
    const overdue = tasks.filter(t => 
        t.status !== "Completed" && t.deadline && new Date(t.deadline) < today
    ).length;
    setText("kpi-overdue", overdue);
    const overdueTile = document.getElementById("kpi-overdue-tile");
    const overdueTrend = document.getElementById("kpi-overdue-trend");
    if (overdueTile && overdueTrend) {
        if (overdue > 0) {
            overdueTile.classList.add("kpi-danger-tile");
            overdueTrend.className = "kpi-tile-sub text-danger fw-semibold";
            overdueTrend.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Cần xử lý ngay`;
        } else {
            overdueTile.classList.remove("kpi-danger-tile");
            overdueTrend.className = "kpi-tile-sub text-success";
            overdueTrend.innerHTML = `<i class="bi bi-check2"></i> Đúng tiến độ`;
        }
    }

    // Upcoming events (next 30 days)
    const next30 = new Date(); next30.setDate(next30.getDate() + 30);
    const upcomingCount = events.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d >= today && d <= next30;
    }).length;
    setText("kpi-events", upcomingCount);
    setText("kpi-event-trend", `${upcomingCount} sự kiện 30 ngày tới`);

    // Completion percentage
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    setText("kpi-completion", pct + "%");
    setText("kpi-completion-trend", `${completed}/${total} hoàn thành`);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

// ─── 2. HEADER ACTIONS ─────────────────────────────────────────
function renderHeaderActions() {
    const user = ClubAuth.getCurrentUser();
    const container = document.getElementById("quick-action-btns");
    if (!container) return;

    let html = "";
    if (["admin", "vice", "leader"].includes(user.role)) {
        html += `<a href="task-edit.html" class="btn btn-primary btn-sm px-3 shadow-sm">
            <i class="bi bi-plus-lg me-1"></i> Giao việc mới
        </a>`;
    }
    if (["admin", "vice"].includes(user.role)) {
        html += `<a href="member-edit.html" class="btn btn-outline-secondary btn-sm px-3 ms-1">
            <i class="bi bi-person-plus me-1"></i> Thêm thành viên
        </a>`;
    }
    container.innerHTML = html;
}

// ─── 3. ADMIN ACTION CENTER ────────────────────────────────────
function renderAdminAlerts() {
    const user = ClubAuth.getCurrentUser();
    if (!["admin", "vice"].includes(user.role)) return;

    const adminCard = document.getElementById("admin-alert-card");
    if (!adminCard) return;

    const tasks   = ClubStorage.getData("club_tasks")   || [];
    const members = ClubStorage.getData("club_members") || [];
    const events  = ClubStorage.getData("club_events")  || [];
    const today   = new Date(); today.setHours(0,0,0,0);
    const next7   = new Date(); next7.setDate(next7.getDate() + 7);

    // Filter action items
    const overdueTasks  = tasks.filter(t => t.status !== "Completed" && t.deadline && new Date(t.deadline) < today);
    const pendingTasks  = tasks.filter(t => t.status === "Pending");
    const unassigned    = members.filter(m => m.status === "Active" && (!m.department || !m.department.trim()));
    const eventsThisWeek= events.filter(e => e.date && new Date(e.date) >= today && new Date(e.date) <= next7);

    const actionItems = [];

    if (overdueTasks.length > 0) {
        actionItems.push({
            type: "danger",
            icon: "bi-exclamation-octagon",
            title: `${overdueTasks.length} công việc đã quá hạn tiến độ`,
            desc: `Gần nhất: "${overdueTasks[0].title}" (Hạn: ${overdueTasks[0].deadline})`,
            badge: `${overdueTasks.length} việc`,
            badgeClass: "bg-danger text-white",
            href: "tasks.html"
        });
    }

    if (pendingTasks.length > 0) {
        actionItems.push({
            type: "warning",
            icon: "bi-hourglass-split",
            title: `${pendingTasks.length} công việc đang ở trạng thái chờ bắt đầu`,
            desc: "Cần phân công hoặc kích hoạt triển khai công việc",
            badge: `${pendingTasks.length} việc`,
            badgeClass: "bg-warning text-dark",
            href: "tasks.html"
        });
    }

    if (unassigned.length > 0) {
        actionItems.push({
            type: "info",
            icon: "bi-person-exclamation",
            title: `${unassigned.length} thành viên chưa được phân bổ vào Ban`,
            desc: `Ví dụ: ${unassigned.map(m => m.name).slice(0, 2).join(", ")}...`,
            badge: `${unassigned.length} TV`,
            badgeClass: "bg-info text-white",
            href: "members.html"
        });
    }

    if (eventsThisWeek.length > 0) {
        actionItems.push({
            type: "primary",
            icon: "bi-calendar-check",
            title: `${eventsThisWeek.length} sự kiện sẽ diễn ra trong tuần này`,
            desc: `Gần nhất: "${eventsThisWeek[0].title}" vào ngày ${eventsThisWeek[0].date}`,
            badge: `${eventsThisWeek.length} sự kiện`,
            badgeClass: "bg-primary text-white",
            href: "events.html"
        });
    }

    const totalAlertCount = actionItems.length;
    const badgeEl = document.getElementById("total-alert-count");
    if (badgeEl) badgeEl.innerText = `${totalAlertCount} việc`;

    const listEl = document.getElementById("admin-alerts-list");
    if (!listEl) return;

    if (actionItems.length === 0) {
        adminCard.classList.remove("has-urgent");
        adminCard.style.display = "";
        listEl.innerHTML = `
            <div class="clean-empty py-4">
                <i class="bi bi-check-circle text-success" style="font-size:2rem;opacity:1;"></i>
                <p class="mt-2 fw-semibold text-success">Mọi hoạt động đều đang diễn ra thuận lợi</p>
                <small class="text-muted">Không có công việc quá hạn hay sự cố cần xử lý gấp.</small>
            </div>
        `;
        return;
    }

    adminCard.style.display = "";
    if (overdueTasks.length > 0) {
        adminCard.classList.add("has-urgent");
    } else {
        adminCard.classList.remove("has-urgent");
    }

    listEl.innerHTML = actionItems.map(item => `
        <a href="${item.href}" class="action-item-row">
            <div class="action-status-pill ${item.type}">
                <i class="bi ${item.icon}"></i>
            </div>
            <div class="action-item-info">
                <div class="action-item-title">${item.title}</div>
                <div class="action-item-desc">${item.desc}</div>
            </div>
            <span class="badge ${item.badgeClass} action-item-badge me-2">${item.badge}</span>
            <button class="action-btn-link">Xử lý <i class="bi bi-chevron-right ms-1"></i></button>
        </a>
    `).join("");
}

// ─── 4. QUICK ACTIONS GRID ─────────────────────────────────────
function renderQuickActions() {
    const user = ClubAuth.getCurrentUser();
    const container = document.getElementById("quick-actions-grid");
    if (!container) return;

    const allShortcuts = [
        { icon: "bi-list-task",       label: "Giao việc",       href: "task-edit.html",   roles: ["admin","vice","leader","assistant"] },
        { icon: "bi-person-plus",     label: "Thêm TV",         href: "member-edit.html", roles: ["admin","vice"] },
        { icon: "bi-calendar-plus",   label: "Tạo sự kiện",     href: "events.html",      roles: ["admin","vice","leader"] },
        { icon: "bi-bell",            label: "Thông báo",       href: "notifications.html", roles: ["admin","vice"] },
        { icon: "bi-building",        label: "Quản lý Ban",     href: "departments.html", roles: ["admin","vice"] },
        { icon: "bi-wallet2",         label: "Quỹ CLB",         href: "funds.html",       roles: ["admin","vice"] },
        { icon: "bi-folder2-open",    label: "Kho MC",          href: "evidence.html",    roles: ["admin","vice","leader","assistant","member","guest"] },
        { icon: "bi-calendar3",       label: "Lịch công tác",   href: "calendar.html",    roles: ["admin","vice","leader","assistant","member","guest"] },
        { icon: "bi-journal-text",    label: "Nhật ký",         href: "logs.html",        roles: ["admin","vice"] },
    ];

    const visible = allShortcuts.filter(s => s.roles.includes(user.role)).slice(0, 6);

    container.innerHTML = visible.map(s => `
        <a href="${s.href}" class="quick-btn">
            <i class="bi ${s.icon}"></i>
            <span>${s.label}</span>
        </a>
    `).join("");
}

// ─── 5. STACKED BAR CHART ──────────────────────────────────────
let chartInstance = null;

function initTasksChart() {
    const canvas = document.getElementById("tasksChart");
    if (!canvas) return;

    const depts = ClubStorage.getData("club_departments") || [];
    const tasks = ClubStorage.getData("club_tasks")       || [];
    const today = new Date(); today.setHours(0,0,0,0);

    let labels, completed, inProgress, pending, overdue;

    if (depts.length > 0 && tasks.length > 0) {
        labels     = depts.map(d => d.name.replace("Ban ", ""));
        completed  = depts.map(d => tasks.filter(t => t.department === d.name && t.status === "Completed").length);
        inProgress = depts.map(d => tasks.filter(t => t.department === d.name && t.status === "In Progress").length);
        pending    = depts.map(d => tasks.filter(t => t.department === d.name && t.status === "Pending").length);
        overdue    = depts.map(d => tasks.filter(t => 
            t.department === d.name && t.status !== "Completed" && t.deadline && new Date(t.deadline) < today
        ).length);
    } else {
        labels     = ["Chuyên môn", "Truyền thông", "Đối ngoại", "Sự kiện", "Tài chính"];
        completed  = [3, 2, 2, 1, 1];
        inProgress = [2, 2, 1, 1, 0];
        pending    = [1, 1, 0, 1, 1];
        overdue    = [0, 1, 0, 0, 0];
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark" 
                || document.body.getAttribute("data-theme") === "dark";
    const tickColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)";

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Hoàn thành", data: completed,  backgroundColor: "#10b981", borderRadius: 4, barThickness: 24 },
                { label: "Đang làm",   data: inProgress, backgroundColor: "#2563eb", borderRadius: 4, barThickness: 24 },
                { label: "Chờ xử lý",  data: pending,    backgroundColor: "#f59e0b", borderRadius: 4, barThickness: 24 },
                { label: "Quá hạn",    data: overdue,    backgroundColor: "#ef4444", borderRadius: 4, barThickness: 24 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 10,
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} công việc`
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: tickColor, font: { size: 11, family: "Be Vietnam Pro" } }
                },
                y: {
                    stacked: true,
                    grid: { color: gridColor },
                    ticks: { stepSize: 1, color: tickColor, font: { size: 11, family: "Be Vietnam Pro" } },
                    beginAtZero: true
                }
            }
        }
    });
}

// ─── 6. UPCOMING EVENTS ────────────────────────────────────────
function renderUpcomingEvents() {
    const container = document.getElementById("upcoming-events-list");
    if (!container) return;

    const events  = ClubStorage.getData("club_events")  || [];
    const members = ClubStorage.getData("club_members") || [];
    const today   = new Date(); today.setHours(0,0,0,0);

    const upcoming = events
        .filter(e => e.date && new Date(e.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

    // Fallback demo events if none in storage
    const DEMO_EVENTS = [
        { id: "DE1", title: "Workshop: Lập trình Web hiện đại", date: getFutureDate(3), location: "Phòng máy 302", leaderId: "M001", attendeesCount: 45 },
        { id: "DE2", title: "Họp Ban chủ nhiệm định kỳ", date: getFutureDate(7), location: "Phòng họp B1", leaderId: "M002", attendeesCount: 12 },
        { id: "DE3", title: "Cuộc thi Hackathon nội bộ UHL", date: getFutureDate(15), location: "Hội trường A2", leaderId: "M001", attendeesCount: 60 }
    ];

    const toRender = upcoming.length > 0 ? upcoming : DEMO_EVENTS;

    container.innerHTML = toRender.map(e => {
        const d = new Date(e.date);
        const day = d.getDate().toString().padStart(2, "0");
        const month = "T" + (d.getMonth() + 1);
        const leader = members.find(m => m.id === e.leaderId);
        const leaderName = leader ? leader.name : "Chưa phân công";

        const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
        let badgeHtml = "";
        if (daysLeft <= 3) {
            badgeHtml = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle" style="font-size:0.68rem;">Sắp tới</span>`;
        } else if (daysLeft <= 7) {
            badgeHtml = `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style="font-size:0.68rem;">Tuần này</span>`;
        }

        return `
            <div class="event-item">
                <div class="event-date-badge">
                    <span class="day">${day}</span>
                    <span class="mon">${month}</span>
                </div>
                <div class="event-details">
                    <div class="d-flex align-items-center justify-content-between gap-2">
                        <div class="event-title">${e.title}</div>
                        ${badgeHtml}
                    </div>
                    <div class="event-meta">
                        <span><i class="bi bi-geo-alt me-1"></i>${e.location || "TBA"}</span>
                        <span>&bull;</span>
                        <span><i class="bi bi-person me-1"></i>${leaderName}</span>
                        ${e.attendeesCount ? `<span>&bull;</span><span><i class="bi bi-people me-1"></i>${e.attendeesCount} người</span>` : ""}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function getFutureDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
}

// ─── 7. NEW MEMBERS ────────────────────────────────────────────
function renderNewMembers() {
    const container = document.getElementById("new-members-list");
    if (!container) return;

    const members = ClubStorage.getData("club_members") || [];
    const sorted = [...members]
        .filter(m => m.status === "Active" && m.joinDate)
        .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
        .slice(0, 4);

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="clean-empty py-3">
                <i class="bi bi-person-plus"></i>
                <p>Chưa có thành viên mới nào</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sorted.map(m => {
        const roleLabel = ClubAuth.ROLES[m.role] ? ClubAuth.ROLES[m.role].title : m.role;
        const joinDateFormatted = m.joinDate ? new Date(m.joinDate).toLocaleDateString("vi-VN") : "";

        return `
            <a href="member-detail.html?id=${m.id}" class="new-member-row">
                <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}"
                     class="new-member-avatar" alt="${m.name}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'">
                <div class="new-member-info">
                    <div class="new-member-name">${m.name}</div>
                    <div class="new-member-dept">${roleLabel} &bull; ${m.department || "Chưa phân ban"}</div>
                </div>
                <div class="new-member-date">${joinDateFormatted}</div>
            </a>
        `;
    }).join("");
}

// ─── 8. RECENT ACTIVITY TIMELINE ───────────────────────────────
function renderActivityFeed() {
    const container = document.getElementById("activity-feed-list");
    if (!container) return;

    const logs = ClubStorage.getData("club_logs") || [];

    const DEMO_LOGS = [
        { time: "Hôm nay 09:10", user: "Nguyễn Văn An", action: "Đăng nhập hệ thống điều hành", type: "info" },
        { time: "Hôm nay 08:45", user: "Trần Thị Bình", action: "Cập nhật tiến độ công việc T001 lên 60%", type: "success" },
        { time: "Hôm qua 16:30", user: "Lê Văn Cường", action: "Tham gia Ban Truyền thông", type: "success" },
        { time: "Hôm qua 14:00", user: "Phạm Thị Dung", action: "Nộp minh chứng đóng quỹ HK1", type: "primary" },
        { time: "2 ngày trước", user: "Nguyễn Văn An", action: "Khởi tạo đợt thu quỹ mới HK1", type: "primary" },
    ];

    const toRender = logs.length > 0 ? logs.slice(0, 5) : DEMO_LOGS;

    container.innerHTML = toRender.map(log => {
        let type = log.type || "primary";
        const act = log.action || "";
        if (!log.type) {
            if (act.includes("Đăng nhập") || act.includes("Đăng xuất")) type = "info";
            else if (act.includes("Xóa") || act.includes("quá hạn")) type = "danger";
            else if (act.includes("Tạo") || act.includes("Thêm") || act.includes("Hoàn thành")) type = "success";
        }

        return `
            <li class="timeline-item">
                <div class="timeline-point ${type}"></div>
                <div class="timeline-time">${log.time}</div>
                <div class="timeline-content">
                    <strong>${log.user}</strong>: ${act}
                </div>
            </li>
        `;
    }).join("");
}

// ─── 9. RECENT NOTIFICATIONS MINI ──────────────────────────────
function renderNotificationsMini() {
    const container = document.getElementById("notifications-mini");
    if (!container) return;

    const user = ClubAuth.getCurrentUser();
    const member = ClubAuth.getCurrentMember();
    const notifications = ClubStorage.getData("club_notifications") || [];

    const visible = notifications.filter(n => {
        if (["admin", "vice"].includes(user.role)) return true;
        if (!n.target || n.target === "All" || n.type === "General") return true;
        return member && member.department === n.target;
    }).slice(0, 3);

    if (visible.length === 0) {
        container.innerHTML = `
            <div class="clean-empty py-3">
                <i class="bi bi-bell-slash"></i>
                <p>Không có thông báo mới</p>
            </div>
        `;
        return;
    }

    container.innerHTML = visible.map(n => `
        <a href="notifications.html" class="notif-row">
            <div class="notif-dot-marker"></div>
            <div class="flex-grow-1 min-w-0">
                <div class="notif-title">${n.title}</div>
                <div class="notif-text">${n.text}</div>
                <div class="notif-time">${n.date || ""}</div>
            </div>
        </a>
    `).join("");
}
