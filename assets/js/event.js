document.addEventListener("DOMContentLoaded", () => {
    if (!ClubAuth.checkRouteGuard()) return;

    const user = ClubAuth.getCurrentUser();

    // Populate Add-Event button based on permissions
    const btnArea = document.getElementById("add-event-btn-area");
    if (btnArea && ["admin", "vice", "leader"].includes(user.role)) {
        btnArea.innerHTML = `
            <button class="btn btn-primary" onclick="openCreateModal()">
                <i class="bi bi-calendar-plus"></i> Thêm sự kiện
            </button>
        `;
    }

    renderEventsGrid();
    populateLeadersDropdown();

    // Register Firestore real-time sync refresh
    if (typeof ClubStorage.registerUIRefresh === "function") {
        ClubStorage.registerUIRefresh("club_events", () => renderEventsGrid());
    }

    document.getElementById("event-edit-form").addEventListener("submit", handleEventFormSubmit);

    // Event image file upload handler
    const fileInput = document.getElementById("e-image-file");
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const dataUrl = evt.target.result;
                    const preview = document.getElementById("e-image-preview");
                    const hidden = document.getElementById("e-image");
                    if (preview) {
                        preview.src = dataUrl;
                        preview.style.display = "block";
                    }
                    if (hidden) hidden.value = dataUrl;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function renderEventsGrid() {
    const grid = document.getElementById("events-grid");
    if (!grid) return;

    const events = ClubStorage.getData("club_events") || [];
    const members = ClubStorage.getData("club_members") || [];
    const user = ClubAuth.getCurrentUser();

    if (events.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-5">Không có sự kiện nào được lên lịch</div>`;
        return;
    }

    grid.innerHTML = events.map(e => {
        const leader = members.find(m => m.id === e.leaderId);
        
        let editButtons = "";
        if (["admin", "vice", "leader"].includes(user.role)) {
            editButtons = `
                <div class="border-top pt-2 mt-2 d-flex justify-content-end gap-2">
                    <button class="btn btn-sm btn-primary py-1 px-2" onclick="openEditModal('${e.id}')" title="Sửa"><i class="bi bi-pencil"></i> Sửa</button>
                    <button class="btn btn-sm btn-danger py-1 px-2" onclick="deleteEvent('${e.id}')" title="Xóa"><i class="bi bi-trash"></i> Xóa</button>
                </div>
            `;
        }

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-none border">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-light-primary"><i class="bi bi-calendar-event me-1"></i>Sự kiện</span>
                            <span class="small text-danger fw-bold">${ClubUtils.formatDate(e.date)}</span>
                        </div>
                        <h5 class="fw-bold text-dark text-truncate">${e.title}</h5>
                        <p class="text-secondary small text-truncate" style="max-height: 40px;">${e.description}</p>
                        
                        <div class="small text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${e.location}</div>
                        <div class="small text-muted"><i class="bi bi-person me-1"></i>Phụ trách: ${leader ? leader.name : "N/A"}</div>
                        
                        ${editButtons}
                    </div>
                    <div class="card-footer bg-transparent border-0 pt-0 pb-3">
                        <button class="btn btn-secondary btn-sm w-100" onclick="showEventDetails('${e.id}')">
                            <i class="bi bi-info-circle"></i> Xem chi tiết sự kiện
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function populateLeadersDropdown() {
    const dropdown = document.getElementById("e-leader");
    if (!dropdown) return;

    const members = ClubStorage.getData("club_members") || [];
    let html = '<option value="">-- Chọn người phụ trách --</option>';
    members.forEach(m => {
        html += `<option value="${m.id}">${m.name} (${m.id})</option>`;
    });
    dropdown.innerHTML = html;
}

window.showEventDetails = function(eventId) {
    const events = ClubStorage.getData("club_events") || [];
    const e = events.find(item => item.id === eventId);
    if (!e) return;

    const members = ClubStorage.getData("club_members") || [];
    const leader = members.find(m => m.id === e.leaderId);

    document.getElementById("e-detail-title").innerText = e.title;
    document.getElementById("e-detail-date").innerText = ClubUtils.formatDate(e.date);
    document.getElementById("e-detail-location").innerText = e.location;
    document.getElementById("e-detail-desc").innerText = e.description;
    document.getElementById("e-detail-leader").innerText = leader ? `${leader.name} (${leader.id})` : "N/A";
    document.getElementById("e-detail-attendees").innerText = e.attendeesCount || 0;

    const modal = new bootstrap.Modal(document.getElementById("eventDetailModal"));
    modal.show();
};

window.openCreateModal = function() {
    document.getElementById("event-modal-title").innerText = "Thêm sự kiện mới";
    document.getElementById("edit-e-id").value = "";
    document.getElementById("e-title").value = "";
    document.getElementById("e-date").value = "";
    document.getElementById("e-location").value = "";
    document.getElementById("e-leader").value = "";
    document.getElementById("e-desc").value = "";
    document.getElementById("e-image").value = "";
    const preview = document.getElementById("e-image-preview");
    if (preview) preview.style.display = "none";

    const modal = new bootstrap.Modal(document.getElementById("eventEditModal"));
    modal.show();
};

window.openEditModal = function(eventId) {
    const events = ClubStorage.getData("club_events") || [];
    const e = events.find(item => item.id === eventId);
    if (!e) return;

    document.getElementById("event-modal-title").innerText = "Chỉnh sửa sự kiện";
    document.getElementById("edit-e-id").value = e.id;
    document.getElementById("e-title").value = e.title;
    document.getElementById("e-date").value = e.date;
    document.getElementById("e-location").value = e.location;
    document.getElementById("e-leader").value = e.leaderId;
    document.getElementById("e-desc").value = e.description;
    document.getElementById("e-image").value = e.image || "";
    
    const preview = document.getElementById("e-image-preview");
    if (preview && e.image) {
        preview.src = e.image;
        preview.style.display = "block";
    }

    const modal = new bootstrap.Modal(document.getElementById("eventEditModal"));
    modal.show();
};

function handleEventFormSubmit(eventObj) {
    eventObj.preventDefault();

    const id = document.getElementById("edit-e-id").value;
    const title = document.getElementById("e-title").value.trim();
    const date = document.getElementById("e-date").value;
    const location = document.getElementById("e-location").value.trim();
    const leaderId = document.getElementById("e-leader").value;
    const desc = document.getElementById("e-desc").value.trim();
    const imgVal = document.getElementById("e-image").value.trim();

    let events = ClubStorage.getData("club_events") || [];

    const isEdit = id !== "";

    if (isEdit) {
        const index = events.findIndex(e => e.id === id);
        if (index !== -1) {
            events[index] = {
                ...events[index],
                title,
                date,
                location,
                leaderId,
                description: desc,
                image: imgVal || events[index].image
            };
            ClubStorage.saveData("club_events", events);
            ClubUtils.addLog(`Cập nhật sự kiện: ${title}`);
            ClubUtils.showToast("Thành công!", "Đã cập nhật thông tin sự kiện.", "success");
        }
    } else {
        const newId = "E0" + (events.length + 1).toString().padStart(2, '0');
        const newEvent = {
            id: newId,
            title,
            date,
            location,
            leaderId,
            description: desc,
            image: imgVal || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600",
            attendeesCount: Math.floor(Math.random() * 40) + 10 // Mock attendee counts
        };
        events.push(newEvent);
        ClubStorage.saveData("club_events", events);
        ClubUtils.addLog(`Tạo sự kiện mới: ${title}`);
        ClubUtils.showToast("Thành công!", "Đã tạo sự kiện hoạt động mới.", "success");
    }

    // Hide edit Modal
    const modalEl = document.getElementById("eventEditModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance.hide();

    renderEventsGrid();
}

window.deleteEvent = function(eventId) {
    ClubUtils.showConfirm(
        "Xác nhận xóa sự kiện?",
        "Tất cả dữ liệu lịch trình của sự kiện này sẽ bị gỡ bỏ!",
        "Xóa",
        "Hủy"
    ).then((result) => {
        if (result.isConfirmed) {
            let events = ClubStorage.getData("club_events") || [];
            const index = events.findIndex(e => e.id === eventId);
            if (index !== -1) {
                const title = events[index].title;
                events.splice(index, 1);
                ClubStorage.saveData("club_events", events);
                ClubUtils.addLog(`Xóa sự kiện: ${title}`);
                ClubUtils.showToast("Đã xóa!", "Sự kiện đã được xóa thành công.", "success");
                renderEventsGrid();
            }
        }
    });
};
