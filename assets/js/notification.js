document.addEventListener("DOMContentLoaded", () => {
    if (!ClubAuth.checkRouteGuard()) return;

    const user = ClubAuth.getCurrentUser();

    // Fill buttons
    const btnArea = document.getElementById("create-noti-area");
    if (btnArea) {
        let html = `<button class="btn btn-outline-primary me-2" onclick="openAIContentModal()"><i class="bi bi-magic me-1"></i>✨ AI Viết Nội Dung</button>`;
        if (["admin", "leader"].includes(user.role)) {
            html += `<button class="btn btn-primary" onclick="openCreateNotiModal()"><i class="bi bi-bell-plus"></i> Đăng thông báo</button>`;
        }
        btnArea.innerHTML = html;
    }

    // Bind dropdown toggle wrapper visibility
    const typeSelect = document.getElementById("n-type");
    if (typeSelect) {
        typeSelect.addEventListener("change", (e) => {
            const wrapper = document.getElementById("target-dept-wrapper");
            if (e.target.value === "Department") {
                wrapper.style.display = "block";
                populateDeptOptions();
            } else {
                wrapper.style.display = "none";
            }
        });
    }

    renderNotificationsList("All");
    document.getElementById("noti-form").addEventListener("submit", handleNotiFormSubmit);
});

function populateDeptOptions() {
    const dropdown = document.getElementById("n-target");
    if (!dropdown) return;
    const depts = ClubStorage.getData("club_departments") || [];
    dropdown.innerHTML = depts.map(d => `<option value="${d.name}">${d.name}</option>`).join("");
}

let activeFilter = "All";

window.filterNotifications = function(filterType, element) {
    activeFilter = filterType;
    
    // Toggle active link highlights
    const items = document.querySelectorAll(".list-group-item-action");
    items.forEach(i => i.classList.remove("active"));
    element.classList.add("active");

    renderNotificationsList(filterType);
};

