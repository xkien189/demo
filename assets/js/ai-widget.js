/**
 * AI Floating Chatbot Widget UI Module
 * Injected globally into all pages
 */
(function() {
    // Prevent duplicate initialization
    if (document.getElementById("ai-widget-floating-btn")) return;

    // Inject Widget HTML & Styles
    document.addEventListener("DOMContentLoaded", () => {
        injectAIWidgetUI();
    });

    if (document.readyState === "complete" || document.readyState === "interactive") {
        injectAIWidgetUI();
    }

    function injectAIWidgetUI() {
        if (document.getElementById("ai-widget-floating-btn")) return;

        const styles = `
            #ai-widget-floating-btn {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 1050;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #2563eb, #7c3aed);
                color: #fff;
                border: none;
                box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.6rem;
                cursor: pointer;
                transition: transform 0.25s, box-shadow 0.25s;
            }
            #ai-widget-floating-btn:hover {
                transform: scale(1.08) rotate(8deg);
                box-shadow: 0 12px 30px rgba(124, 58, 237, 0.5);
            }
            #ai-chat-window {
                position: fixed;
                bottom: 90px;
                right: 24px;
                z-index: 1050;
                width: 380px;
                max-width: calc(100vw - 32px);
                height: 520px;
                max-height: calc(100vh - 120px);
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 20px;
                box-shadow: var(--card-shadow-lg);
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: aiSlideUp 0.3s ease-out;
            }
            @keyframes aiSlideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .ai-chat-header {
                background: linear-gradient(135deg, #0f172a, #1e3a5f);
                color: #fff;
                padding: 1rem 1.25rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .ai-chat-body {
                flex: 1;
                padding: 1rem;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
            }
            .ai-msg-bubble {
                max-width: 85%;
                padding: 0.75rem 1rem;
                border-radius: 14px;
                font-size: 0.9rem;
                line-height: 1.45;
                white-space: pre-line;
            }
            .ai-msg-user {
                align-self: flex-end;
                background: var(--primary);
                color: #fff;
                border-bottom-right-radius: 4px;
            }
            .ai-msg-assistant {
                align-self: flex-start;
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-bottom-left-radius: 4px;
            }
            .ai-quick-pills {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
                margin-top: 0.5rem;
            }
            .ai-pill-btn {
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
                border-radius: 20px;
                padding: 0.3rem 0.75rem;
                font-size: 0.75rem;
                cursor: pointer;
                transition: background 0.2s;
            }
            .ai-pill-btn:hover {
                background: var(--primary);
                color: #fff;
            }
            .ai-chat-footer {
                padding: 0.75rem;
                border-top: 1px solid var(--border-color);
                background: var(--bg-secondary);
                display: flex;
                gap: 0.5rem;
            }
        `;

        const styleTag = document.createElement("style");
        styleTag.innerHTML = styles;
        document.head.appendChild(styleTag);

        // Widget HTML
        const widgetHtml = `
            <button id="ai-widget-floating-btn" title="Mở Trợ lý AI CLB">
                🤖
            </button>

            <div id="ai-chat-window">
                <div class="ai-chat-header">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fs-4">🤖</span>
                        <div>
                            <div class="fw-bold small">Trợ lý AI CLB</div>
                            <div class="text-white-50" style="font-size:0.7rem;">Trả lời tự nhiên từ dữ liệu thật</div>
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-link text-white-50 p-0 me-2" onclick="clearAIChatHistory()" title="Xóa lịch sử chat"><i class="bi bi-trash"></i></button>
                        <button class="btn btn-sm btn-link text-white me-1 p-0" onclick="toggleAIChatWindow()"><i class="bi bi-x-lg fs-6"></i></button>
                    </div>
                </div>

                <div class="ai-chat-body" id="ai-chat-messages">
                    <div class="ai-msg-bubble ai-msg-assistant">
                        Xin chào! Tôi là **Trợ lý AI Thông minh của CLB CNTT UHL**. 🤖
                        
                        Bạn có thể hỏi tôi **bất kỳ câu hỏi tự nhiên nào** (ví dụ: *lộ trình học lập trình, chọn ban bộ phận, tiến độ công việc, deadline, quỹ CLB...*):
                        
                        <div class="ai-quick-pills">
                            <button class="ai-pill-btn" onclick="sendQuickPrompt('Học Python từ đâu?')">🐍 Lộ trình Python</button>
                            <button class="ai-pill-btn" onclick="sendQuickPrompt('Nên chọn ban bộ phận nào?')">🏛️ Định hướng Ban</button>
                            <button class="ai-pill-btn" onclick="sendQuickPrompt('Công việc của tôi')">📋 Công việc của tôi</button>
                            <button class="ai-pill-btn" onclick="sendQuickPrompt('Deadline sắp tới')">⏳ Deadline sắp tới</button>
                        </div>
                    </div>
                </div>

                <div class="ai-chat-footer">
                    <input type="text" id="ai-chat-input" class="form-control form-control-sm" placeholder="Hỏi AI bất kỳ điều gì (lập trình, công việc...)..." autocomplete="off">
                    <button class="btn btn-primary btn-sm px-3" onclick="submitAIChat()"><i class="bi bi-send-fill"></i></button>
                </div>
            </div>
        `;

        const div = document.createElement("div");
        div.innerHTML = widgetHtml;
        document.body.appendChild(div);

        // Bind events — use arrow wrapper so functions are resolved at call-time (not definition-time)
        document.getElementById("ai-widget-floating-btn").addEventListener("click", () => window.toggleAIChatWindow());
        document.getElementById("ai-chat-input").addEventListener("keypress", (e) => {
            if (e.key === "Enter") window.submitAIChat();
        });

        // Load chat history
        loadAIChatHistory();
    }

    window.toggleAIChatWindow = function() {
        const win = document.getElementById("ai-chat-window");
        if (!win) return;
        const isHidden = win.style.display === "none" || !win.style.display;
        win.style.display = isHidden ? "flex" : "none";
        if (isHidden) {
            document.getElementById("ai-chat-input").focus();
        }
    };

    window.sendQuickPrompt = function(promptText) {
        document.getElementById("ai-chat-input").value = promptText;
        submitAIChat();
    };

    window.submitAIChat = async function() {
        const input = document.getElementById("ai-chat-input");
        const prompt = input.value.trim();
        if (!prompt) return;

        appendAIMessage(prompt, "user");
        input.value = "";

        // Typing indicator
        const typingId = appendTypingIndicator();

        try {
            const response = await AIService.query(prompt);
            removeTypingIndicator(typingId);
            appendAIMessage(response, "assistant");
            saveAIChatHistory();
        } catch (err) {
            removeTypingIndicator(typingId);
            appendAIMessage("⚠️ Trợ lý AI đang suy nghĩ... Hãy thử lại câu hỏi nhé!", "assistant");
        }
    };

    function appendAIMessage(text, sender) {
        const container = document.getElementById("ai-chat-messages");
        if (!container) return;

        const bubble = document.createElement("div");
        bubble.className = `ai-msg-bubble ai-msg-${sender}`;
        
        // Rich markdown formatting for bold, italic, code, bullets, links
        let formatted = text
            .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.15);padding:8px;border-radius:6px;font-size:0.8rem;overflow-x:auto;"><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.1);padding:2px 5px;border-radius:4px;">$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
        
        bubble.innerHTML = formatted;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    }

    function appendTypingIndicator() {
        const container = document.getElementById("ai-chat-messages");
        const id = "typing-" + Date.now();
        const bubble = document.createElement("div");
        bubble.id = id;
        bubble.className = "ai-msg-bubble ai-msg-assistant text-muted";
        bubble.innerHTML = `<span class="spinner-grow spinner-grow-sm me-1"></span> AI đang phân tích dữ liệu...`;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function saveAIChatHistory() {
        const container = document.getElementById("ai-chat-messages");
        if (container) {
            sessionStorage.setItem("club_ai_chat_html", container.innerHTML);
        }
    }

    function loadAIChatHistory() {
        const saved = sessionStorage.getItem("club_ai_chat_html");
        if (saved) {
            const container = document.getElementById("ai-chat-messages");
            if (container) container.innerHTML = saved;
        }
    }

    window.clearAIChatHistory = function() {
        sessionStorage.removeItem("club_ai_chat_html");
        const container = document.getElementById("ai-chat-messages");
        if (container) {
            container.innerHTML = `
                <div class="ai-msg-bubble ai-msg-assistant">
                    Đã xóa lịch sử hội thoại. Tôi có thể giúp gì cho bạn?
                    <div class="ai-quick-pills">
                        <button class="ai-pill-btn" onclick="sendQuickPrompt('Công việc của tôi')">📋 Công việc của tôi</button>
                        <button class="ai-pill-btn" onclick="sendQuickPrompt('Deadline sắp tới')">⏳ Deadline sắp tới</button>
                        <button class="ai-pill-btn" onclick="sendQuickPrompt('Sự kiện sắp tới')">🎉 Sự kiện sắp tới</button>
                        <button class="ai-pill-btn" onclick="sendQuickPrompt('Tình hình Quỹ CLB')">💰 Quỹ CLB</button>
                    </div>
                </div>`;
        }
    };
})();
