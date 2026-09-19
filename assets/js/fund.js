document.addEventListener("DOMContentLoaded", () => {
    if (!ClubAuth.checkRouteGuard()) return;

    initFundPage();
});

let activePeriodId = "";

function initFundPage() {
    const user = ClubAuth.getCurrentUser();
    const currentMember = ClubAuth.getCurrentMember();

    // Render top management buttons for Admin ONLY
    const topActions = document.getElementById("fund-actions-top");
    if (topActions) {
        if (["admin", "treasurer"].includes(user.role)) {
            topActions.innerHTML = `
                <button class="btn btn-success" onclick="openCreatePeriodModal()">
                    <i class="bi bi-calendar-plus me-1"></i>Tạo Đợt Thu Quỹ
                </button>
            `;
        } else {
            topActions.innerHTML = "";
        }
    }

    // Hide Create Transaction button for non-admin
    const btnCreateTx = document.getElementById("btn-create-tx");
    if (btnCreateTx) {
        btnCreateTx.style.display = (["admin", "treasurer"].includes(user.role)) ? "" : "none";
    }

    // Toggle Period edit & delete buttons for Admin
    const btnEditPeriod = document.getElementById("btn-edit-period");
    const btnDeletePeriod = document.getElementById("btn-delete-period");
    if (btnEditPeriod && btnDeletePeriod) {
        const isAdmin = (["admin", "treasurer"].includes(user.role));
        btnEditPeriod.style.display = isAdmin ? "" : "none";
        btnDeletePeriod.style.display = isAdmin ? "" : "none";
    }

    // Toggle Ledger action column for Admin
    const thLedgerAction = document.getElementById("th-ledger-action");
    if (thLedgerAction) {
        thLedgerAction.style.display = (["admin", "treasurer"].includes(user.role)) ? "" : "none";
    }

    // Populate periods
    populatePeriodDropdown();

    // Event listeners
    document.getElementById("select-fund-period").addEventListener("change", (e) => {
        activePeriodId = e.target.value;
        renderPeriodMembersTable();
    });

    document.getElementById("filter-payment-status").addEventListener("change", renderPeriodMembersTable);

    // Form submits
    document.getElementById("upload-proof-form").addEventListener("submit", handleUploadProofSubmit);
    document.getElementById("create-tx-form").addEventListener("submit", handleCreateTxSubmit);
    document.getElementById("create-period-form").addEventListener("submit", handleCreatePeriodSubmit);
    const editPeriodForm = document.getElementById("edit-period-form");
    if (editPeriodForm) {
        editPeriodForm.addEventListener("submit", handleEditPeriodSubmit);
    }

    // File input preview in proof modal
    document.getElementById("proof-file-input").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById("proof-img-preview").src = ev.target.result;
            document.getElementById("proof-preview-wrap").style.display = "block";
        };
        reader.readAsDataURL(file);
    });

    // Render initial data
    renderFundMetrics();
    renderPeriodMembersTable();
    renderLedgerTable();

    // Register Firestore real-time sync refresh
    if (typeof ClubStorage.registerUIRefresh === "function") {
        const refreshFund = () => {
            renderFundMetrics();
            renderPeriodMembersTable();
            renderLedgerTable();
        };
        ClubStorage.registerUIRefresh("club_fund_periods", () => {
            populatePeriodDropdown();
            refreshFund();
        });
        ClubStorage.registerUIRefresh("club_fund_transactions", refreshFund);
    }
}

function populatePeriodDropdown() {
    const periods = ClubStorage.getData("club_fund_periods") || [];
    const select = document.getElementById("select-fund-period");
    if (!select) return;

    if (periods.length === 0) {
        select.innerHTML = `<option value="">Chưa có đợt thu quỹ nào</option>`;
        activePeriodId = "";
        return;
    }

    select.innerHTML = periods.map(p => `<option value="${p.id}">${p.title} (${Number(p.amountPerMember).toLocaleString('vi-VN')} VNĐ/người)</option>`).join("");
    if (!activePeriodId || !periods.some(p => p.id === activePeriodId)) {
        activePeriodId = periods[0].id;
    }
    select.value = activePeriodId;
}

