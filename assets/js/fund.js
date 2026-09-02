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
        if (user.role === "admin") {
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
        btnCreateTx.style.display = (user.role === "admin") ? "" : "none";
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
        return;
    }

    select.innerHTML = periods.map(p => `<option value="${p.id}">${p.title} (${p.amountPerMember.toLocaleString('vi-VN')} VNĐ/người)</option>`).join("");
    activePeriodId = periods[0].id;
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
        const canManage = user.role === "admin";
        const isSelf = currentMember && currentMember.id === m.id;

        if (isPaid) {
            if (record.proofUrl) {
                actionsHtml += `<button onclick="viewProofModal('${m.name}', '${record.proofUrl}')" class="btn btn-sm btn-info text-white me-1"><i class="bi bi-eye me-1"></i>Xem biên lai</button>`;
            }
            if (canManage) {
                actionsHtml += `<span class="small text-muted"><i class="bi bi-check-all text-success me-1"></i>Đã duyệt</span>`;
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
    const tbody = document.getElementById("ledger-tbody");
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Chưa có phiếu Thu / Chi nào</td></tr>`;
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
