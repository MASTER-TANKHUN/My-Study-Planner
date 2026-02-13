// ========== AI Study Assistant - ai.js ==========
// Uses local Ollama server via backend proxy at localhost:3000

// const AI_SERVER_URL = "http://localhost:3000"; // ใช้เมื่อรันบนเครื่องตัวเอง
const AI_SERVER_URL = "https://fine-months-shave.loca.lt"; // ใช้เมื่อขึ้น Vercel (ต้องรัน npx localtunnel --port 3000 ทุกครั้งและนำ URL มาใส่)
const RETRY_INTERVAL = 3000; // ms between retries when busy

// ---------- Theme ----------
const themeToggle = document.getElementById('themeToggle');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

let nightModeStorage = 'false';

if (nightModeStorage === 'true' || (!nightModeStorage && prefersDark)) {
    document.body.classList.add('night');
}

// ---------- State ----------
let currentUser = null;
let tasks = [];
let conversationHistory = [];

// ---------- DOM ----------
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const quickActions = document.getElementById('quickActions');

// ---------- Firebase Auth ----------
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        const loadingScreen = document.getElementById('loadingScreen');

        if (user) {
            currentUser = user;
            if (loadingScreen) loadingScreen.style.display = "flex";

            try {
                await loadUserData(user.uid);
                showWelcomeMessage();
            } catch (error) {
                console.error('Error loading user data:', error);
            } finally {
                if (loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    loadingScreen.style.transition = 'opacity 0.5s ease-out';
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }
            }
        } else {
            if (loadingScreen) loadingScreen.style.display = "none";
            showLoginRequired();
        }
    });
}

function showLoginRequired() {
    const loginPopup = document.getElementById('loginPopup');
    const loginPopupBtn = document.getElementById('loginPopupBtn');

    if (loginPopup) {
        const mainEl = document.querySelector('main');
        const footerEl = document.querySelector('footer');
        const navEl = document.querySelector('nav');

        if (mainEl) mainEl.classList.add('blur');
        if (footerEl) footerEl.classList.add('blur');
        if (navEl) navEl.classList.add('blur');

        loginPopup.style.display = "flex";

        if (loginPopupBtn) {
            loginPopupBtn.onclick = function () {
                window.location.href = "../../login/Login.html";
            };
        }
    } else {
        window.location.href = "../../login/Login.html";
    }
}

async function loadUserData(uid) {
    if (typeof db === 'undefined') return;

    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
        const userData = doc.data();

        // Apply theme
        if (userData.theme === "dark") {
            document.body.classList.add("night");
            nightModeStorage = 'true';
        } else {
            document.body.classList.remove("night");
            nightModeStorage = 'false';
        }

        // Update nav
        const userNameNav = document.getElementById('userNameNav');
        if (userNameNav) userNameNav.textContent = userData.displayName || userData.name || userData.email || '';

        const profilePic = document.getElementById('userProfilePicNav');
        if (profilePic) {
            let photoURL = userData.photoURL || currentUser.photoURL || "https://cdn-icons-png.flaticon.com/512/456/456212.png";
            profilePic.src = photoURL;
        }

        tasks = userData.tasks || [];

        // Initialize system prompt with task context
        initConversation();
    }
}