function renderFundMetrics() {
    const transactions = ClubStorage.getData("club_fund_transactions") || [];
    const periods = ClubStorage.getData("club_fund_periods") || [];
    const members = ClubStorage.getData("club_members") || [];

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === "Income") totalIncome += Number(t.amount || 0);
        else if (t.type === "Expense") totalExpense += Number(t.amount || 0);
    });

    const balance = totalIncome - totalExpense;

    // Period paid stats
    const currentPeriod = periods.find(p => p.id === activePeriodId) || periods[0];
    let periodPaidAmount = 0;
    let unpaidCount = 0;

    if (currentPeriod) {
        (currentPeriod.memberRecords || []).forEach(r => {
            if (r.status === "Paid") {
                periodPaidAmount += Number(currentPeriod.amountPerMember || 0);
            } else {
                unpaidCount++;
            }
        });
    }

    document.getElementById("f-stat-balance").innerText = balance.toLocaleString('vi-VN') + " VNĐ";
    document.getElementById("f-stat-period-paid").innerText = periodPaidAmount.toLocaleString('vi-VN') + " VNĐ";
    document.getElementById("f-stat-expense").innerText = totalExpense.toLocaleString('vi-VN') + " VNĐ";
    document.getElementById("f-stat-unpaid-count").innerText = unpaidCount + " thành viên";
}

function renderPeriodMembersTable() {
    const periods = ClubStorage.getData("club_fund_periods") || [];
    const members = ClubStorage.getData("club_members") || [];
    const user = ClubAuth.getCurrentUser();
    const currentMember = ClubAuth.getCurrentMember();

    const tbody = document.getElementById("period-members-tbody");
    if (!tbody) return;

    const period = periods.find(p => p.id === activePeriodId);
    if (!period) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Chưa chọn đợt thu quỹ</td></tr>`;
        return;
    }

    // Render period info badge
    document.getElementById("period-info-badge").innerHTML = `
        <span class="badge bg-light-primary text-primary fs-6 mb-1">Mức nộp: ${period.amountPerMember.toLocaleString('vi-VN')} VNĐ</span>
        <div class="small text-muted">Hạn đóng: ${ClubUtils.formatDateOnly(period.dueDate)}</div>
    `;

    const statusFilter = document.getElementById("filter-payment-status").value;

    // Ensure memberRecords contains all active members
    let records = period.memberRecords || [];

    let tableRows = members.filter(m => m.status === "Active").map(m => {
        let record = records.find(r => r.memberId === m.id);
        if (!record) {
            record = { memberId: m.id, status: "Unpaid", transactionCode: "", proofUrl: "", paidAt: "", confirmedBy: "" };
        }

        if (statusFilter && record.status !== statusFilter) return "";

        const isPaid = record.status === "Paid";
        const statusBadge = isPaid ? `<span class="badge bg-success">Đã nộp</span>` : `<span class="badge bg-warning">Chưa nộp</span>`;
        const txCode = record.transactionCode || `PAY-${m.id}-${period.id.replace('FUND_','')}`;

        // Action buttons based on role & record status
        let actionsHtml = "";
        const canManage = ["admin", "treasurer"].includes(user.role);
        const isSelf = currentMember && currentMember.id === m.id;

        if (isPaid) {
            if (record.proofUrl) {
                actionsHtml += `<button onclick="viewProofModal('${m.name}', '${record.proofUrl}')" class="btn btn-sm btn-info text-white me-1"><i class="bi bi-eye me-1"></i>Xem biên lai</button>`;
            }
            if (canManage) {
                actionsHtml += `<button onclick="revertPaymentStatus('${period.id}', '${m.id}', '${txCode}')" class="btn btn-sm btn-outline-danger me-1" title="Hủy trạng thái đã thu nếu duyệt nhầm"><i class="bi bi-arrow-counterclockwise me-1"></i>Hủy thu</button>`;
                actionsHtml += `<span class="small text-success fw-semibold"><i class="bi bi-check-all me-1"></i>Đã duyệt</span>`;
            }
        } else {
            // Unpaid
            if (isSelf || canManage) {
                actionsHtml += `<button onclick="openUploadProofModal('${period.id}', '${m.id}', '${txCode}')" class="btn btn-sm btn-primary me-1"><i class="bi bi-upload me-1"></i>Nộp tiền</button>`;
            }
            if (canManage) {
                actionsHtml += `<button onclick="confirmPayment('${period.id}', '${m.id}', '${txCode}')" class="btn btn-sm btn-success"><i class="bi bi-check-circle me-1"></i>Duyệt đã thu</button>`;
            }
        }

        const proofThumb = record.proofUrl 
            ? `<img src="${record.proofUrl}" class="proof-thumb-sm" onclick="viewProofModal('${m.name}', '${record.proofUrl}')" title="Bấm để xem phóng to">`
            : `<span class="text-muted small">Chưa có</span>`;

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="${m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
                        <span class="fw-bold">${m.name}</span>
                    </div>
                </td>
                <td><span class="badge bg-light-secondary text-dark">${m.department}</span></td>
                <td><code class="fw-bold text-primary">${txCode}</code></td>
                <td class="fw-bold text-success">${period.amountPerMember.toLocaleString('vi-VN')}đ</td>
                <td>${statusBadge}</td>
                <td>${proofThumb}</td>
                <td class="small text-muted">${record.paidAt ? ClubUtils.formatDateTime(record.paidAt) : '-'}</td>
                <td class="text-end">${actionsHtml}</td>
            </tr>
        `;
    }).join("");

    if (!tableRows.trim()) {
        tableRows = `<tr><td colspan="8" class="text-center py-4 text-muted">Không có dữ liệu đóng quỹ phù hợp</td></tr>`;
    }

    tbody.innerHTML = tableRows;
    renderFundMetrics();
}

