document.addEventListener("DOMContentLoaded", () => {
    const user = ClubAuth.getCurrentUser();
    if (!user && !window.location.pathname.includes("login.html")) {
        window.location.href = "login.html";
        return;
    }
    
    renderSidebar();
    renderTopbar();
});

function renderSidebar() {
    const container = document.getElementById("sidebar-container");
    if (!container) return;

    const user = ClubAuth.getCurrentUser();
    const member = ClubAuth.getCurrentMember();
    const roleName = ClubAuth.ROLES[user.role]?.title || "Thành viên";
    const avatar = member?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";

    const path = window.location.pathname;

    const menuItems = [
        { name: "Dashboard", icon: "bi-speedometer2", href: "dashboard.html", roles: ["admin", "vice", "leader", "assistant", "member", "guest"] },
        { name: "Không gian của tôi", icon: "bi-laptop", href: "workspace.html", roles: ["admin", "vice", "leader", "assistant", "member", "guest"] },
        { name: "Giới thiệu CLB", icon: "bi-info-circle", href: "about.html", roles: ["admin", "vice", "leader", "assistant", "member", "guest"] },
        { name: "Quản lý Thành viên", icon: "bi-people", href: "members.html", roles: ["admin", "vice", "leader"] },
        { name: "Quản lý Ban", icon: "bi-building", href: "departments.html", roles: ["admin", "vice"] },
        { name: "Quản lý Công việc", icon: "bi-list-check", href: "tasks.html", roles: ["admin", "vice", "leader", "assistant", "member", "guest"] },
        { name: "Lịch công tác", icon: "bi-calendar3", href: "calendar.html", roles: ["admin", "vice", "leader", "assistant", "member", "guest"] },
        { name: "Quản lý Sự kiện", icon: "bi-calendar-event", href: "events.html", roles: ["admin", "vice", "leader", "assistant", "member", "guest"] },
        { name: "Kho minh chứng", icon: "bi-folder2-open", href: "evidence.html", roles: ["admin", "vice", "leader", "assistant", "member", "guest"] },
        { name: "Thông báo", icon: "bi-bell", href: "notifications.html", roles: ["admin", "vice", "leader", "assistant", "member", "guest"] },
        { name: "Tài khoản", icon: "bi-shield-lock", href: "accounts.html", roles: ["admin", "vice"] },
        { name: "Nhật ký hệ thống", icon: "bi-journal-text", href: "logs.html", roles: ["admin", "vice"] },
        { name: "Cài đặt", icon: "bi-gear", href: "settings.html", roles: ["admin", "vice"] }
    ];

    let menuHtml = "";
    menuItems.forEach(item => {
        if (item.roles.includes(user.role)) {
            const isActive = path.includes(item.href) ? "active" : "";
            menuHtml += `
                <li class="sidebar-item ${isActive}">
                    <a href="${item.href}" class="sidebar-link">
                        <i class="bi ${item.icon}"></i>
                        <span>${item.name}</span>
                    </a>
                </li>
            `;
        }
    });

    const settings = ClubStorage.getData("club_settings") || {};
    const sidebarHtml = `
        <div class="sidebar">
            <a href="dashboard.html" class="sidebar-brand">
                <i class="bi bi-code-square"></i>
                <span>${settings.clubName ? settings.clubName.split(" ")[0] : "DevClub"}</span>
            </a>
            <ul class="sidebar-menu">
                ${menuHtml}
            </ul>
            <div class="sidebar-user" style="cursor: pointer;" onclick="location.href='profile.html'">
                <img src="${avatar}" class="sidebar-user-avatar" alt="Avatar">
                <div class="sidebar-user-info">
                    <span class="sidebar-user-name">${member?.name || user.username}</span>
                    <span class="sidebar-user-role">${roleName}</span>
                </div>
            </div>
        </div>
        <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
    `;

    container.innerHTML = sidebarHtml;
}

