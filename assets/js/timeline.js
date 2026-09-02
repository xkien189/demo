/**
 * Semester Timeline & AI Roadmap Generator Module
 * Supports Semester Filtering, Interactive Vertical Timeline Flow, CRUD, 1-Click Conversion to Task/Event, and AI Semester Roadmap Planner
 */

let currentTimelines = [];
let aiGeneratedNodes = [];

document.addEventListener("DOMContentLoaded", () => {
    if (!ClubAuth.checkRouteGuard()) return;

    initTimelinePage();
});

function initTimelinePage() {
    const user = ClubAuth.getCurrentUser();
    const canManage = ["admin", "vice", "leader", "assistant"].includes(user?.role);

    // Setup action buttons based on permissions
    const actionBtnsArea = document.getElementById("timeline-action-btns");
    if (actionBtnsArea && canManage) {
        actionBtnsArea.innerHTML = `
            <button class="btn btn-outline-primary btn-sm me-2" onclick="openAIGeneratorModal()">
                <i class="bi bi-stars me-1"></i> ✨ AI Gợi ý Kế hoạch
            </button>
            <button class="btn btn-primary btn-sm" onclick="openTimelineModal()">
                <i class="bi bi-plus-circle me-1"></i> Thêm mốc mới
            </button>
        `;
    }

    // Populate Department select dropdown in modal
    populateDeptOptions("tl-department");

    // Event listeners for filters
    document.getElementById("filter-semester")?.addEventListener("change", renderTimeline);
    document.getElementById("filter-status")?.addEventListener("change", renderTimeline);
    document.getElementById("search-timeline")?.addEventListener("input", renderTimeline);

    loadTimelinesData();

    // Register Firestore real-time sync refresh
    if (typeof ClubStorage.registerUIRefresh === "function") {
        ClubStorage.registerUIRefresh("club_timelines", () => loadTimelinesData());
    }
}

function populateDeptOptions(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const depts = ClubStorage.getData("club_departments") || [];
    let html = `<option value="Ban Chủ nhiệm">Ban Chủ nhiệm</option>`;
    depts.forEach(d => {
        html += `<option value="${d.name}">${d.name}</option>`;
    });
    select.innerHTML = html;
}

function loadTimelinesData() {
    currentTimelines = ClubStorage.getData("club_timelines") || [];
    renderTimeline();
}