function renderLedgerTable() {
    const transactions = ClubStorage.getData("club_fund_transactions") || [];
    const user = ClubAuth.getCurrentUser();
    const canManage = user && ["admin", "treasurer"].includes(user.role);
    const tbody = document.getElementById("ledger-tbody");
    if (!tbody) return;

    const colSpan = canManage ? 9 : 8;
    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-4 text-muted">Chưa có phiếu Thu / Chi nào</td></tr>`;
        return;
    }

    tbody.innerHTML = transactions.map(t => {
        const isIncome = t.type === "Income";
        const typeBadge = isIncome ? `<span class="badge bg-success">Phiếu Thu (+)</span>` : `<span class="badge bg-danger">Phiếu Chi (-)</span>`;
        const amountClass = isIncome ? "fund-amount-income" : "fund-amount-expense";
        const amountSign = isIncome ? "+" : "-";

        const proofThumb = t.proofUrl 
            ? `<img src="${t.proofUrl}" class="proof-thumb-sm" onclick="viewProofModal('${t.purpose}', '${t.proofUrl}')">`
            : `<span class="text-muted small">Không có</span>`;

        const actionTd = canManage 
            ? `<td class="text-end"><button onclick="deleteTransaction('${t.id}')" class="btn btn-sm btn-outline-danger py-0 px-2" title="Xóa phiếu"><i class="bi bi-trash"></i></button></td>` 
            : ``;

        return `
            <tr>
                <td><code class="fw-bold text-muted">${t.id}</code></td>
                <td>${typeBadge}</td>
                <td><span class="badge bg-light-primary text-primary">${t.category}</span></td>
                <td class="${amountClass}">${amountSign}${Number(t.amount).toLocaleString('vi-VN')} VNĐ</td>
                <td>${t.purpose}</td>
                <td>${proofThumb}</td>
                <td><small class="fw-bold">${t.createdBy}</small></td>
                <td><small class="text-muted">${ClubUtils.formatDateTime(t.date)}</small></td>
                ${actionTd}
            </tr>
        `;
    }).join("");
}