// ---------- Build System Prompt ----------
function buildSystemPrompt() {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    // Find overdue & upcoming
    const overdue = pendingTasks.filter(t => new Date(t.dueDate) < today);
    const dueToday = pendingTasks.filter(t => {
        const d = new Date(t.dueDate);
        return d.toDateString() === today.toDateString();
    });
    const upcoming = pendingTasks.filter(t => {
        const d = new Date(t.dueDate);
        const diff = (d - today) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 3;
    });

    let taskSummary = '';
    if (pendingTasks.length === 0) {
        taskSummary = 'User has no pending tasks 🎉';
    } else {
        taskSummary = pendingTasks.map(t =>
            `- "${t.title}" | Subject: ${t.subject} | Due: ${t.dueDate} | Priority: ${t.priority}${t.description ? ' | Note: ' + t.description : ''}`
        ).join('\n');
    }

    let completedSummary = '';
    if (completedTasks.length > 0) {
        completedSummary = completedTasks.map(t =>
            `- "${t.title}" | Subject: ${t.subject} | Due: ${t.dueDate}`
        ).join('\n');
    }

    return `You are "StudyBot", a personal study assistant for the StudyPlanner app.
You have access to the user's real task data. Always respond in the SAME LANGUAGE the user uses (auto-detect: Thai or English).

📅 Today is: ${todayStr}

📊 Stats:
- Total tasks: ${totalTasks}
- Completed: ${completedTasks.length}
- Pending: ${pendingTasks.length}
- Completion Rate: ${completionRate}%
${overdue.length > 0 ? `- ⚠️ Overdue: ${overdue.length} tasks` : ''}
${dueToday.length > 0 ? `- 🔴 Due today: ${dueToday.length} tasks` : ''}
${upcoming.length > 0 ? `- 🟡 Due soon (1-3 days): ${upcoming.length} tasks` : ''}

📝 Pending tasks:
${taskSummary}

${completedTasks.length > 0 ? `✅ Completed tasks:\n${completedSummary}` : ''}

Guidelines:
1. Keep answers concise, use emojis appropriately
2. Reference real task data when answering about tasks
3. Give actionable, practical advice
4. Gently remind about overdue tasks
5. Be encouraging, not pressuring
6. For study tips, tailor to the user's actual subjects
7. Never fabricate tasks that don't exist in the list
8. Use /no_think mode for faster responses`;
}

function initConversation() {
    conversationHistory = [
        { role: "system", content: buildSystemPrompt() }
    ];
}

// ---------- Welcome Message ----------
function showWelcomeMessage() {
    if (!chatMessages) return;

    const pendingTasks = tasks.filter(t => !t.completed);
    const today = new Date();
    const overdue = pendingTasks.filter(t => new Date(t.dueDate) < today);

    let greeting = 'สวัสดี! 👋 ฉันคือ StudyBot ผู้ช่วยการเรียนของคุณ';
    let sub = 'ถามฉันได้เลยเกี่ยวกับ task, ขอคำแนะนำ, หรือทริคการเรียน!';

    if (overdue.length > 0) {
        sub += `\n\n⚠️ คุณมี ${overdue.length} task ที่เลยกำหนดแล้วนะ — ลองถามฉันว่าจะจัดการยังไงดี!`;
    } else if (pendingTasks.length === 0) {
        sub = 'ตอนนี้ยังไม่มี task เลย ลองเพิ่ม task ในหน้า Home แล้วกลับมาคุยกับฉันนะ! 🎉';
    }

    chatMessages.innerHTML = `
        <div class="welcome-container">
            <div class="welcome-icon"><i class="fas fa-robot"></i></div>
            <h2>${greeting}</h2>
            <p>${sub}</p>
        </div>
    `;
}

