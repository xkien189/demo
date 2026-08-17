/**
 * AI Service Module - Core Abstraction Layer for Club Management System
 * Supports Google Gemini API (Free Tier) & Advanced Natural Language Smart Engine
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
            userName: currentMember ? currentMember.name : (user ? user.username : "Thành viên"),
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

    // Main AI Query method (Natural Chatbot)
    query: async function(userPrompt) {
        const apiKey = this.getApiKey().trim();
        const context = this.buildContext();

        // 1. If API Key is configured, call Google Gemini API
        if (apiKey) {
            try {
                const response = await this.callGemini(userPrompt, context, apiKey);
                if (response) return response;
            } catch (err) {
                console.warn("Gemini API call failed, falling back to Smart Engine:", err.message);
            }
        }

        // 2. Advanced Natural Language Smart Engine (Works 100% Free & Flexible)
        return this.generateSmartResponse(userPrompt, context);
    },

    // Gemini API Call with full natural conversational system prompt
    callGemini: async function(userPrompt, context, apiKey) {
        const models = [
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-pro"
        ];

        const systemPrompt = `Bạn là Trợ lý AI Thông minh chuyên nghiệp, thân thiện và linh hoạt của ${context.settings.clubName || 'CLB CNTT UHL'}.
Nhiệm vụ của bạn:
- Trả lời TỰ NHIÊN, THÔNG MINH, TRỰC TIẾP và LINH HOẠT cho BẤT KỲ CÂU HỎI NÀO của người dùng (từ trò chuyện giao tiếp, tư vấn học tập, định hướng ngành CNTT, lập trình, đến thông tin và dữ liệu quản lý CLB).
- KHÔNG gò bó trong các mẫu trả lời sẵn. Hãy suy nghĩ và trả lời linh hoạt như một người bạn / cố vấn nhiệt tình.
- Người đang trò chuyện với bạn: ${context.userName} (Vai trò: ${context.role}, Ban: ${context.userDept}).

DỮ LIỆU CLB THỰC TẾ (Nếu câu hỏi liên quan đến CLB thì hãy dùng dữ liệu này):
- Tên CLB: ${context.settings.clubName || 'CLB CNTT UHL'}
- Slogan: "${context.settings.slogan || 'Code your dream, build the future'}"
- Số lượng công việc người này được xem: ${context.tasks.length} / Tổng CLB: ${context.allTasksCount}
- Chi tiết công việc: ${JSON.stringify(context.tasks.map(t => ({ tiêu_đề: t.title, ban: t.department, hạn: t.deadline, tiến_độ: t.progress, trạng_thái: t.status, ưu_tiên: t.priority })))}
- Danh sách sự kiện: ${JSON.stringify(context.events.map(e => ({ tên: e.title, ngày: e.date, địa_điểm: e.location })))}
- Tổng số thành viên CLB: ${context.totalMembersCount}
- Danh sách 5 Ban bộ phận: Ban Chuyên môn, Ban Truyền thông, Ban Đối ngoại, Ban Sự kiện, Ban Tài chính.

Hãy trả lời bằng tiếng Việt ngắn gọn, hấp dẫn, dễ hiểu, dùng biểu tượng emoji thích hợp.`;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: systemPrompt + "\n\nCÂU HỎI CỦA NGƯỜI DÙNG: " + userPrompt }
                    ]
                }
            ]
        };

        let lastError = "";

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                        return data.candidates[0].content.parts[0].text;
                    }
                } else {
                    const errData = await res.json().catch(() => ({}));
                    lastError = (errData.error && errData.error.message) ? errData.error.message : ("HTTP " + res.status);
                }
            } catch (e) {
                lastError = e.message;
            }
        }

        throw new Error(lastError || "Tất cả các model Gemini đều báo lỗi");
    },

    // Advanced Natural Language Smart Engine (Natural & Dynamic Response)
    generateSmartResponse: function(prompt, ctx) {
        const p = prompt.toLowerCase().trim();

        // 1. Greetings & Introductions
        if (/^(chào|xin chào|hi|hello|hey|chào bạn|chào ai|giao lưu)/.test(p)) {
            return `👋 **Xin chào ${ctx.userName}!**
Tôi là **Trợ lý AI Thông minh của ${ctx.settings.clubName || 'CLB CNTT UHL'}**. 🤖

Tôi có thể trò chuyện tự nhiên và hỗ trợ bạn bất kỳ điều gì:
• 💻 Tư vấn lập trình & học tập CNTT
• 📋 Tra cứu tiến độ công việc & deadline
• 🎉 Thông tin sự kiện, lịch sinh hoạt
• 💰 Kiểm tra đợt nộp quỹ & tình hình tài chính
• 🤝 Định hướng sinh hoạt các Ban bộ phận

Bạn muốn thảo luận hay trao đổi về chủ đề gì hôm nay?`;
        }

        // 2. Questions about the AI assistant identity / capabilities
        if (p.includes("bạn là ai") || p.includes("tên là gì") || p.includes("làm được gì") || p.includes("giúp gì")) {
            return `🤖 **Tôi là Trợ lý AI số hoá của ${ctx.settings.clubName || 'CLB CNTT UHL'}**!
Tôi được tích hợp trí tuệ nhân tạo để trả lời linh hoạt các câu hỏi của bạn:

1. **Hỏi đáp tự nhiên**: Giải đáp kiến thức lập trình, định hướng ngành CNTT, kinh nghiệm học tập.
2. **Quản lý CLB**: Tra cứu công việc được giao, tiến độ, deadline, danh sách sự kiện và số dư quỹ CLB.
3. **Sáng tạo nội dung**: Hỗ trợ viết bài viết truyền thông, thông báo hay ý tưởng sự kiện.

Hãy nhập bất kỳ câu hỏi nào bạn đang thắc mắc nhé!`;
        }

        // 3. Programming / IT / Career Advice
        if (p.includes("lập trình") || p.includes("python") || p.includes("javascript") || p.includes("web") || p.includes("html") || p.includes("c++") || p.includes("cntt") || p.includes("backend") || p.includes("frontend") || p.includes("định hướng") || p.includes("học gì")) {
            if (p.includes("python")) {
                return `🐍 **Lộ trình học Python hiệu quả cho Sinh viên**:
1. **Cơ bản**: Biến, kiểu dữ liệu, vòng lặp, hàm, Module (1-2 tuần).
2. **Cấu trúc dữ liệu**: List, Dict, Set, Tuple & Lập trình hướng đối tượng (OOP).
3. **Định hướng chuyên sâu**:
   - Web Dev: Học Framework *Django* hoặc *FastAPI*.
   - Data / AI: Học *Pandas, NumPy, Scikit-Learn, PyTorch*.
💡 *Mẹo*: Hãy tham gia các buổi Workshop của **Ban Chuyên môn** để được các anh chị thực hành dự án thực tế nhé!`;
            }

            if (p.includes("web") || p.includes("javascript") || p.includes("html")) {
                return `🌐 **Lộ trình Lập trình Web từ Zero đến Hero**:
1. **Frontend Foundation**: HTML5, CSS3 (Flexbox/Grid), JavaScript ES6+.
2. **Framework**: React.js hoặc Vue.js để làm giao diện hiện đại.
3. **Backend**: Node.js (Express) hoặc Python (FastAPI/Django) + Database (MongoDB / PostgreSQL).
🚀 **Dự án CLB**: Hệ thống quản lý CLB bạn đang sử dụng chính là sản phẩm Web App thực tế đó!`;
            }

            return `💻 **Tư vấn Định hướng Ngành Công nghệ Thông tin**:
- **Lập trình Web/Mobile**: Phù hợp nếu bạn thích tạo sản phẩm trực quan, giao diện người dùng.
- **AI & Data Science**: Phù hợp nếu bạn thích toán, thuật toán và phân tích dữ liệu.
- **An toàn thông tin / Cyber Security**: Phù hợp nếu bạn đam mê mạng và bảo mật.

👉 Bạn có thể nhắn với **Ban Chuyên môn** của CLB để được xếp mentor 1-1 hỗ trợ lộ trình phù hợp!`;
        }

        // 4. Club Departments & Joining Advice
        if (p.includes("ban truyền thông") || p.includes("ban chuyên môn") || p.includes("ban đối ngoại") || p.includes("ban sự kiện") || p.includes("ban tài chính") || p.includes("tham gia ban") || p.includes("chọn ban nào")) {
            return `🏛️ **Cơ cấu 5 Ban Bộ Phận của ${ctx.settings.clubName || 'CLB CNTT UHL'}**:
1. 💻 **Ban Chuyên môn**: Nghiên cứu thuật toán, làm dự án phần mềm, đào tạo lập trình.
2. 📢 **Ban Truyền thông**: Viết bài fanpage, thiết kế poster Canva/Photoshop, dựng video TikTok.
3. 🤝 **Ban Đối ngoại**: Xin tài trợ doanh nghiệp, kết nối đối tác & diễn giả.
4. 🎉 **Ban Sự kiện**: Lên kịch bản, chạy Teambuilding, Hackathon, Workshop.
5. 💰 **Ban Tài chính**: Thủ quỹ, lập dự toán chi tiêu, quản lý sổ thu chi.

👉 Bạn cảm thấy thế mạnh của mình phù hợp nhất với Ban nào?`;
        }

        // 5. Query Tasks / Work / Deadline
        if (p.includes("công việc") || p.includes("task") || p.includes("nhiệm vụ") || p.includes("deadline") || p.includes("hạn") || p.includes("chưa xong")) {
            const overdue = ctx.tasks.filter(t => t.status !== "Completed" && new Date(t.deadline) < new Date());
            const inProgress = ctx.tasks.filter(t => t.status === "In Progress");
            const upcoming = [...ctx.tasks].filter(t => t.status !== "Completed").sort((a,b) => new Date(a.deadline) - new Date(b.deadline));

            let res = `📋 **Báo cáo Công việc của ${ctx.userName}** (${ctx.userDept}):
- Bạn hiện có **${ctx.tasks.length}** nhiệm vụ được phân công.
- Đang thực hiện: **${inProgress.length}** task.
- Đã quá hạn: **${overdue.length}** task.`;

            if (upcoming.length > 0) {
                res += `\n\n⏰ **Công việc gần hạn nhất**:
📌 *${upcoming[0].title}*
- Hạn nộp: **${ClubUtils.formatDateOnly(upcoming[0].deadline)}**
- Tiến độ: **${upcoming[0].progress}%** (${upcoming[0].status})`;
            } else {
                res += `\n\n🎉 Hiện tại bạn không có nhiệm vụ nào tồn đọng. Xuất sắc!`;
            }

            return res;
        }

        // 6. Query Events
        if (p.includes("sự kiện") || p.includes("event") || p.includes("workshop") || p.includes("lịch sinh hoạt")) {
            if (ctx.events.length === 0) return "📅 Hiện chưa có sự kiện mới được tạo trong hệ thống.";
            const nextEv = ctx.events[0];
            return `🎉 **Sự kiện nổi bật sắp tới của CLB**:
📌 **${nextEv.title}**
- 📍 **Địa điểm**: ${nextEv.location}
- 📅 **Thời gian**: ${ClubUtils.formatDateOnly(nextEv.date)}
- 📝 **Mô tả**: ${nextEv.description || 'Chưa có mô tả'}
- 👥 **Đã đăng ký**: ${nextEv.attendeesCount || 0} người.`;
        }

        // 7. Query Club Fund
        if (p.includes("quỹ") || p.includes("tiền") || p.includes("nộp") || p.includes("thu chi") || p.includes("số dư")) {
            let totalIncome = 0, totalExpense = 0;
            ctx.fundTransactions.forEach(t => {
                if (t.type === "Income") totalIncome += Number(t.amount || 0);
                else if (t.type === "Expense") totalExpense += Number(t.amount || 0);
            });
            const balance = totalIncome - totalExpense;
            const period = ctx.fundPeriods[0];

            return `💰 **Tình hình Quỹ ${ctx.settings.clubName || 'CLB CNTT UHL'}**:
- 💵 **Số dư quỹ hiện tại**: **${balance.toLocaleString('vi-VN')} VNĐ**
- 📌 **Kỳ thu quỹ gần nhất**: ${period ? period.title : 'Chưa mở'} (${period ? period.amountPerMember.toLocaleString('vi-VN') + 'đ/người' : ''})
👉 Bạn có thể vào mục **Quản lý Quỹ CLB** trên menu để kiểm tra trạng thái đóng quỹ và tải lên minh chứng chuyển khoản.`;
        }

        // 8. Query Members & Leaders
        if (p.includes("thành viên") || p.includes("chủ nhiệm") || p.includes("trưởng ban") || p.includes("bao nhiêu người")) {
            return `👥 **Thông tin Nhân sự ${ctx.settings.clubName || 'CLB CNTT UHL'}**:
- Tổng số thành viên chính thức: **${ctx.totalMembersCount}** người.
- Trong phạm vi theo dõi của bạn: **${ctx.members.length}** thành viên.
- Ban Chủ nhiệm: Nguyễn Văn An (Chủ nhiệm), Trần Thị Bình (Phó Chủ nhiệm).`;
        }

        // 9. Casual Chit-Chat & Natural Q&A Fallback
        if (p.includes("khỏe không") || p.includes("vui") || p.includes("cảm ơn") || p.includes("thời tiết") || p.includes("tâm sự") || p.includes("chơi")) {
            if (p.includes("cảm ơn") || p.includes("thank")) {
                return `😊 Rất vui được hỗ trợ bạn, ${ctx.userName}! Chúc bạn một ngày làm việc và học tập thật năng nổ cùng CLB nhé! 🔥`;
            }
            return `✨ Tôi luôn sẵn sàng 24/7 để hỗ trợ bạn! Bạn cần hỏi về kinh nghiệm học tập, định hướng ngành CNTT hay tra cứu thông tin CLB cứ nhắn cho tôi nhé! 🚀`;
        }

        // 10. Generative Natural Fallback for ANY unknown question
        return `🤖 **Trợ lý AI**: Tôi đã ghi nhận thắc mắc **"${prompt}"** của bạn!

💡 **Gợi ý nhanh**:
- Để hỏi đáp tự nhiên 100% bằng trí tuệ nhân tạo nâng cao, bạn có thể kiểm tra lại **API Key Gemini** dạng \`AIzaSy...\` tại trang *Cài đặt hệ thống*.
- Bạn cũng có thể hỏi tôi về các chủ đề: *lập trình Python/Web, định hướng CNTT, công việc cá nhân, deadline, sự kiện sắp tới, quỹ CLB hay các Ban bộ phận!*`;
    },

    // AI Work Insights Function
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

    // AI Member Insights Function
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

    // AI Content Generator
    generateContent: async function(contentType, topicPrompt) {
        const apiKey = this.getApiKey();
        const promptText = `Hãy viết một bài content dạng "${contentType}" cho CLB CNTT UHL về chủ đề: "${topicPrompt}".
Yêu cầu: Viết hấp dẫn, đúng phong cách sinh viên trẻ trung, có icon emoji, có hashtag.`;

        if (apiKey) {
            try {
                const res = await this.callGemini(promptText, this.buildContext(), apiKey);
                if (res) return res;
            } catch (e) {}
        }

        if (contentType.includes("Facebook") || contentType.includes("Bài viết")) {
            return `🔥 [HOT NEWS] ${topicPrompt.toUpperCase()} 🔥

Các bạn thành viên CLB CNTT UHL ơi! 🚀

${topicPrompt} chính thức đổ bộ rồi đây! Đừng bỏ lỡ cơ hội bùng nổ năng lượng và trải nghiệm tuyệt vời cùng gia đình CLB chúng mình nhé!

📍 Thời gian & Địa điểm: Cập nhật tại hệ thống quản lý CLB.
👉 Đăng ký tham gia ngay hôm nay!

#CLB_CNTT_UHL #SinhVienIT #${topicPrompt.replace(/\s+/g, '_')}`;
        }

        return `📢 [THÔNG BÁO] ${topicPrompt.toUpperCase()}

Thân gửi toàn thể các bạn thành viên CLB CNTT UHL,

${topicPrompt}.
Rất mong các bạn theo dõi và thực hiện đúng tiến độ được giao.

Trân trọng,
Ban Chủ Nhiệm CLB.`;
    }
};
