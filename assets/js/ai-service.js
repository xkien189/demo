/**
 * AI Service Module - Core Abstraction Layer for Club Management System
 * Supports Google Gemini 1.5 Flash API (Free Tier) & Smart Rule-Based Fallback Engine
 */
const AIService = {
    // Get stored API key or return empty
    getApiKey: function() {
        const settings = ClubStorage.getData("club_settings") || {};
        return settings.geminiApiKey || "";
    },

    // Build context with strict permission checks
    buildContext: function() {
        const user = ClubAuth.getCurrentUser();
        const currentMember = ClubAuth.getCurrentMember();
        const role = user ? user.role : "guest";

        const tasks = ClubStorage.getData("club_tasks") || [];
        const events = ClubStorage.getData("club_events") || [];
        const members = ClubStorage.getData("club_members") || [];
        const depts = ClubStorage.getData("club_departments") || [];
        const funds = ClubStorage.getData("club_fund_periods") || [];
        const transactions = ClubStorage.getData("club_fund_transactions") || [];
        const settings = ClubStorage.getData("club_settings") || {};

        let userTasks = tasks;
        let userMembers = members;

        // Role Permission Guard
        if (["member", "guest"].includes(role)) {
            userTasks = tasks.filter(t => t.assigneeId === (currentMember ? currentMember.id : ""));
            userMembers = members.filter(m => m.id === (currentMember ? currentMember.id : ""));
        } else if (["leader", "assistant"].includes(role) && currentMember) {
            userTasks = tasks.filter(t => t.department === currentMember.department);
            userMembers = members.filter(m => m.department === currentMember.department);
        }

        return {
            role: role,
            userName: currentMember ? currentMember.name : (user ? user.username : "Ẩn danh"),
            userDept: currentMember ? currentMember.department : "Chưa phân ban",
            tasks: userTasks,
            allTasksCount: tasks.length,
            events: events,
            members: userMembers,
            totalMembersCount: members.length,
            departments: depts,
            fundPeriods: funds,
            fundTransactions: transactions,
            settings: settings
        };
    },

    // Main AI Query method
    query: async function(userPrompt) {
        const apiKey = this.getApiKey();
        const context = this.buildContext();

        // 1. If API Key is configured, attempt Google Gemini API
        if (apiKey) {
            try {
                const response = await this.callGemini(userPrompt, context, apiKey);
                if (response) return response;
            } catch (err) {
                console.warn("Gemini API call failed, switching to Smart Rule Engine:", err.message);
            }
        }

        // 2. Fallback to Smart Rule-Based Engine (100% Free & Fast)
        return this.generateSmartResponse(userPrompt, context);
    },

    // Gemini API Call
    callGemini: async function(userPrompt, context, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const systemPrompt = `Bạn là Trợ lý AI Thông minh của CLB Sinh viên (${context.settings.clubName || 'DevClub'}).
Bạn trả lời bằng tiếng Việt lịch sự, ngắn gọn và hữu ích dựa trên DỮ LIỆU THỰC TẾ của CLB dưới đây.
Thông tin người đang hỏi: ${context.userName} (Vai trò: ${context.role}, Ban: ${context.userDept}).

DỮ LIỆU CLB THỰC TẾ:
- Tổng số công việc được truy cập: ${context.tasks.length}
- Danh sách công việc: ${JSON.stringify(context.tasks.map(t => ({ tiêu_đề: t.title, ban: t.department, hạn: t.deadline, tiến_độ: t.progress, trạng_thái: t.status, ưu_tiên: t.priority })))}
- Danh sách sự kiện: ${JSON.stringify(context.events.map(e => ({ tên: e.title, ngày: e.date, địa_điểm: e.location })))}
- Số lượng thành viên trong phạm vi: ${context.members.length} / Tổng CLB: ${context.totalMembersCount}

Hãy trả lời trực tiếp câu hỏi của người dùng. Nếu người dùng hỏi câu nằm ngoài phạm vi quyền hạn của họ, hãy từ chối khéo léo.`;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: systemPrompt + "\n\nCÂU HỎI NGƯỜI DÙNG: " + userPrompt }
                    ]
                }
            ]
        };

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("API returned status " + res.status);
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    },

    // Smart Rule-Based AI Engine (Works 100% Offline/No API key required)
    generateSmartResponse: function(prompt, ctx) {
        const p = prompt.toLowerCase();

        // Query: Work / Tasks / Deadline
        if (p.includes("công việc") || p.includes("task") || p.includes("nhiệm vụ") || p.includes("deadline") || p.includes("quá hạn")) {
            const overdue = ctx.tasks.filter(t => t.status !== "Completed" && new Date(t.deadline) < new Date());
            const inProgress = ctx.tasks.filter(t => t.status === "In Progress");
            const upcoming = ctx.tasks.filter(t => t.status !== "Completed").sort((a,b) => new Date(a.deadline) - new Date(b.deadline));

            let res = `📋 **Báo cáo Công việc cho ${ctx.userName}**:
- Bạn có quyền truy cập **${ctx.tasks.length}** công việc.
- Đang thực hiện: **${inProgress.length}** nhiệm vụ.
- Quá hạn deadline: **${overdue.length}** nhiệm vụ.`;

            if (upcoming.length > 0) {
                res += `\n\n⏳ **Nhiệm vụ sắp tới nhất**:
📌 *${upcoming[0].title}* (Hạn: ${ClubUtils.formatDateOnly(upcoming[0].deadline)} - Tiến độ: ${upcoming[0].progress}%)`;
            }

            return res;
        }

        // Query: Events / Workshop
        if (p.includes("sự kiện") || p.includes("event") || p.includes("workshop") || p.includes("lịch")) {
            if (ctx.events.length === 0) return "📅 Hiện chưa có sự kiện nào được lên lịch.";
            const nextEvent = ctx.events[0];
            return `🎉 **Thông tin Sự kiện CLB**:
- Tổng số sự kiện: **${ctx.events.length}**
- Sự kiện nổi bật: **${nextEvent.title}**
- 📍 Địa điểm: ${nextEvent.location}
- 📅 Ngày tổ chức: ${ClubUtils.formatDateOnly(nextEvent.date)}
- 👥 Người đăng ký: ${nextEvent.attendeesCount || 0} người.`;
        }

        // Query: Members / Departments
        if (p.includes("thành viên") || p.includes("ban") || p.includes("ai là") || p.includes("danh sách")) {
            if (["member", "guest"].includes(ctx.role)) {
                return `👥 Bạn đang ở ban **${ctx.userDept}**. Tổng số thành viên CLB hiện tại là **${ctx.totalMembersCount}** thành viên chính thức.`;
            }
            return `👥 **Thông tin Thành viên CLB**:
- Tổng số thành viên: **${ctx.totalMembersCount}** thành viên.
- Ban bộ phận của bạn (${ctx.userDept}): **${ctx.members.length}** người.
- 5 Ban bộ phận: Ban Chuyên môn, Ban Truyền thông, Ban Đối ngoại, Ban Sự kiện, Ban Tài chính.`;
        }

        // Query: Club Fund
        if (p.includes("quỹ") || p.includes("tiền") || p.includes("nộp") || p.includes("thu chi")) {
            const period = ctx.fundPeriods[0];
            let totalIncome = 0, totalExpense = 0;
            ctx.fundTransactions.forEach(t => {
                if (t.type === "Income") totalIncome += Number(t.amount || 0);
                else totalExpense += Number(t.amount || 0);
            });
            const balance = totalIncome - totalExpense;

            return `💰 **Thông tin Quỹ CLB**:
- Số dư quỹ hiện tại: **${balance.toLocaleString('vi-VN')} VNĐ**
- Đợt thu gần nhất: **${period ? period.title : 'N/A'}** (${period ? period.amountPerMember.toLocaleString('vi-VN') + 'đ/người' : ''})
- Bạn có thể chuyển đến trang **Quản lý Quỹ CLB** để xem biên lai và nộp tiền quỹ.`;
        }

        // Query: Info / Rules
        if (p.includes("clb") || p.includes("giới thiệu") || p.includes("quy định") || p.includes("slogan")) {
            return `🏛️ **Giới thiệu ${ctx.settings.clubName || 'CLB Sinh viên'}**:
- 💡 Slogan: *"${ctx.settings.slogan || 'Code your dream, build the future'}"*
- 📧 Email: ${ctx.settings.contactEmail || 'contact@clb.vn'}
- 📞 Điện thoại: ${ctx.settings.contactPhone || '024.1234.5678'}
- Bạn có thể xem lịch sử thành lập và ảnh hoạt động tại trang **Giới thiệu CLB**.`;
        }

        // Default response
        return `🤖 **Trợ lý AI CLB**: Xin chào ${ctx.userName}! Tôi có thể giúp bạn tra cứu công việc, sự kiện sắp tới, đợt đóng quỹ hay thông tin thành viên. Bạn hãy chọn gợi ý bên trên hoặc nhập câu hỏi cụ thể nhé!`;
    },

    // AI Work Insights Function (Module 3)
    getWorkInsights: function() {
        const tasks = ClubStorage.getData("club_tasks") || [];
        const members = ClubStorage.getData("club_members") || [];
        const today = new Date();

        const overdue = tasks.filter(t => t.status !== "Completed" && new Date(t.deadline) < today);
        const nearDeadline = tasks.filter(t => {
            const d = new Date(t.deadline);
            const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
            return t.status !== "Completed" && diffDays >= 0 && diffDays <= 3;
        });

        // Find overloaded member
        const assigneeCounts = {};
        tasks.filter(t => t.status !== "Completed").forEach(t => {
            assigneeCounts[t.assigneeId] = (assigneeCounts[t.assigneeId] || 0) + 1;
        });

        let maxAssigneeId = "";
        let maxCount = 0;
        Object.keys(assigneeCounts).forEach(id => {
            if (assigneeCounts[id] > maxCount) {
                maxCount = assigneeCounts[id];
                maxAssigneeId = id;
            }
        });

        const overloadedMember = members.find(m => m.id === maxAssigneeId);

        return {
            overdueCount: overdue.length,
            nearDeadlineCount: nearDeadline.length,
            overloadedMember: overloadedMember ? `${overloadedMember.name} (${maxCount} việc)` : null,
            insights: [
                overdue.length > 0 ? `⚠️ Có ${overdue.length} công việc đã quá hạn deadline!` : "✅ Không có công việc nào bị quá hạn.",
                nearDeadline.length > 0 ? `⏰ Có ${nearDeadline.length} công việc sắp đến hạn trong 3 ngày tới.` : "✨ Tất cả công việc đang trong thời gian an toàn.",
                overloadedMember && maxCount >= 3 ? `👤 Thành viên ${overloadedMember.name} đang đảm nhận ${maxCount} nhiệm vụ (Nên cân bằng lại phân công).` : "⚖️ Phân bổ công việc giữa các thành viên khá cân bằng."
            ]
        };
    },

    // AI Member Insights Function (Module 4)
    getMemberInsights: function(memberId) {
        const members = ClubStorage.getData("club_members") || [];
        const tasks = ClubStorage.getData("club_tasks") || [];
        const member = members.find(m => m.id === memberId) || members[0];
        if (!member) return null;

        const mTasks = tasks.filter(t => t.assigneeId === member.id);
        const completed = mTasks.filter(t => t.status === "Completed");
        const completionRate = mTasks.length > 0 ? Math.round((completed.length / mTasks.length) * 100) : 100;

        let rating = "Tích cực";
        if (completionRate >= 80) rating = "Xuất sắc 🌟";
        else if (completionRate >= 60) rating = "Khá tốt 👍";
        else rating = "Cần cố gắng 📈";

        return {
            name: member.name,
            score: member.activityScore || 0,
            totalTasks: mTasks.length,
            completedTasks: completed.length,
            completionRate: completionRate,
            rating: rating,
            recommendation: completionRate >= 80 
                ? `Thành viên ${member.name} hoàn thành xuất sắc các nhiệm vụ được giao. Đề xuất xét khen thưởng hoặc cất nhắc vị trí Trưởng/Phó ban.` 
                : `Thành viên ${member.name} có ${mTasks.length - completed.length} nhiệm vụ chưa hoàn thành. Trưởng ban nên hỗ trợ theo sát tiến độ.`
        };
    },

    // AI Content Generator (Module 5)
    generateContent: async function(contentType, topicPrompt) {
        const apiKey = this.getApiKey();
        const promptText = `Hãy viết một bài content dạng "${contentType}" cho CLB CNTT về chủ đề: "${topicPrompt}".
Yêu cầu: Viết hấp dẫn, đúng phong cách sinh viên trẻ trung, có icon emoji, có hashtag.`;

        if (apiKey) {
            try {
                const res = await this.callGemini(promptText, this.buildContext(), apiKey);
                if (res) return res;
            } catch (e) {}
        }

        // Smart fallback content templates
        if (contentType.includes("Facebook") || contentType.includes("Bài viết")) {
            return `🔥 [HOT NEWS] ${topicPrompt.toUpperCase()} 🔥

Các bạn thành viên CLB CNTT ơi! 🚀

${topicPrompt} chính thức đổ bộ rồi đây! Đừng bỏ lỡ cơ hội bùng nổ năng lượng và trải nghiệm tuyệt vời cùng gia đình CLB chúng mình nhé!

📍 Thời gian & Địa điểm: Cập nhật tại hệ thống quản lý CLB.
👉 Đăng ký tham gia ngay hôm nay!

#DevClub #CLB_CNTT #SinhVienIT #${topicPrompt.replace(/\s+/g, '_')}`;
        }

        return `📢 [THÔNG BÁO] ${topicPrompt.toUpperCase()}

Thân gửi toàn thể các bạn thành viên CLB,

${topicPrompt}.
Rất mong các bạn theo dõi và thực hiện đúng tiến độ được giao.

Trân trọng,
Ban Chủ Nhiệm CLB.`;
    }
};
