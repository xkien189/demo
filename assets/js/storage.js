(function() {
    const DEFAULT_MEMBERS = [
        { id: "M001", name: "Nguyễn Văn An", email: "an.nv@clb.vn", phone: "0901234567", department: "Ban Chuyên môn", role: "admin", status: "Active", joinDate: "2024-09-01", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", activityScore: 150 },
        { id: "M002", name: "Trần Thị Bình", email: "binh.tt@clb.vn", phone: "0902345678", department: "Ban Chuyên môn", role: "vice", status: "Active", joinDate: "2024-09-05", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", activityScore: 120 },
        { id: "M003", name: "Lê Văn Cường", email: "cuong.lv@clb.vn", phone: "0903456789", department: "Ban Truyền thông", role: "leader", status: "Active", joinDate: "2024-09-10", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150", activityScore: 90 },
        { id: "M004", name: "Phạm Thị Dung", email: "dung.pt@clb.vn", phone: "0904567890", department: "Ban Đối ngoại", role: "assistant", status: "Active", joinDate: "2024-09-12", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150", activityScore: 80 },
        { id: "M005", name: "Hoàng Văn Em", email: "em.hv@clb.vn", phone: "0905678901", department: "Ban Sự kiện", role: "member", status: "Active", joinDate: "2024-10-01", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", activityScore: 40 },
        { id: "M006", name: "Vũ Thị Giang", email: "giang.vt@clb.vn", phone: "0906789012", department: "Ban Tài chính", role: "guest", status: "Active", joinDate: "2024-11-15", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150", activityScore: 10 },
        { id: "M007", name: "Đặng Hoàng Hải", email: "hai.dh@clb.vn", phone: "0907890123", department: "Ban Chuyên môn", role: "member", status: "Inactive", joinDate: "2024-09-20", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", activityScore: 0 }
    ];

    const DEFAULT_USERS = [
        { username: "admin", password: "123", memberId: "M001", role: "admin", status: "Active" },
        { username: "vice", password: "123", memberId: "M002", role: "vice", status: "Active" },
        { username: "leader", password: "123", memberId: "M003", role: "leader", status: "Active" },
        { username: "assistant", password: "123", memberId: "M004", role: "assistant", status: "Active" },
        { username: "member", password: "123", memberId: "M005", role: "member", status: "Active" },
        { username: "guest", password: "123", memberId: "M006", role: "guest", status: "Active" }
    ];

    const DEFAULT_DEPARTMENTS = [
        { code: "CM", name: "Ban Chuyên môn", description: "Nơi nghiên cứu thuật toán, phát triển phần mềm và đào tạo kiến thức cốt lõi.", leader: "M001", assistant: "M002", memberCount: 3 },
        { code: "TT", name: "Ban Truyền thông", description: "Phụ trách nội dung fanpage, hình ảnh sự kiện, thiết kế ấn phẩm đồ họa.", leader: "M003", assistant: "", memberCount: 1 },
        { code: "DN", name: "Ban Đối ngoại", description: "Làm việc với doanh nghiệp, đối tác, tài trợ và duy trì quan hệ ngoại giao.", leader: "", assistant: "M004", memberCount: 1 },
        { code: "SK", name: "Ban Sự kiện", description: "Tổ chức teambuilding, workshop, giải đấu hackathon và các buổi sinh hoạt định kỳ.", leader: "", assistant: "", memberCount: 1 },
        { code: "TC", name: "Ban Tài chính", description: "Theo dõi thu chi, thủ quỹ, lập dự toán chi tiêu cho các sự kiện hoạt động của CLB.", leader: "", assistant: "", memberCount: 1 }
    ];

    const DEFAULT_TASKS = [
        { 
            id: "T001", 
            title: "Thiết kế Landing Page tuyển thành viên", 
            description: "Xây dựng giao diện Landing page giới thiệu CLB và tích hợp form đăng ký ứng tuyển khóa mới.", 
            department: "Ban Chuyên môn", 
            assigneeId: "M001", 
            creatorId: "M001", 
            startDate: "2026-07-01", 
            deadline: "2026-07-20", 
            priority: "High", 
            status: "In Progress", 
            progress: 60,
            comments: [
                { author: "Nguyễn Văn An", text: "Đã hoàn thành cấu trúc HTML thô.", time: "05-07-2026 14:00:00" },
                { author: "Trần Thị Bình", text: "Cần chú ý màu sắc và typography giống hướng dẫn thương hiệu.", time: "06-07-2026 09:30:00" }
            ],
            history: [
                { user: "Nguyễn Văn An", text: "Tạo công việc", time: "01-07-2026 10:00:00" },
                { user: "Nguyễn Văn An", text: "Cập nhật tiến độ lên 60%", time: "05-07-2026 14:00:00" }
            ],
            attachments: [
                { name: "wireframe_v1.png", size: "1.2 MB", url: "#" }
            ]
        },
        { 
            id: "T002", 
            title: "Viết bài truyền thông tuyển gen mới", 
            description: "Lên dàn bài, viết content thu hút, chuẩn bị bộ ảnh bài post fanpage để quảng bá tuyển sinh.", 
            department: "Ban Truyền thông", 
            assigneeId: "M003", 
            creatorId: "M001", 
            startDate: "2026-07-05", 
            deadline: "2026-07-15", 
            priority: "High", 
            status: "In Progress", 
            progress: 45,
            comments: [],
            history: [{ user: "Nguyễn Văn An", text: "Tạo công việc", time: "05-07-2026 11:20:00" }],
            attachments: []
        },
        { 
            id: "T003", 
            title: "Soạn thảo hồ sơ tài trợ nhà tài trợ vàng", 
            description: "Hoàn thiện Proposal kêu gọi tài trợ các gói lớn từ đối tác công nghệ lớn.", 
            department: "Ban Đối ngoại", 
            assigneeId: "M004", 
            creatorId: "M002", 
            startDate: "2026-07-02", 
            deadline: "2026-07-18", 
            priority: "Medium", 
            status: "Completed", 
            progress: 100,
            comments: [{ author: "Phạm Thị Dung", text: "Đã gửi mail nháp cho doanh nghiệp phản hồi tích cực.", time: "10-07-2026 16:30:00" }],
            history: [
                { user: "Trần Thị Bình", text: "Tạo công việc", time: "02-07-2026 08:30:00" },
                { user: "Phạm Thị Dung", text: "Hoàn thành công việc", time: "10-07-2026 17:00:00" }
            ],
            attachments: [{ name: "Proposal_Gold_V2.pdf", size: "3.4 MB", url: "#" }]
        },
        { 
            id: "T004", 
            title: "Lên kế hoạch tổ chức Teambuilding Hè", 
            description: "Thiết kế trò chơi, đặt địa điểm, chuẩn bị quà tặng và dự trù chi phí cho buổi dã ngoại.", 
            department: "Ban Sự kiện", 
            assigneeId: "M005", 
            creatorId: "M002", 
            startDate: "2026-07-10", 
            deadline: "2026-07-25", 
            priority: "Low", 
            status: "Pending", 
            progress: 0,
            comments: [],
            history: [{ user: "Trần Thị Bình", text: "Tạo công việc", time: "10-07-2026 09:00:00" }],
            attachments: []
        }
    ];

    const DEFAULT_EVENTS = [
        { id: "E001", title: "Welcome Gen 10 - Định hướng & Chào đón", date: "2026-07-28", location: "Hội trường A2", description: "Sự kiện chào đón các thành viên mới trúng tuyển vào CLB.", leaderId: "M001", attendeesCount: 80 },
        { id: "E002", title: "Workshop: Lập trình Web hiện đại", date: "2026-08-05", location: "Phòng máy 302", description: "Chia sẻ lộ trình phát triển Web với React & Node.js.", leaderId: "M002", attendeesCount: 45 }
    ];

    const DEFAULT_NOTIFICATIONS = [
        { id: "N001", title: "Họp Ban chủ nhiệm bất thường", text: "Thông báo triệu tập cuộc họp ban chủ nhiệm vào lúc 19:30 tối nay thảo luận ngân sách tuyển sinh.", type: "General", target: "All", sender: "Nguyễn Văn An", date: "12-07-2026 08:00:00" },
        { id: "N002", title: "Nộp báo cáo tiến độ tuần 2", text: "Tất cả các trưởng ban nộp báo cáo kết quả hoàn thành task về hòm thư CLB trước thứ 2.", type: "Department", target: "Ban Chuyên môn", sender: "Nguyễn Văn An", date: "11-07-2026 15:30:00" }
    ];

    const DEFAULT_SETTINGS = {
        clubName: "CLB Lập Trình & Phát Triển Phần Mềm (DevClub)",
        slogan: "Code your dream, build the future",
        contactEmail: "contact@devclub.vn",
        contactPhone: "024.1234.5678",
        logo: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120",
        themeColor: "blue",
        geminiApiKey: ""
    };

    const DEFAULT_LOGS = [
        { time: "12-07-2026 09:10:00", user: "Nguyễn Văn An", action: "Đăng nhập hệ thống" },
        { time: "11-07-2026 16:45:00", user: "Trần Thị Bình", action: "Cập nhật tài liệu Ban Chuyên môn" }
    ];

    const DEFAULT_FUND_PERIODS = [
        {
            id: "FUND_2026_HK1",
            title: "Quỹ CLB Học kỳ 1 (2026-2027)",
            amountPerMember: 100000,
            dueDate: "2026-09-30",
            status: "Active",
            description: "Đóng quỹ định kỳ Học kỳ 1 duy trì sinh hoạt, mua sắm vật tư và tổ chức sự kiện.",
            memberRecords: [
                { memberId: "M001", status: "Paid", transactionCode: "PAY-M001-HK1", proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", paidAt: "01-09-2026 09:30:00", confirmedBy: "Nguyễn Văn An" },
                { memberId: "M002", status: "Paid", transactionCode: "PAY-M002-HK1", proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", paidAt: "02-09-2026 10:15:00", confirmedBy: "Nguyễn Văn An" },
                { memberId: "M003", status: "Paid", transactionCode: "PAY-M003-HK1", proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", paidAt: "05-09-2026 14:20:00", confirmedBy: "Nguyễn Văn An" },
                { memberId: "M004", status: "Unpaid", transactionCode: "", proofUrl: "", paidAt: "", confirmedBy: "" },
                { memberId: "M005", status: "Unpaid", transactionCode: "", proofUrl: "", paidAt: "", confirmedBy: "" },
                { memberId: "M006", status: "Unpaid", transactionCode: "", proofUrl: "", paidAt: "", confirmedBy: "" }
            ]
        }
    ];

    const DEFAULT_FUND_TRANSACTIONS = [
        { id: "TX001", type: "Income", category: "Thu Quỹ Thành viên", amount: 300000, purpose: "Thu quỹ HK1 năm 2026 từ 3 thành viên M001, M002, M003", proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", createdBy: "Nguyễn Văn An", date: "05-09-2026 15:00:00" },
        { id: "TX002", type: "Expense", category: "Mua sắm Thiết bị", amount: 150000, purpose: "Mua loa cầm tay và băng rôn cho Teambuilding Hè", proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", createdBy: "Trần Thị Bình", date: "10-09-2026 11:30:00" },
        { id: "TX003", type: "Income", category: "Tài trợ Doanh nghiệp", amount: 2000000, purpose: "Nhà tài trợ Vàng chuyển khoản tài trợ sự kiện Welcome Gen 10", proofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", createdBy: "Phạm Thị Dung", date: "15-09-2026 09:00:00" }
    ];

    const DEFAULTS = {
        club_members: DEFAULT_MEMBERS,
        club_users: DEFAULT_USERS,
        club_departments: DEFAULT_DEPARTMENTS,
        club_tasks: DEFAULT_TASKS,
        club_events: DEFAULT_EVENTS,
        club_notifications: DEFAULT_NOTIFICATIONS,
        club_settings: DEFAULT_SETTINGS,
        club_logs: DEFAULT_LOGS,
        club_fund_periods: DEFAULT_FUND_PERIODS,
        club_fund_transactions: DEFAULT_FUND_TRANSACTIONS
    };

    function initStorage(key, defaultValue) {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(defaultValue));
        }
    }

    // Initialize all datasets in LocalStorage
    Object.keys(DEFAULTS).forEach(key => {
        initStorage(key, DEFAULTS[key]);
    });

    // Cloud Firestore Sync Manager
    function setupCloudSync() {
        if (typeof firebase === "undefined" || !firebase.apps.length) return;
        const db = firebase.firestore();

        Object.keys(DEFAULTS).forEach(key => {
            const docRef = db.collection("app_data").doc(key);

            // Listen to real-time updates from Cloud Firestore
            docRef.onSnapshot(doc => {
                if (doc.exists) {
                    const cloudData = doc.data().data;
                    if (cloudData) {
                        localStorage.setItem(key, JSON.stringify(cloudData));
                    }
                } else {
                    // Initial Cloud Seed: Write default local data to Cloud Firestore if doc doesn't exist yet
                    const localData = JSON.parse(localStorage.getItem(key)) || DEFAULTS[key];
                    docRef.set({ data: localData, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
                        .then(() => console.log(`☁️ Firestore seeded collection: ${key}`))
                        .catch(err => console.error(`Firestore seed error for ${key}:`, err));
                }
            }, err => {
                console.warn(`Firestore listener notice for ${key}:`, err.message);
            });
        });
    }

    // Attempt cloud sync on DOM load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupCloudSync);
    } else {
        setupCloudSync();
    }

    window.ClubStorage = {
        getData: function(key) {
            return JSON.parse(localStorage.getItem(key));
        },
        saveData: function(key, data) {
            // Save to LocalStorage immediately
            localStorage.setItem(key, JSON.stringify(data));

            // Sync to Firestore Cloud asynchronously
            if (typeof firebase !== "undefined" && firebase.apps.length) {
                try {
                    const db = firebase.firestore();
                    db.collection("app_data").doc(key).set({
                        data: data,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(err => {
                        console.warn("Firestore save async warning:", err.message);
                    });
                } catch (e) {
                    console.warn("Firestore sync skipped:", e.message);
                }
            }
        },
        reset: function() {
            localStorage.clear();
            if (typeof firebase !== "undefined" && firebase.apps.length) {
                const db = firebase.firestore();
                Object.keys(DEFAULTS).forEach(key => {
                    db.collection("app_data").doc(key).set({
                        data: DEFAULTS[key],
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            }
            location.reload();
        }
    };
})();