// Open modals
window.openUploadProofModal = function(periodId, memberId, txCode) {
    document.getElementById("proof-period-id").value = periodId;
    document.getElementById("proof-member-id").value = memberId;
    document.getElementById("proof-tx-code").value = txCode;
    document.getElementById("proof-file-input").value = "";
    document.getElementById("proof-preview-wrap").style.display = "none";

    new bootstrap.Modal(document.getElementById("uploadProofModal")).show();
};

window.viewProofModal = function(title, imgUrl) {
    document.getElementById("proof-view-title").innerText = "Minh chứng: " + title;
    document.getElementById("proof-view-img").src = imgUrl;
    document.getElementById("proof-view-download").href = imgUrl;
    document.getElementById("proof-view-download").download = "minh_chung_nop_quy.png";

    new bootstrap.Modal(document.getElementById("proofViewModal")).show();
};

window.openCreateTransactionModal = function() {
    new bootstrap.Modal(document.getElementById("createTxModal")).show();
};

window.openCreatePeriodModal = function() {
    new bootstrap.Modal(document.getElementById("createPeriodModal")).show();
};

// Handlers
function handleUploadProofSubmit(e) {
    e.preventDefault();
    const periodId = document.getElementById("proof-period-id").value;
    const memberId = document.getElementById("proof-member-id").value;
    const txCode = document.getElementById("proof-tx-code").value;
    const proofImgSrc = document.getElementById("proof-img-preview").src;

    if (!proofImgSrc) {
        ClubUtils.showAlert("Lỗi", "Vui lòng chọn ảnh biên lai chuyển khoản.", "error");
        return;
    }

    let periods = ClubStorage.getData("club_fund_periods") || [];
    const pIdx = periods.findIndex(p => p.id === periodId);

    if (pIdx !== -1) {
        periods[pIdx].memberRecords = periods[pIdx].memberRecords || [];
        let mRecIdx = periods[pIdx].memberRecords.findIndex(r => r.memberId === memberId);
        
        const user = ClubAuth.getCurrentUser();
        const currentMember = ClubAuth.getCurrentMember();
        const updaterName = currentMember ? currentMember.name : user.username;

        const newRecord = {
            memberId: memberId,
            status: "Paid",
            transactionCode: txCode,
            proofUrl: proofImgSrc,
            paidAt: ClubUtils.nowString(),
            confirmedBy: updaterName
        };

        if (mRecIdx !== -1) {
            periods[pIdx].memberRecords[mRecIdx] = newRecord;
        } else {
            periods[pIdx].memberRecords.push(newRecord);
        }

        // Also add Income transaction to ledger automatically
        let transactions = ClubStorage.getData("club_fund_transactions") || [];
        const newTx = {
            id: "TX0" + (transactions.length + 1).toString().padStart(2, '0'),
            type: "Income",
            category: "Thu Quỹ Thành viên",
            amount: periods[pIdx].amountPerMember,
            purpose: `Thu quỹ đợt ${periods[pIdx].title} (Mã: ${txCode})`,
            proofUrl: proofImgSrc,
            createdBy: updaterName,
            date: ClubUtils.nowString()
        };
        transactions.unshift(newTx);

        ClubStorage.saveData("club_fund_periods", periods);
        ClubStorage.saveData("club_fund_transactions", transactions);

        ClubUtils.addLog(`Nộp minh chứng đóng quỹ: ${txCode}`);
        ClubUtils.showToast("Thành công!", "Đã tải lên minh chứng và duyệt thu quỹ.", "success");

        bootstrap.Modal.getInstance(document.getElementById("uploadProofModal")).hide();
        renderPeriodMembersTable();
        renderLedgerTable();
    }
}

