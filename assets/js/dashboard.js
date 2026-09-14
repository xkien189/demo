/* ================================================================
   DASHBOARD.JS – CLB CNTT UHL – v2 Redesign
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
    if (!ClubAuth.checkRouteGuard(["admin", "vice", "leader", "assistant"])) return;

    const user = ClubAuth.getCurrentUser();
    const settings = ClubStorage.getData("club_settings") || {};
    const sloganEl = document.getElementById("slogan-txt");
    if (sloganEl) sloganEl.innerText = settings.slogan || "Theo doi toan bo hoat dong va cong viec cua CLB";

    // Render all dashboard sections
    renderKPIs();
    renderHeaderActions();
    renderAdminAlerts();
    renderQuickActions();
    renderNotificationsMini();
    initTasksChart();
    renderNewMembers();
    renderUpcomingEvents();
    renderActivityFeed();

    // Layout adjustment for non-admin roles
    adjustLayoutForRole(user.role);

    // Firestore real-time sync
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

// ─── LAYOUT ADJUSTMENT ──────────────────────────────────────────
function adjustLayoutForRole(role) {
    const isAdminOrVice = ["admin", "vice"].includes(role);

    const adminAlertCol  = document.getElementById("admin-alert-col");
    const rightSidebar   = document.getElementById("right-sidebar-col");
    const nonadminRow2   = document.getElementById("nonadmin-row2");
    const btnViewLogs    = document.getElementById("btn-view-logs");

    if (isAdminOrVice) {
        if (adminAlertCol) adminAlertCol.style.display = "";
        if (rightSidebar)  rightSidebar.style.display  = "";
        if (nonadminRow2)  nonadminRow2.style.display  = "none";
        if (btnViewLogs)   btnViewLogs.style.display   = "";
    } else {
        if (adminAlertCol) adminAlertCol.style.display = "none";
        if (rightSidebar)  rightSidebar.style.display  = "none";
        if (nonadminRow2)  nonadminRow2.style.display  = "";
        if (btnViewLogs)   btnViewLogs.style.display   = "none";
        // Fill non-admin quick actions + notifications
        renderQuickActionsTarget("quick-actions-grid-na", role);
        renderNotificationsMiniTarget("notifications-mini-na");
    }
}

// ─── KPIs ────────────────────────────────────────────────────────
function renderKPIs() {
    const members  = ClubStorage.getData("club_members") || [];
    const tasks    = ClubStorage.getData("club_tasks")   || [];
    const events   = ClubStorage.getData("club_events")  || [];

    // Tong thanh vien
    const activeMembers = members.filter(m => m.status === "Active");
    setText("kpi-members", activeMembers.length);

    // TV moi thang nay
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();
    const newThisMonth = activeMembers.filter(m => {
        if (!m.joinDate) return false;
        const d = new Date(m.joinDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    setText("kpi-new-members", newThisMonth);
    setTrend("kpi-new-trend", newThisMonth, 0, "TV mới tháng này");

    // CV dang thuc hien
    const inProgress = tasks.filter(t => t.status === "In Progress").length;
    setText("kpi-inprogress", inProgress);
    setTrend("kpi-task-trend", inProgress, 0, "đang chạy");

    // CV qua han
    const today = new Date(); today.setHours(0,0,0,0);
    const overdue = tasks.filter(t => {
        if (t.status === "Completed") return false;
        if (!t.deadline) return false;
        return new Date(t.deadline) < today;
    }).length;
    setText("kpi-overdue", overdue);
    const overdueEl = document.getElementById("kpi-overdue-trend");
    if (overdueEl) {
        overdueEl.className = "kpi-trend";
        if (overdue > 0) {
            overdueEl.className += " down";
            overdueEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>Cần xử lý ngay`;
        } else {
            overdueEl.className += " up";
            overdueEl.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>Không có CV quá hạn`;
        }
    }

    // Su kien sap toi (trong 30 ngay)
    const next30 = new Date(); next30.setDate(next30.getDate() + 30);
    const upcomingEvents = events.filter(e => {
        if (!e.date) return false;
        const ed = new Date(e.date);
        return ed >= today && ed <= next30;
    }).length;
    setText("kpi-events", upcomingEvents);
    setTrend("kpi-event-trend", upcomingEvents, 0, "trong 30 ngày tới");

    // Ty le hoan thanh
    const total     = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    setText("kpi-completion", pct + "%");
    const compEl = document.getElementById("kpi-completion-trend");
    if (compEl) {
        compEl.className = "kpi-trend " + (pct >= 60 ? "up" : pct >= 30 ? "flat" : "down");
        compEl.innerHTML = `${completed}/${total} công việc xong`;
    }

    // Members trend
    setTrend("kpi-members-trend", activeMembers.length, 0, "thành viên đang hoạt động");
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function setTrend(id, current, prev, label) {
    const el = document.getElementById(id);
    if (!el) return;
    if (current > prev) {
        el.className = "kpi-trend up";
        el.innerHTML = `<i class="bi bi-arrow-up-short"></i>+${current - prev} ${label}`;
    } else if (current < prev) {
        el.className = "kpi-trend down";
        el.innerHTML = `<i class="bi bi-arrow-down-short"></i>${current - prev} ${label}`;
    } else {
        el.className = "kpi-trend flat";
        el.innerHTML = `<i class="bi bi-dash"></i>${label}`;
    }
}

// ─── HEADER ACTIONS ──────────────────────────────────────────────
function renderHeaderActions() {
    const user = ClubAuth.getCurrentUser();
    const container = document.getElementById("quick-action-btns");
    if (!container) return;

    let html = "";
    if (["admin","vice","leader"].includes(user.role)) {
        html += `<a href="task-edit.html" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg me-1"></i>Giao việc mới</a>`;
    }
    if (["admin","vice"].includes(user.role)) {
        html += ` <a href="member-edit.html" class="btn btn-outline-secondary btn-sm ms-1"><i class="bi bi-person-plus me-1"></i>Thêm thành viên</a>`;
    }
    container.innerHTML = html;
}

// ─── ADMIN ALERTS ────────────────────────────────────────────────
function renderAdminAlerts() {
    const user = ClubAuth.getCurrentUser();
    if (!["admin","vice"].includes(user.role)) return;

    const tasks         = ClubStorage.getData("club_tasks")         || [];
    const members       = ClubStorage.getData("club_members")       || [];
    const events        = ClubStorage.getData("club_events")        || [];
    const notifications = ClubStorage.getData("club_notifications") || [];

    const today = new Date(); today.setHours(0,0,0,0);

    // 1. CV qua han
    const overdueTasks = tasks.filter(t => t.status !== "Completed" && t.deadline && new Date(t.deadline) < today);
    // 2. CV pending (chua bat dau)
    const pendingTasks = tasks.filter(t => t.status === "Pending");
    // 3. TV chua duoc phan ban
    const unassigned = members.filter(m => m.status === "Active" && (!m.department || m.department.trim() === ""));
    // 4. Su kien sap toi can xac nhan (trong 7 ngay)
    const next7 = new Date(); next7.setDate(next7.getDate() + 7);
    const eventsSoon = events.filter(e => {
        if (!e.date) return false;
        const ed = new Date(e.date);
        return ed >= today && ed <= next7;
    });
    // 5. Thong bao chua doc (simulate: all unread)
    const unreadNotifs = notifications.slice(0, 3);

    const alerts = [
        { icon: "bi-exclamation-circle-fill", type: "danger",  title: "Công việc quá hạn",        count: overdueTasks.length, sub: "Cần xử lý ngay",          href: "tasks.html",         show: overdueTasks.length > 0 },
        { icon: "bi-hourglass-split",         type: "warning", title: "Công việc chờ bắt đầu",     count: pendingTasks.length, sub: "Chưa được phân công",      href: "tasks.html",         show: pendingTasks.length > 0 },
        { icon: "bi-person-exclamation",      type: "info",    title: "Thành viên chưa có Ban",     count: unassigned.length,   sub: "Cần phân ban bộ phận",     href: "members.html",       show: unassigned.length > 0 },
        { icon: "bi-calendar-check",          type: "primary", title: "Sự kiện trong tuần này",     count: eventsSoon.length,   sub: "Cần xác nhận chuẩn bị",    href: "events.html",        show: eventsSoon.length > 0 },
        { icon: "bi-bell",                    type: "success", title: "Thông báo chưa xử lý",       count: unreadNotifs.length, sub: "Thông báo gần đây",        href: "notifications.html", show: unreadNotifs.length > 0 },
    ];

    const visibleAlerts = alerts.filter(a => a.show);
    const totalCount = visibleAlerts.reduce((s, a) => s + a.count, 0);

    const countEl = document.getElementById("total-alert-count");
    if (countEl) countEl.innerText = totalCount;

    const container = document.getElementById("admin-alerts-list");
    if (!container) return;

    if (visibleAlerts.length === 0) {
        container.innerHTML = `
            <div class="empty-state py-5">
                <i class="bi bi-check-circle-fill text-success" style="font-size:2rem;opacity:1;color:var(--success)!important;"></i>
                <p class="mt-2 fw-semibold" style="color:var(--success)">Không có việc cần xử lý</p>
                <p class="text-muted small">CLB đang vận hành tốt</p>
            </div>`;
        return;
    }

    // Always show all categories (even count=0) for context, but highlight those with issues
    container.innerHTML = alerts.map(a => `
        <a href="${a.href}" class="alert-row text-decoration-none" style="${!a.show ? 'opacity:0.4;pointer-events:none;' : ''}">
            <div class="alert-icon-wrap ${a.type}">
                <i class="bi ${a.icon}"></i>
            </div>
            <div class="alert-text-wrap">
                <div class="alert-title">${a.title}</div>
                <div class="alert-sub">${a.sub}</div>
            </div>
            <div class="alert-count">${a.count}</div>
            ${a.show ? `<span class="badge bg-${a.type === 'primary' ? 'primary' : a.type} ms-2" style="font-size:0.65rem;">Xem</span>` : `<span class="badge bg-secondary ms-2" style="font-size:0.65rem;">OK</span>`}
        </a>
    `).join("");
}

// ─── QUICK ACTIONS ───────────────────────────────────────────────
function renderQuickActions() {
    const user = ClubAuth.getCurrentUser();
    renderQuickActionsTarget("quick-actions-grid", user.role);
}

function renderQuickActionsTarget(containerId, role) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allActions = [
        { icon: "bi-list-check",       label: "Giao việc",       href: "task-edit.html",         roles: ["admin","vice","leader","assistant"] },
        { icon: "bi-person-plus-fill", label: "Thêm thành viên", href: "member-edit.html",        roles: ["admin","vice"] },
        { icon: "bi-calendar-plus",    label: "Tạo sự kiện",     href: "events.html",             roles: ["admin","vice","leader"] },
        { icon: "bi-bell-fill",        label: "Gửi thông báo",   href: "notifications.html",      roles: ["admin","vice"] },
        { icon: "bi-building-add",     label: "Thêm Ban",        href: "departments.html",        roles: ["admin","vice"] },
        { icon: "bi-bar-chart-line",   label: "Xem báo cáo",     href: "logs.html",               roles: ["admin","vice"] },
        { icon: "bi-wallet2",          label: "Quản lý quỹ",     href: "funds.html",              roles: ["admin","vice"] },
        { icon: "bi-folder2-open",     label: "Kho minh chứng",  href: "evidence.html",           roles: ["admin","vice","leader","assistant","member","guest"] },
        { icon: "bi-calendar3",        label: "Lịch công tác",   href: "calendar.html",           roles: ["admin","vice","leader","assistant","member","guest"] },
    ];

    const filtered = allActions.filter(a => a.roles.includes(role)).slice(0, 6);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-muted small">Không có thao tác</div>`;
        return;
    }

    container.innerHTML = filtered.map(a => `
        <a href="${a.href}" class="qa-btn">
            <i class="bi ${a.icon}"></i>
            <span>${a.label}</span>
        </a>
    `).join("");
}

// ─── NOTIFICATIONS MINI ──────────────────────────────────────────
function renderNotificationsMini() {
    renderNotificationsMiniTarget("notifications-mini");
}

function renderNotificationsMiniTarget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = ClubAuth.getCurrentUser();
    const currentMember = ClubAuth.getCurrentMember();
    const notifications = ClubStorage.getData("club_notifications") || [];

    const visible = notifications.filter(n => {
        if (user.role === "admin" || user.role === "vice") return true;
        if (!n.target || n.target === "All" || n.type === "General") return true;
        return currentMember && currentMember.department === n.target;
    }).slice(0, 3);

    if (visible.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-bell-slash"></i><p>Không có thông báo mới</p></div>`;
        return;
    }

    container.innerHTML = visible.map(n => `
        <a href="notifications.html" class="notif-mini-item text-decoration-none">
            <div class="notif-dot"></div>
            <div style="min-width:0;flex:1;">
                <div class="notif-mini-title">${n.title}</div>
                <div class="notif-mini-body">${n.text}</div>
                <div class="notif-mini-time"><i class="bi bi-clock me-1"></i>${n.date || ""}</div>
            </div>
        </a>
    `).join("");
}

// ─── STACKED BAR CHART ───────────────────────────────────────────
let tasksChartInstance = null;

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
        overdue    = depts.map(d => tasks.filter(t => t.department === d.name && t.status !== "Completed" && t.deadline && new Date(t.deadline) < today).length);
    } else {
        // Demo data khi chua co du lieu thuc
        labels     = ["Chuyên môn", "Truyền thông", "Đối ngoại", "Sự kiện", "Tài chính"];
        completed  = [4, 3, 2, 1, 1];
        inProgress = [3, 2, 1, 2, 0];
        pending    = [1, 1, 1, 1, 1];
        overdue    = [0, 1, 0, 1, 0];
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark"
                || document.body.getAttribute("data-theme") === "dark";
    const tickColor = isDark ? "#d1d5db" : "#475569";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    if (tasksChartInstance) tasksChartInstance.destroy();

    tasksChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Hoàn thành", data: completed,  backgroundColor: "#10b981", borderRadius: 3 },
                { label: "Đang làm",   data: inProgress, backgroundColor: "#2563eb", borderRadius: 3 },
                { label: "Chờ xử lý", data: pending,    backgroundColor: "#f59e0b", borderRadius: 3 },
                { label: "Quá hạn",   data: overdue,    backgroundColor: "#ef4444", borderRadius: 3 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} công việc`
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: tickColor, font: { size: 11 } }
                },
                y: {
                    stacked: true,
                    grid: { color: gridColor },
                    ticks: { stepSize: 1, color: tickColor, font: { size: 11 } },
                    beginAtZero: true
                }
            }
        }
    });
}

// ─── NEW MEMBERS ─────────────────────────────────────────────────
function renderNewMembers() {
    const container = document.getElementById("new-members-list");
    if (!container) return;

    const members = ClubStorage.getData("club_members") || [];

    const sorted = [...members]
        .filter(m => m.status === "Active" && m.joinDate)
        .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
        .slice(0, 5);

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-person-plus"></i>
                <p>Chưa có thành viên nào</p>
                <a href="member-edit.html" class="btn btn-sm btn-primary">+ Thêm thành viên</a>
            </div>`;
        return;
    }

    container.innerHTML = sorted.map(m => {
        const roleLabel = ClubAuth.ROLES[m.role] ? ClubAuth.ROLES[m.role].title : m.role;
        const join = m.joinDate ? new Date(m.joinDate).toLocaleDateString("vi-VN") : "";
        return `
            <a href="member-detail.html?id=${m.id}" class="member-row text-decoration-none">
                <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}"
                     class="member-row-avatar" alt="${m.name}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'">
                <div class="member-row-info">
                    <div class="member-row-name">${m.name}</div>
                    <div class="member-row-meta">${roleLabel} · ${m.department || "Chưa phân ban"}</div>
                </div>
                <div class="member-row-date">${join}</div>
            </a>`;
    }).join("");
}

// ─── UPCOMING EVENTS ─────────────────────────────────────────────
function renderUpcomingEvents() {
    const container = document.getElementById("upcoming-events-list");
    if (!container) return;

    const events = ClubStorage.getData("club_events") || [];
    const today  = new Date(); today.setHours(0,0,0,0);

    const upcoming = events
        .filter(e => e.date && new Date(e.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4);

    // Demo events if none exist
    const DEMO_EVENTS = [
        { id: "DEMO1", title: "Workshop Lập trình Web hiện đại", date: getFutureDate(3),  location: "Phòng máy 302", leaderId: "M001", attendeesCount: 45 },
        { id: "DEMO2", title: "Họp Ban chủ nhiệm định kỳ",       date: getFutureDate(7),  location: "Phòng họp B1", leaderId: "M002", attendeesCount: 12 },
        { id: "DEMO3", title: "Giải đấu Hackathon nội bộ",        date: getFutureDate(14), location: "Hội trường A",  leaderId: "M001", attendeesCount: 60 },
    ];

    const toRender = upcoming.length > 0 ? upcoming : DEMO_EVENTS;

    const members = ClubStorage.getData("club_members") || [];

    container.innerHTML = toRender.map(e => {
        const d     = new Date(e.date);
        const day   = d.getDate().toString().padStart(2, "0");
        const month = d.toLocaleString("vi-VN", { month: "short" });
        const leader = members.find(m => m.id === e.leaderId);
        const leaderName = leader ? leader.name : "Chưa phân công";

        const daysLeft = Math.ceil((d - new Date()) / 86400000);
        const badgeText  = daysLeft <= 3 ? "Sắp tới" : daysLeft <= 7 ? "Tuần này" : "Sắp diễn ra";
        const badgeColor = daysLeft <= 3 ? "danger" : daysLeft <= 7 ? "warning" : "primary";

        return `
            <div class="event-card-row">
                <div class="event-date-box">
                    <div class="event-date-day">${day}</div>
                    <div class="event-date-month">${month}</div>
                </div>
                <div class="event-info">
                    <div class="d-flex align-items-start justify-content-between gap-1">
                        <div class="event-title">${e.title}</div>
                        <span class="event-badge bg-${badgeColor}-subtle text-${badgeColor} border border-${badgeColor} border-opacity-25">${badgeText}</span>
                    </div>
                    <div class="event-meta">
                        <i class="bi bi-geo-alt me-1"></i>${e.location || "TBA"}
                        <span class="mx-2">·</span>
                        <i class="bi bi-person me-1"></i>${leaderName}
                        ${e.attendeesCount ? `<span class="mx-2">·</span><i class="bi bi-people me-1"></i>${e.attendeesCount} người` : ""}
                    </div>
                </div>
            </div>`;
    }).join("");

    if (toRender === DEMO_EVENTS) {
        container.innerHTML += `
            <div class="text-center py-3">
                <span class="badge bg-light text-muted border small">Dữ liệu mẫu — Tạo sự kiện thực tế tại <a href="events.html">Quản lý Sự kiện</a></span>
            </div>`;
    }
}

function getFutureDate(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
}

// ─── ACTIVITY FEED ───────────────────────────────────────────────
function renderActivityFeed() {
    const container = document.getElementById("activity-feed-list");
    if (!container) return;

    const logs = ClubStorage.getData("club_logs") || [];

    const DEMO_LOGS = [
        { time: "Hôm nay 09:10", user: "Nguyễn Văn An",        action: "Đăng nhập hệ thống",                   type: "info" },
        { time: "Hôm nay 08:45", user: "Trần Thị Bình",        action: "Cập nhật tiến độ công việc T001",      type: "success" },
        { time: "Hôm qua 16:30", user: "Lê Văn Cường",         action: "Tham gia Ban Truyền thông",             type: "success" },
        { time: "Hôm qua 14:00", user: "Phạm Thị Dung",        action: "Nộp minh chứng đóng quỹ HK1",          type: "primary" },
        { time: "2 ngày trước",  user: "Admin",                 action: "Tạo sự kiện Welcome Gen 10",           type: "primary" },
        { time: "2 ngày trước",  user: "Hoàng Văn Em",         action: "Tải lên tài liệu Kho minh chứng",      type: "info" },
    ];

    const toRender = logs.length > 0 ? logs.slice(0, 6) : DEMO_LOGS;

    container.innerHTML = toRender.map(log => {
        let typeClass = "primary";
        let dotIcon = "";
        const action = log.action || "";

        if (action.includes("Đăng nhập") || action.includes("Đăng xuất")) typeClass = "info";
        else if (action.includes("Xóa"))                                   typeClass = "danger";
        else if (action.includes("Tạo") || action.includes("Thêm"))        typeClass = "success";
        else if (action.includes("quá hạn") || action.includes("lỗi"))     typeClass = "warning";

        if (log.type) typeClass = log.type;

        return `
            <li class="activity-item ${typeClass}">
                <div class="activity-dot"></div>
                <div class="activity-time"><i class="bi bi-clock me-1"></i>${log.time}</div>
                <div class="activity-text"><strong>${log.user}</strong>: ${action}</div>
            </li>`;
    }).join("");

    if (logs.length === 0) {
        container.innerHTML += `
            <li style="padding-left:0; list-style:none;">
                <div class="text-center mt-2">
                    <span class="badge bg-light text-muted border small">Dữ liệu mẫu — Hoạt động thực tế sẽ xuất hiện khi sử dụng hệ thống</span>
                </div>
            </li>`;
    }
}