function renderTimeline() {
    const semesterVal = document.getElementById("filter-semester")?.value || "HK1_2026_2027";
    const statusVal = document.getElementById("filter-status")?.value || "";
    const searchVal = (document.getElementById("search-timeline")?.value || "").toLowerCase().trim();

    const user = ClubAuth.getCurrentUser();
    const canManage = ["admin", "vice", "leader", "assistant"].includes(user?.role);

    // Filter timelines
    const filtered = currentTimelines.filter(t => {
        const matchSem = !semesterVal || t.semester === semesterVal;
        const matchStat = !statusVal || t.status === statusVal;
        const matchSearch = !searchVal || (t.title && t.title.toLowerCase().includes(searchVal)) || (t.description && t.description.toLowerCase().includes(searchVal));
        return matchSem && matchStat && matchSearch;
    });

    // Sort by startDate
    filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Calculate Statistics
    const totalCount = filtered.length;
    const completedCount = filtered.filter(t => t.status === "Completed").length;
    const inProgressCount = filtered.filter(t => t.status === "In Progress").length;
    const upcomingCount = filtered.filter(t => t.status === "Upcoming").length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Update stats UI
    if (document.getElementById("stat-total")) document.getElementById("stat-total").innerText = totalCount;
    if (document.getElementById("stat-completed")) document.getElementById("stat-completed").innerText = completedCount;
    if (document.getElementById("stat-inprogress")) document.getElementById("stat-inprogress").innerText = inProgressCount;
    if (document.getElementById("stat-percent")) {
        document.getElementById("stat-percent").innerText = `${progressPercent}%`;
        const progressBar = document.getElementById("stat-progress-bar");
        if (progressBar) progressBar.style.width = `${progressPercent}%`;
    }

    const container = document.getElementById("timeline-flow-container");
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-hourglass-bottom fs-1"></i>
                <h6 class="mt-3 fw-bold">Chưa có mốc thời gian nào cho học kỳ này</h6>
                <p class="small">Hãy nhấn <b>+ Thêm mốc mới</b> hoặc dùng <b>✨ AI Gợi ý Kế hoạch</b> để tự động tạo lộ trình!</p>
                ${canManage ? `<button class="btn btn-primary btn-sm mt-2" onclick="openAIGeneratorModal()"><i class="bi bi-stars me-1"></i>AI Tạo lộ trình ngay</button>` : ''}
            </div>
        `;
        return;
    }

    const phaseBadges = {
        "Đầu kỳ": "bg-info text-dark",
        "Giữa kỳ": "bg-primary",
        "Cuối kỳ": "bg-warning text-dark"
    };

    const statusBadges = {
        "Completed": '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Hoàn thành</span>',
        "In Progress": '<span class="badge bg-primary"><i class="bi bi-play-circle me-1"></i>Đang thực hiện</span>',
        "Upcoming": '<span class="badge bg-secondary"><i class="bi bi-clock me-1"></i>Sắp diễn ra</span>',
        "Cancelled": '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Tạm hoãn</span>'
    };

    let html = `<div class="vertical-timeline">`;

    filtered.forEach((item, index) => {
        const phaseClass = phaseBadges[item.phase] || "bg-secondary";
        const statusHtml = statusBadges[item.status] || '<span class="badge bg-secondary">Chưa xác định</span>';
        const isCompleted = item.status === "Completed";
        const isInProgress = item.status === "In Progress";

        let nodeColor = "var(--border-color)";
        if (isCompleted) nodeColor = "var(--bs-success)";
        else if (isInProgress) nodeColor = "var(--bs-primary)";

        html += `
            <div class="timeline-node-item fade-in" style="animation-delay: ${index * 0.05}s">
                <div class="timeline-marker" style="border-color: ${nodeColor}; background: ${isCompleted ? 'var(--bs-success)' : (isInProgress ? 'var(--bs-primary)' : 'var(--bg-secondary)')}">
                    ${isCompleted ? '<i class="bi bi-check text-white" style="font-size: 0.85rem;"></i>' : (isInProgress ? '<span class="spinner-grow spinner-grow-sm text-white" style="width: 8px; height: 8px;"></span>' : '')}
                </div>
                <div class="timeline-content-card card shadow-sm mb-4">
                    <div class="card-body p-3">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <div class="d-flex align-items-center gap-2 flex-wrap">
                                <span class="badge ${phaseClass}">${item.phase || 'Khác'}</span>
                                <span class="badge bg-light text-dark border"><i class="bi bi-building me-1"></i>${item.department || 'Chung'}</span>
                                ${statusHtml}
                            </div>
                            <div class="small text-muted fw-semibold">
                                <i class="bi bi-calendar-event me-1"></i>${ClubUtils.formatDateOnly(item.startDate)} ${item.endDate ? '➔ ' + ClubUtils.formatDateOnly(item.endDate) : ''}
                            </div>
                        </div>

                        <h5 class="fw-bold mb-2 text-primary">${item.title}</h5>
                        <p class="text-secondary small mb-3">${item.description || 'Chưa có mô tả chi tiết.'}</p>

                        <div class="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2">
                            <div class="d-flex gap-1">
                                <button class="btn btn-outline-info btn-xs py-1 px-2 text-nowrap" style="font-size: 0.75rem;" onclick="convertTimelineToTask('${item.id}')">
                                    <i class="bi bi-plus-square me-1"></i>Tạo Task
                                </button>
                                <button class="btn btn-outline-success btn-xs py-1 px-2 text-nowrap" style="font-size: 0.75rem;" onclick="convertTimelineToEvent('${item.id}')">
                                    <i class="bi bi-calendar-plus me-1"></i>Tạo Sự kiện
                                </button>
                            </div>
                            ${canManage ? `
                                <div class="d-flex gap-1">
                                    <button class="btn btn-light-warning btn-xs py-1 px-2 text-warning" onclick="openTimelineModal('${item.id}')" title="Chỉnh sửa">
                                        <i class="bi bi-pencil-square"></i>
                                    </button>
                                    <button class="btn btn-light-danger btn-xs py-1 px-2 text-danger" onclick="deleteTimelineItem('${item.id}')" title="Xóa">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// Modal Form Open
function openTimelineModal(id = null) {
    const modalEl = document.getElementById("timelineModal");
    if (!modalEl) return;

    const titleEl = document.getElementById("timelineModalTitle");
    const form = document.getElementById("timelineForm");
    form.reset();

    if (id) {
        const item = currentTimelines.find(t => t.id === id);
        if (item) {
            titleEl.innerText = "Chỉnh sửa mốc Timeline";
            document.getElementById("tl-id").value = item.id;
            document.getElementById("tl-title").value = item.title;
            document.getElementById("tl-semester").value = item.semester;
            document.getElementById("tl-phase").value = item.phase;
            document.getElementById("tl-department").value = item.department;
            document.getElementById("tl-startDate").value = item.startDate;
            document.getElementById("tl-endDate").value = item.endDate || "";
            document.getElementById("tl-status").value = item.status;
            document.getElementById("tl-description").value = item.description || "";
        }
    } else {
        titleEl.innerText = "Thêm mốc Timeline mới";
        document.getElementById("tl-id").value = "";
        const curSemester = document.getElementById("filter-semester")?.value || "HK1_2026_2027";
        document.getElementById("tl-semester").value = curSemester;
    }

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
}

// Save Timeline Item (Create / Update)
function saveTimelineItem(e) {
    if (e) e.preventDefault();

    const id = document.getElementById("tl-id").value;
    const title = document.getElementById("tl-title").value.trim();
    const semester = document.getElementById("tl-semester").value;
    const phase = document.getElementById("tl-phase").value;
    const department = document.getElementById("tl-department").value;
    const startDate = document.getElementById("tl-startDate").value;
    const endDate = document.getElementById("tl-endDate").value;
    const status = document.getElementById("tl-status").value;
    const description = document.getElementById("tl-description").value.trim();

    if (!title || !startDate) {
        Swal.fire("Lỗi validation", "Vui lòng điền tiêu đề và ngày bắt đầu!", "warning");
        return;
    }

    if (id) {
        // Edit
        const index = currentTimelines.findIndex(t => t.id === id);
        if (index !== -1) {
            currentTimelines[index] = {
                ...currentTimelines[index],
                title, semester, phase, department, startDate, endDate, status, description
            };
        }
    } else {
        // Create
        const newItem = {
            id: "TL" + Date.now(),
            semester,
            title,
            phase,
            department,
            startDate,
            endDate,
            status,
            description
        };
        currentTimelines.push(newItem);
    }

    ClubStorage.saveData("club_timelines", currentTimelines);
    
    // Log system activity
    const user = ClubAuth.getCurrentUser();
    ClubUtils.addLog("Timeline", id ? `Cập nhật mốc timeline: ${title}` : `Tạo mốc timeline mới: ${title}`, user?.username || "Admin");

    // Close modal
    const modalEl = document.getElementById("timelineModal");
    const bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();

    Swal.fire({
        icon: "success",
        title: "Đã lưu mốc Timeline!",
        timer: 1500,
        showConfirmButton: false
    });

    renderTimeline();
}

// Delete Timeline Item
function deleteTimelineItem(id) {
    const item = currentTimelines.find(t => t.id === id);
    if (!item) return;

    Swal.fire({
        title: `Xóa mốc "${item.title}"?`,
        text: "Hành động này không thể hoàn tác!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Đồng ý xóa",
        cancelButtonText: "Hủy"
    }).then((result) => {
        if (result.isConfirmed) {
            currentTimelines = currentTimelines.filter(t => t.id !== id);
            ClubStorage.saveData("club_timelines", currentTimelines);

            Swal.fire({
                icon: "success",
                title: "Đã xóa!",
                timer: 1500,
                showConfirmButton: false
            });

            renderTimeline();
        }
    });
}

// AI Semester Plan Generator Modal
function openAIGeneratorModal() {
    const modalEl = document.getElementById("aiGeneratorModal");
    if (!modalEl) return;

    document.getElementById("ai-prompt-preview").style.display = "none";
    document.getElementById("ai-apply-btn").style.display = "none";

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
}

// Handle AI Generation Trigger
async function handleAIGenerate() {
    const goal = document.getElementById("ai-goal-select").value;
    const semesterName = document.getElementById("filter-semester")?.value || "HK1_2026_2027";
    const btn = document.getElementById("ai-generate-submit-btn");
    const loadingArea = document.getElementById("ai-loading-spinner");
    const previewArea = document.getElementById("ai-prompt-preview");
    const previewContent = document.getElementById("ai-preview-list");

    btn.disabled = true;
    loadingArea.style.display = "block";
    previewArea.style.display = "none";

    try {
        aiGeneratedNodes = await AIService.generateSemesterTimeline(goal, semesterName);
        loadingArea.style.display = "none";
        btn.disabled = false;

        if (aiGeneratedNodes && aiGeneratedNodes.length > 0) {
            previewArea.style.display = "block";
            document.getElementById("ai-apply-btn").style.display = "inline-block";

            let previewHtml = `<ul class="list-group list-group-flush">`;
            aiGeneratedNodes.forEach((node, i) => {
                previewHtml += `
                    <li class="list-group-item bg-transparent px-0 py-2 border-bottom">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="fw-bold text-primary">${i + 1}. ${node.title}</span>
                            <span class="badge bg-info text-dark">${node.phase}</span>
                        </div>
                        <div class="small text-muted mb-1"><i class="bi bi-building me-1"></i>${node.department} | <i class="bi bi-calendar3 me-1"></i>${node.startDate} đến ${node.endDate}</div>
                        <div class="small text-secondary">${node.description}</div>
                    </li>
                `;
            });
            previewHtml += `</ul>`;
            previewContent.innerHTML = previewHtml;
        } else {
            Swal.fire("Thông báo", "AI không tạo được dàn ý phù hợp. Vui lòng thử lại!", "info");
        }
    } catch (err) {
        loadingArea.style.display = "none";
        btn.disabled = false;
        Swal.fire("Lỗi AI", "Không thể sinh kịch bản học kỳ. Vui lòng thử lại sau!", "error");
    }
}

// Apply AI Generated Timeline Roadmap
function applyAISuggestedTimeline() {
    if (!aiGeneratedNodes || aiGeneratedNodes.length === 0) return;

    // Merge AI generated nodes into current timelines
    currentTimelines = [...currentTimelines, ...aiGeneratedNodes];
    ClubStorage.saveData("club_timelines", currentTimelines);

    const user = ClubAuth.getCurrentUser();
    ClubUtils.addLog("Timeline", `Áp dụng kịch bản AI đề xuất (${aiGeneratedNodes.length} mốc)`, user?.username || "Admin");

    const modalEl = document.getElementById("aiGeneratorModal");
    const bsModal = bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();

    Swal.fire({
        icon: "success",
        title: "Đã nạp Kế hoạch AI thành công!",
        text: `Đã thêm ${aiGeneratedNodes.length} mốc hoạt động mới vào lộ trình học kỳ.`,
        timer: 2000,
        showConfirmButton: false
    });

    renderTimeline();
}

// Quick 1-Click Conversion: Timeline Node -> Task
function convertTimelineToTask(timelineId) {
    const node = currentTimelines.find(t => t.id === timelineId);
    if (!node) return;

    const tasks = ClubStorage.getData("club_tasks") || [];
    const user = ClubAuth.getCurrentUser();

    const newTask = {
        id: "T" + Date.now(),
        title: `[Task Timeline] ${node.title}`,
        department: node.department || "Ban Chuyên môn",
        assigneeId: user ? user.username : "M001",
        deadline: node.endDate || node.startDate || "2026-10-30",
        priority: "High",
        progress: 0,
        status: "Pending",
        description: node.description || ""
    };

    tasks.push(newTask);
    ClubStorage.saveData("club_tasks", tasks);
    ClubUtils.addLog("Task", `Tạo Task từ Timeline: ${node.title}`, user?.username || "Admin");

    Swal.fire({
        icon: "success",
        title: "Đã chuyển đổi thành Công việc (Task)!",
        text: `Nhiệm vụ "${newTask.title}" đã được thêm vào danh sách Quản lý Công việc.`,
        confirmButtonText: "Đến trang Công việc",
        showCancelButton: true,
        cancelButtonText: "Ở lại Timeline"
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "tasks.html";
        }
    });
}

// Quick 1-Click Conversion: Timeline Node -> Event
function convertTimelineToEvent(timelineId) {
    const node = currentTimelines.find(t => t.id === timelineId);
    if (!node) return;

    const events = ClubStorage.getData("club_events") || [];
    const user = ClubAuth.getCurrentUser();

    const newEvent = {
        id: "E" + Date.now(),
        title: node.title,
        date: node.startDate || "2026-10-15",
        location: "Hội trường A - UHL Campus",
        description: node.description || "",
        attendeesCount: 0,
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600"
    };

    events.push(newEvent);
    ClubStorage.saveData("club_events", events);
    ClubUtils.addLog("Event", `Tạo Sự kiện từ Timeline: ${node.title}`, user?.username || "Admin");

    Swal.fire({
        icon: "success",
        title: "Đã chuyển đổi thành Sự kiện (Event)!",
        text: `Sự kiện "${newEvent.title}" đã được tạo thành công trong danh sách Quản lý Sự kiện.`,
        confirmButtonText: "Đến trang Sự kiện",
        showCancelButton: true,
        cancelButtonText: "Ở lại Timeline"
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "events.html";
        }
    });
}