window.confirmPayment = function(periodId, memberId, txCode) {
    ClubUtils.showConfirm(
        "Xác nhận đã thu tiền quỹ?",
        `Xác nhận thành viên này đã đóng tiền cho đợt thu quỹ (Mã: ${txCode})?`,
        "Xác nhận đã thu",
        "Hủy"
    ).then((result) => {
        if (result.isConfirmed) {
            let periods = ClubStorage.getData("club_fund_periods") || [];
            const pIdx = periods.findIndex(p => p.id === periodId);

            if (pIdx !== -1) {
                periods[pIdx].memberRecords = periods[pIdx].memberRecords || [];
                let mRecIdx = periods[pIdx].memberRecords.findIndex(r => r.memberId === memberId);
                const user = ClubAuth.getCurrentUser();
                const currentMember = ClubAuth.getCurrentMember();
                const updaterName = currentMember ? currentMember.name : user.username;

                const newRecord = {
                    memberId: memberId,
                    status: "Paid",
                    transactionCode: txCode,
                    proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
                    paidAt: ClubUtils.nowString(),
                    confirmedBy: updaterName
                };

                if (mRecIdx !== -1) {
                    periods[pIdx].memberRecords[mRecIdx] = newRecord;
                } else {
                    periods[pIdx].memberRecords.push(newRecord);
                }

                // Add to ledger
                let transactions = ClubStorage.getData("club_fund_transactions") || [];
                transactions.unshift({
                    id: "TX0" + (transactions.length + 1).toString().padStart(2, '0'),
                    type: "Income",
                    category: "Thu Quỹ Thành viên",
                    amount: periods[pIdx].amountPerMember,
                    purpose: `Xác nhận thu quỹ (Mã: ${txCode})`,
                    proofUrl: newRecord.proofUrl,
                    createdBy: updaterName,
                    date: ClubUtils.nowString()
                });

                ClubStorage.saveData("club_fund_periods", periods);
                ClubStorage.saveData("club_fund_transactions", transactions);

                ClubUtils.addLog(`Đã duyệt đóng quỹ cho thành viên ${memberId}`);
                ClubUtils.showToast("Thành công!", "Đã cập nhật trạng thái đóng quỹ.", "success");
                renderPeriodMembersTable();
                renderLedgerTable();
            }
        }
    });
};

function handleCreateTxSubmit(e) {
    e.preventDefault();
    const type = document.getElementById("tx-type").value;
    const amount = Number(document.getElementById("tx-amount").value);
    const category = document.getElementById("tx-category").value;
    const purpose = document.getElementById("tx-purpose").value.trim();
    const fileInput = document.getElementById("tx-file-input");

    const user = ClubAuth.getCurrentUser();
    const currentMember = ClubAuth.getCurrentMember();
    const authorName = currentMember ? currentMember.name : user.username;

    let transactions = ClubStorage.getData("club_fund_transactions") || [];
    const newId = "TX0" + (transactions.length + 1).toString().padStart(2, '0');

    const saveTransaction = (proofUrl) => {
        transactions.unshift({
            id: newId,
            type,
            category,
            amount,
            purpose,
            proofUrl: proofUrl || "",
            createdBy: authorName,
            date: ClubUtils.nowString()
        });

        ClubStorage.saveData("club_fund_transactions", transactions);
        ClubUtils.addLog(`Tạo phiếu ${type === 'Income' ? 'Thu' : 'Chi'}: ${newId} (${amount.toLocaleString('vi-VN')}đ)`);
        ClubUtils.showToast("Thành công!", "Đã lưu phiếu thu chi mới vào sổ quỹ.", "success");

        bootstrap.Modal.getInstance(document.getElementById("createTxModal")).hide();
        document.getElementById("create-tx-form").reset();
        renderLedgerTable();
        renderFundMetrics();
    };

    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (ev) => saveTransaction(ev.target.result);
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        saveTransaction("");
    }
}