function renderTopbar() {
    const container = document.getElementById("topbar-container");
    if (!container) return;

    const user = ClubAuth.getCurrentUser();
    const notifications = ClubStorage.getData("club_notifications") || [];
    const count = notifications.length;

    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const themeIcon = currentTheme === 'dark' ? 'bi-sun' : 'bi-moon-stars';

    container.innerHTML = `
        <div class="topbar">
            <div class="d-flex align-items-center gap-3">
                <button class="btn btn-secondary btn-icon d-lg-none" onclick="toggleSidebar()">
                    <i class="bi bi-list"></i>
                </button>
                <button class="btn btn-secondary btn-icon d-none d-lg-flex" onclick="toggleCollapseSidebar()">
                    <i class="bi bi-indent"></i>
                </button>
                <nav aria-label="breadcrumb" class="d-none d-md-block">
                    <ol class="breadcrumb mb-0" id="breadcrumb-list">
                        <!-- Dynamic Breadcrumb -->
                    </ol>
                </nav>
            </div>
            <div class="d-flex align-items-center gap-3">
                <button class="btn btn-secondary btn-icon" onclick="handleThemeToggle()" title="Đổi giao diện">
                    <i class="bi ${themeIcon}" id="theme-btn-icon"></i>
                </button>
                <div class="dropdown">
                    <button class="btn btn-secondary btn-icon position-relative" data-bs-toggle="dropdown">
                        <i class="bi bi-bell"></i>
                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.6rem;">
                            ${count}
                        </span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" style="width: 300px;">
                        <li><h6 class="dropdown-header">Thông báo mới nhất</h6></li>
                        ${notifications.slice(0, 3).map(n => `
                            <li>
                                <a class="dropdown-item py-2" href="notifications.html">
                                    <div class="fw-bold text-truncate">${n.title}</div>
                                    <small class="text-muted">${n.date}</small>
                                </a>
                            </li>
                        `).join("")}
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-center text-primary fw-bold" href="notifications.html">Xem tất cả</a></li>
                    </ul>
                </div>
                <div class="dropdown">
                    <button class="btn btn-secondary d-flex align-items-center gap-2" data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i>
                        <span class="d-none d-sm-inline">${user?.username}</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person me-2"></i>Hồ sơ</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="ClubAuth.logout()"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</a></li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    buildBreadcrumbs();
}

function toggleSidebar() {
    const wrapper = document.querySelector(".app-wrapper");
    wrapper.classList.toggle("sidebar-open");
}

function toggleCollapseSidebar() {
    const wrapper = document.querySelector(".app-wrapper");
    wrapper.classList.toggle("sidebar-collapsed");
}

function handleThemeToggle() {
    const next = ClubUtils.toggleTheme();
    const btn = document.getElementById("theme-btn-icon");
    if (btn) {
        btn.className = next === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
    }
}

function buildBreadcrumbs() {
    const list = document.getElementById("breadcrumb-list");
    if (!list) return;

    const path = window.location.pathname;
    let html = `<li class="breadcrumb-item"><a href="dashboard.html" class="text-decoration-none">CLB</a></li>`;
    
    if (path.includes("dashboard.html")) {
        html += `<li class="breadcrumb-item active">Dashboard</li>`;
    } else if (path.includes("members.html")) {
        html += `<li class="breadcrumb-item active">Quản lý Thành viên</li>`;
    } else if (path.includes("member-detail.html")) {
        html += `<li class="breadcrumb-item"><a href="members.html" class="text-decoration-none">Thành viên</a></li><li class="breadcrumb-item active">Chi tiết</li>`;
    } else if (path.includes("member-edit.html")) {
        html += `<li class="breadcrumb-item"><a href="members.html" class="text-decoration-none">Thành viên</a></li><li class="breadcrumb-item active">Chỉnh sửa</li>`;
    } else if (path.includes("tasks.html")) {
        html += `<li class="breadcrumb-item active">Quản lý Công việc</li>`;
    } else if (path.includes("task-detail.html")) {
        html += `<li class="breadcrumb-item"><a href="tasks.html" class="text-decoration-none">Công việc</a></li><li class="breadcrumb-item active">Chi tiết</li>`;
    } else if (path.includes("task-edit.html")) {
        html += `<li class="breadcrumb-item"><a href="tasks.html" class="text-decoration-none">Công việc</a></li><li class="breadcrumb-item active">Chỉnh sửa</li>`;
    } else if (path.includes("departments.html")) {
        html += `<li class="breadcrumb-item active">Quản lý Ban</li>`;
    } else if (path.includes("events.html")) {
        html += `<li class="breadcrumb-item active">Quản lý Sự kiện</li>`;
    } else if (path.includes("notifications.html")) {
        html += `<li class="breadcrumb-item active">Thông báo</li>`;
    } else if (path.includes("accounts.html")) {
        html += `<li class="breadcrumb-item active">Tài khoản</li>`;
    } else if (path.includes("profile.html")) {
        html += `<li class="breadcrumb-item active">Hồ sơ cá nhân</li>`;
    } else if (path.includes("workspace.html")) {
        html += `<li class="breadcrumb-item active">Không gian cá nhân</li>`;
    } else if (path.includes("calendar.html")) {
        html += `<li class="breadcrumb-item active">Lịch công tác</li>`;
    } else if (path.includes("evidence.html")) {
        html += `<li class="breadcrumb-item active">Kho minh chứng</li>`;
    } else if (path.includes("logs.html")) {
        html += `<li class="breadcrumb-item active">Nhật ký hệ thống</li>`;
    } else if (path.includes("settings.html")) {
        html += `<li class="breadcrumb-item active">Cài đặt hệ thống</li>`;
    } else if (path.includes("about.html")) {
        html += `<li class="breadcrumb-item active">Giới thiệu CLB</li>`;
    }
    
    list.innerHTML = html;
}