function renderNotificationsList(filterType) {
    const container = document.getElementById("notifications-list-container");
    if (!container) return;

    const notis = ClubStorage.getData("club_notifications") || [];
    const user = ClubAuth.getCurrentUser();
    const currentMember = ClubAuth.getCurrentMember();

    // Permission filter: Admin sees all; others see General notices or notices targeted to their department
    let visibleNotis = notis.filter(n => {
        if (user.role === "admin") return true;
        if (!n.target || n.target === "All" || n.type === "General") return true;
        return currentMember && currentMember.department === n.target;
    });

    let filtered = visibleNotis;
    if (filterType !== "All") {
        filtered = visibleNotis.filter(n => n.type === filterType);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-5">Không có thông báo nào thuộc danh mục này</div>`;
        return;
    }

    container.innerHTML = filtered.map(n => {
        let categoryBadge = "bg-primary";
        if (n.type === "General") categoryBadge = "bg-success";
        if (n.type === "Department") categoryBadge = "bg-info";

        let deleteBtn = "";
        if (user.role === "admin") {
            deleteBtn = `
                <button onclick="deleteNotification('${n.id}')" class="btn btn-sm btn-icon btn-danger" title="Xóa thông báo">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        }

        return `
            <div class="p-3 mb-3 border-bottom d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="badge ${categoryBadge}">${n.type}</span>
                        ${n.type === 'Department' ? `<span class="badge bg-secondary">${n.target}</span>` : ''}
                        <small class="text-muted"><i class="bi bi-clock me-1"></i>${n.date}</small>
                        <small class="text-muted"><i class="bi bi-person me-1"></i>Người gửi: ${n.sender}</small>
                    </div>
                    <h5 class="fw-bold text-dark mb-2">${n.title}</h5>
                    <p class="text-secondary small mb-0" style="white-space: pre-line;">${n.text}</p>
                </div>
                ${deleteBtn}
            </div>
        `;
    }).join("");
}

window.openCreateNotiModal = function() {
    document.getElementById("n-title").value = "";
    document.getElementById("n-type").value = "General";
    document.getElementById("n-text").value = "";
    document.getElementById("target-dept-wrapper").style.display = "none";

    const modal = new bootstrap.Modal(document.getElementById("createNotiModal"));
    modal.show();
};

function handleNotiFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById("n-title").value.trim();
    const type = document.getElementById("n-type").value;
    const text = document.getElementById("n-text").value.trim();
    
    let target = "All";
    if (type === "Department") {
        target = document.getElementById("n-target").value;
    }

    let notis = ClubStorage.getData("club_notifications") || [];
    const currentUser = ClubAuth.getCurrentUser();
    const member = ClubAuth.getCurrentMember();
    const senderName = member ? member.name : currentUser.username;

    const newId = "N0" + (notis.length + 1).toString().padStart(2, '0');
    const newNoti = {
        id: newId,
        title,
        text,
        type,
        target,
        sender: senderName,
        date: ClubUtils.nowString()
    };

    notis.unshift(newNoti);
    ClubStorage.saveData("club_notifications", notis);
    ClubUtils.addLog(`Đăng thông báo mới: ${title}`);
    ClubUtils.showToast("Thành công!", "Thông báo mới đã được đăng thành công.", "success");

    const modalEl = document.getElementById("createNotiModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance.hide();

    renderNotificationsList(activeFilter);
}

window.deleteNotification = function(notiId) {
    ClubUtils.showConfirm(
        "Xác nhận xóa thông báo?",
        "Thông báo này sẽ biến mất vĩnh viễn khỏi bảng tin!",
        "Xóa",
        "Hủy"
    ).then((result) => {
        if (result.isConfirmed) {
            let notis = ClubStorage.getData("club_notifications") || [];
            const index = notis.findIndex(n => n.id === notiId);
            if (index !== -1) {
                const title = notis[index].title;
                notis.splice(index, 1);
                ClubStorage.saveData("club_notifications", notis);
                ClubUtils.addLog(`Xóa thông báo: ${title}`);
                ClubUtils.showToast("Đã xóa!", "Thông báo đã bị xóa khỏi hệ thống.", "success");
                renderNotificationsList(activeFilter);
            }
        }
    });
};

window.openAIContentModal = function() {
    document.getElementById("ai-content-topic").value = "";
    document.getElementById("ai-content-result").value = "";
    new bootstrap.Modal(document.getElementById("aiContentModal")).show();
};

window.generateAIContent = async function() {
    const type = document.getElementById("ai-content-type").value;
    const topic = document.getElementById("ai-content-topic").value.trim();
    const resultArea = document.getElementById("ai-content-result");

    if (!topic) {
        ClubUtils.showAlert("Lỗi", "Vui lòng nhập chủ đề bài viết cần tạo.", "error");
        return;
    }

    resultArea.value = "⏳ AI đang suy nghĩ và sáng tạo nội dung...";
    try {
        const text = await AIService.generateContent(type, topic);
        resultArea.value = text;
    } catch (err) {
        resultArea.value = "⚠️ Có lỗi xảy ra trong quá trình tạo bài viết.";
    }
};

window.copyAIContent = function() {
    const text = document.getElementById("ai-content-result").value;
    if (!text) return;
    navigator.clipboard.writeText(text);
    ClubUtils.showToast("Đã sao chép!", "Nội dung bài viết đã lưu vào Clipboard.", "success");
};

window.useAIContentInNoti = function() {
    const text = document.getElementById("ai-content-result").value;
    const topic = document.getElementById("ai-content-topic").value;
    if (!text) return;

    bootstrap.Modal.getInstance(document.getElementById("aiContentModal")).hide();

    // Open create notification modal and pre-fill
    openCreateNotiModal();
    document.getElementById("n-title").value = topic ? topic.substring(0, 50) : "Thông báo mới";
    document.getElementById("n-text").value = text;
};