function handleCreatePeriodSubmit(e) {
    e.preventDefault();
    const title = document.getElementById("p-title").value.trim();
    const amountPerMember = Number(document.getElementById("p-amount").value);
    const dueDate = document.getElementById("p-duedate").value;
    const description = document.getElementById("p-desc").value.trim();

    let periods = ClubStorage.getData("club_fund_periods") || [];
    const newId = "FUND_" + new Date().getFullYear() + "_P" + (periods.length + 1);

    const members = ClubStorage.getData("club_members") || [];
    const memberRecords = members.filter(m => m.status === "Active").map(m => ({
        memberId: m.id,
        status: "Unpaid",
        transactionCode: `PAY-${m.id}-${newId.replace('FUND_','')}`,
        proofUrl: "",
        paidAt: "",
        confirmedBy: ""
    }));

    periods.unshift({
        id: newId,
        title,
        amountPerMember,
        dueDate,
        status: "Active",
        description,
        memberRecords
    });

    ClubStorage.saveData("club_fund_periods", periods);
    ClubUtils.addLog(`Tạo đợt thu quỹ mới: ${title}`);
    ClubUtils.showToast("Thành công!", "Đã khởi tạo đợt thu quỹ mới.", "success");

    bootstrap.Modal.getInstance(document.getElementById("createPeriodModal")).hide();
    document.getElementById("create-period-form").reset();
    populatePeriodDropdown();
    renderPeriodMembersTable();
}

// ──────────────────────────────────────────────────────────────
// Hủy thu quỹ – revert status Paid → Unpaid, xóa giao dịch tương ứng
// ──────────────────────────────────────────────────────────────
window.revertPaymentStatus = function(periodId, memberId, txCode) {
    ClubUtils.showConfirm(
        "Hủy trạng thái đã thu?",
        `Thao tác này sẽ đặt lại trạng thái của thành viên về <b>Chưa nộp</b> và xóa giao dịch thu quỹ (Mã: ${txCode}) khỏi sổ thu chi. Tiếp tục?`,
        "Đồng ý Hủy thu",
        "Quay lại"
    ).then((result) => {
        if (!result.isConfirmed) return;

        let periods = ClubStorage.getData("club_fund_periods") || [];
        const pIdx = periods.findIndex(p => p.id === periodId);
        if (pIdx === -1) return;

        periods[pIdx].memberRecords = periods[pIdx].memberRecords || [];
        const mRecIdx = periods[pIdx].memberRecords.findIndex(r => r.memberId === memberId);

        if (mRecIdx !== -1) {
            periods[pIdx].memberRecords[mRecIdx] = {
                memberId: memberId,
                status: "Unpaid",
                transactionCode: txCode,
                proofUrl: "",
                paidAt: "",
                confirmedBy: ""
            };
        } else {
            periods[pIdx].memberRecords.push({
                memberId: memberId,
                status: "Unpaid",
                transactionCode: txCode,
                proofUrl: "",
                paidAt: "",
                confirmedBy: ""
            });
        }

        // Xóa giao dịch tương ứng trong sổ thu chi (khớp txCode trong purpose)
        let transactions = ClubStorage.getData("club_fund_transactions") || [];
        transactions = transactions.filter(t => !t.purpose.includes(txCode));

        ClubStorage.saveData("club_fund_periods", periods);
        ClubStorage.saveData("club_fund_transactions", transactions);

        ClubUtils.addLog(`Hủy thu quỹ cho thành viên ${memberId} (Mã: ${txCode})`);
        ClubUtils.showToast("Đã hủy thu!", "Trạng thái đóng quỹ đã được đặt lại về Chưa nộp.", "info");
        renderPeriodMembersTable();
        renderLedgerTable();
        renderFundMetrics();
    });
};

// ──────────────────────────────────────────────────────────────
// Sửa đợt thu quỹ
// ──────────────────────────────────────────────────────────────
window.openEditPeriodModal = function() {
    const periods = ClubStorage.getData("club_fund_periods") || [];
    const period = periods.find(p => p.id === activePeriodId);
    if (!period) {
        ClubUtils.showAlert("Thông báo", "Vui lòng chọn một đợt thu quỹ trước.", "info");
        return;
    }

    document.getElementById("edit-p-id").value = period.id;
    document.getElementById("edit-p-title").value = period.title;
    document.getElementById("edit-p-amount").value = period.amountPerMember;
    document.getElementById("edit-p-duedate").value = period.dueDate;
    document.getElementById("edit-p-status").value = period.status || "Active";
    document.getElementById("edit-p-desc").value = period.description || "";

    new bootstrap.Modal(document.getElementById("editPeriodModal")).show();
};