// ---------- Chat Functions ----------
function appendMessage(role, text) {
    // Remove welcome container if present
    const welcome = chatMessages.querySelector('.welcome-container');
    if (welcome) welcome.remove();

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const avatarIcon = role === 'ai' ? 'fa-robot' : 'fa-user';

    // Simple markdown-like formatting for AI messages
    let formattedText = text;
    if (role === 'ai') {
        formattedText = formatAIResponse(text);
    } else {
        formattedText = escapeHtml(text);
    }

    msgDiv.innerHTML = `
        <div class="message-avatar"><i class="fas ${avatarIcon}"></i></div>
        <div>
            <div class="message-bubble">${formattedText}</div>
            <div class="message-time">${timeStr}</div>
        </div>
    `;

    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

function formatAIResponse(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);

    // Bold: **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Inline code: `code`
    formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Bullet points
    formatted = formatted.replace(/^- (.+)/gm, '• $1');

    return formatted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="typing-bubble">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

function showQueueMessage() {
    // Remove existing queue message if any
    removeQueueMessage();

    const queueDiv = document.createElement('div');
    queueDiv.className = 'message ai';
    queueDiv.id = 'queueMessage';
    queueDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div>
            <div class="message-bubble" style="color: #f59e0b;">
                <i class="fas fa-hourglass-half"></i> <strong>StudyBot is busy</strong> helping another user right now.<br>
                Please wait — your message will be sent automatically when it's your turn...
                <div class="typing-bubble" style="margin-top: 8px; display: inline-flex; padding: 6px 12px; border: none; background: transparent;">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(queueDiv);
    scrollToBottom();
}

function removeQueueMessage() {
    const el = document.getElementById('queueMessage');
    if (el) el.remove();
}

function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function showError(message) {
    const errDiv = document.createElement('div');
    errDiv.className = 'error-banner';
    errDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${escapeHtml(message)}</span>`;
    chatMessages.appendChild(errDiv);
    scrollToBottom();
}

// ---------- Ollama API via Backend ----------
async function sendToAI(userMessage) {
    // Add user message to history
    conversationHistory.push({ role: "user", content: userMessage });

    // Keep conversation manageable (system + last 20 messages)
    if (conversationHistory.length > 21) {
        conversationHistory = [
            conversationHistory[0], // system prompt
            ...conversationHistory.slice(-20)
        ];
    }

    // Try sending, with auto-retry when queue is busy
    const maxRetries = 60; // 60 * 3s = 3 minutes max wait
    let retryCount = 0;
    let queueShown = false;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(`${AI_SERVER_URL}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Bypass-Tunnel-Reminder": "true"
                },
                body: JSON.stringify({ messages: conversationHistory })
            });

            // Queue is busy — wait and retry
            if (response.status === 409) {
                if (!queueShown) {
                    removeTypingIndicator();
                    showQueueMessage();
                    queueShown = true;
                }
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
                continue;
            }

            // Remove queue message if it was shown
            if (queueShown) {
                removeQueueMessage();
                showTypingIndicator();
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server Error: ${response.status}`);
            }

            const data = await response.json();
            const aiMessage = data.content;

            // Add AI response to history
            conversationHistory.push({ role: "assistant", content: aiMessage });

            return aiMessage;

        } catch (error) {
            if (error.message === 'Failed to fetch') {
                throw new Error('Cannot connect to AI server. The Host is offline.');
            }
            throw error;
        }
    }

    throw new Error('Queue timeout — the server has been busy for too long. Please try again later.');
}

// ---------- Send Handler ----------
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Disable input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Show user message
    appendMessage('user', text);

    // Show typing indicator
    showTypingIndicator();

    try {
        const aiResponse = await sendToAI(text);
        removeTypingIndicator();
        appendMessage('ai', aiResponse);
    } catch (error) {
        removeTypingIndicator();
        removeQueueMessage();
        showError(error.message);
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// ---------- Event Listeners ----------
if (sendBtn) {
    sendBtn.onclick = handleSend;
}

if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
}

// Quick action buttons
if (quickActions) {
    quickActions.addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-action-btn');
        if (!btn) return;

        const prompt = btn.dataset.prompt;
        if (prompt) {
            chatInput.value = prompt;
            handleSend();
        }
    });
}

// ---------- Theme Toggle ----------
if (themeToggle) {
    themeToggle.onclick = function () {
        document.body.classList.toggle("night");
        nightModeStorage = document.body.classList.contains("night") ? 'true' : 'false';

        const newTheme = document.body.classList.contains("night") ? "dark" : "light";
        if (currentUser && typeof db !== 'undefined') {
            db.collection("users").doc(currentUser.uid).update({
                theme: newTheme
            });
        }
    };
}

// ---------- Side Navigation ----------
const navLogo = document.getElementById('navLogo');
const sideNav = document.getElementById('sideNav');
const sideNavBackdrop = document.getElementById('sideNavBackdrop');

if (navLogo && sideNav && sideNavBackdrop) {
    navLogo.onclick = function () {
        sideNav.classList.add('open');
        sideNavBackdrop.style.display = "block";
    };
    sideNavBackdrop.onclick = function () {
        sideNav.classList.remove('open');
        sideNavBackdrop.style.display = "none";
    };
}

// Side nav links
const homeLink = document.getElementById('HomeLink');
const calendarLink = document.getElementById('CalendarLink');
const sideNavLogout = document.getElementById('sideNavLogout');

if (homeLink) {
    homeLink.onclick = () => window.location.href = '../index.html';
}
if (calendarLink) {
    calendarLink.onclick = () => window.location.href = '../calendar/calendar.html';
}
if (sideNavLogout) {
    sideNavLogout.onclick = function () {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(() => {
                window.location.href = '../../login/Login.html';
            });
        }
    };
}

// ---------- Console Warning ----------
if (window.console) {
    setTimeout(() => {
        console.log("%cSTOP!", "color: red; font-size: 40px;");
        console.log("This browser feature is for developers only. Pasting code here may let attackers steal your info.");
    }, 1000);
}