function handleEditPeriodSubmit(e) {
    e.preventDefault();

    const periodId = document.getElementById("edit-p-id").value;
    const title = document.getElementById("edit-p-title").value.trim();
    const amountPerMember = Number(document.getElementById("edit-p-amount").value);
    const dueDate = document.getElementById("edit-p-duedate").value;
    const status = document.getElementById("edit-p-status").value;
    const description = document.getElementById("edit-p-desc").value.trim();

    let periods = ClubStorage.getData("club_fund_periods") || [];
    const pIdx = periods.findIndex(p => p.id === periodId);
    if (pIdx === -1) return;

    periods[pIdx].title = title;
    periods[pIdx].amountPerMember = amountPerMember;
    periods[pIdx].dueDate = dueDate;
    periods[pIdx].status = status;
    periods[pIdx].description = description;

    ClubStorage.saveData("club_fund_periods", periods);
    ClubUtils.addLog(`Chỉnh sửa đợt thu quỹ: ${title}`);
    ClubUtils.showToast("Thành công!", "Đã cập nhật thông tin đợt thu quỹ.", "success");

    bootstrap.Modal.getInstance(document.getElementById("editPeriodModal")).hide();
    populatePeriodDropdown();
    renderPeriodMembersTable();
    renderFundMetrics();
}

// ──────────────────────────────────────────────────────────────
// Xóa đợt thu quỹ đang chọn
// ──────────────────────────────────────────────────────────────
window.deleteActivePeriod = function() {
    if (!activePeriodId) {
        ClubUtils.showAlert("Thông báo", "Vui lòng chọn một đợt thu quỹ để xóa.", "info");
        return;
    }

    const periods = ClubStorage.getData("club_fund_periods") || [];
    const period = periods.find(p => p.id === activePeriodId);
    if (!period) return;

    ClubUtils.showConfirm(
        "Xóa đợt thu quỹ?",
        `Bạn chắc chắn muốn xóa đợt thu <b>${period.title}</b>? Thao tác này không thể hoàn tác và sẽ xóa tất cả dữ liệu đóng quỹ của đợt này.`,
        "Xóa đợt thu",
        "Hủy"
    ).then((result) => {
        if (!result.isConfirmed) return;

        let updatedPeriods = ClubStorage.getData("club_fund_periods") || [];
        updatedPeriods = updatedPeriods.filter(p => p.id !== activePeriodId);

        ClubStorage.saveData("club_fund_periods", updatedPeriods);
        activePeriodId = "";

        ClubUtils.addLog(`Xóa đợt thu quỹ: ${period.title}`);
        ClubUtils.showToast("Đã xóa!", `Đợt thu "${period.title}" đã được xóa.`, "success");
        populatePeriodDropdown();
        renderPeriodMembersTable();
        renderFundMetrics();
    });
};

// ──────────────────────────────────────────────────────────────
// Xóa phiếu thu chi khỏi sổ quỹ
// ──────────────────────────────────────────────────────────────
window.deleteTransaction = function(txId) {
    ClubUtils.showConfirm(
        "Xóa phiếu thu/chi?",
        `Bạn có chắc muốn xóa phiếu <b>${txId}</b> khỏi sổ quỹ? Lưu ý: nếu đây là phiếu thu quỹ thành viên, hãy dùng nút <b>Hủy thu</b> trên bảng đóng quỹ để đồng bộ trạng thái.`,
        "Xóa phiếu",
        "Hủy"
    ).then((result) => {
        if (!result.isConfirmed) return;

        let transactions = ClubStorage.getData("club_fund_transactions") || [];
        transactions = transactions.filter(t => t.id !== txId);

        ClubStorage.saveData("club_fund_transactions", transactions);
        ClubUtils.addLog(`Xóa phiếu thu/chi: ${txId}`);
        ClubUtils.showToast("Đã xóa!", "Phiếu thu/chi đã được xóa khỏi sổ quỹ.", "success");
        renderLedgerTable();
        renderFundMetrics();
    });
};
