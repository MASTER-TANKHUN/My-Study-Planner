const themeToggle = document.getElementById('themeToggle');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (localStorage.getItem('nightMode') === 'true' || (!localStorage.getItem('nightMode') && prefersDark)) {
    document.body.classList.add('night');
}

let lastTaskAdd = 0;
let lastTaskDelete = 0;
let lastThemeChange = 0;
let currentEditingTaskId = null;

const COOLDOWNS = {
    ADD_TASK: 7000,
    DELETE_TASK: 0,
    THEME_CHANGE: 2000
};

const MAX_LENGTHS = {
    TITLE: 50,
    SUBJECT: 50,
    DESCRIPTION: 500
};

function sanitizeInput(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showCooldownPopup(action, remainingTime) {
    const popup = document.createElement('div');
    popup.className = 'popup-modal';
    popup.style.display = 'flex';

    popup.innerHTML = `
        <div class="popup-modal-content">
            <div style="font-size:2.1rem; margin-bottom:10px; color:#f59e0b;">
                <i class="fas fa-clock"></i>
            </div>
            <h2 style="margin-bottom:6px">Action on Cooldown</h2>
            <div style="margin-bottom:16px; color:#666;">
                Please wait <span id="cooldownTimer">${Math.ceil(remainingTime / 1000)}</span> seconds before ${action} again.
            </div>
            <button id="cooldownPopupBtn" class="btn">OK</button>
        </div>
    `;

    document.body.appendChild(popup);

    const timer = popup.querySelector('#cooldownTimer');
    const interval = setInterval(() => {
        remainingTime -= 1000;
        if (remainingTime <= 0) {
            clearInterval(interval);
            timer.textContent = '0';
        } else {
            timer.textContent = Math.ceil(remainingTime / 1000);
        }
    }, 1000);

    popup.querySelector('#cooldownPopupBtn').onclick = () => {
        clearInterval(interval);
        document.body.removeChild(popup);
    };

    setTimeout(() => {
        if (document.body.contains(popup)) {
            clearInterval(interval);
            document.body.removeChild(popup);
        }
    }, remainingTime);
}

function showValidationError(message) {
    const popup = document.createElement('div');
    popup.className = 'popup-modal';
    popup.style.display = 'flex';

    popup.innerHTML = `
        <div class="popup-modal-content">
            <div style="font-size:2.1rem; margin-bottom:10px; color:#ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h2 style="margin-bottom:6px">Missing Information</h2>
            <div style="margin-bottom:16px; color:#666;">
                ${message}
            </div>
            <button id="validationPopupBtn" class="btn">OK</button>
        </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector('#validationPopupBtn').onclick = () => {
        document.body.removeChild(popup);
    };
}

function showLengthExceededPopup(fieldName, currentLength, maxLength) {
    const popup = document.createElement('div');
    popup.className = 'popup-modal';
    popup.style.display = 'flex';

    popup.innerHTML = `
        <div class="popup-modal-content">
            <div style="font-size:2.1rem; margin-bottom:10px; color:#f59e0b;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h2 style="margin-bottom:6px">Text Too Long</h2>
            <div style="margin-bottom:16px; color:#666;">
                ${fieldName} has <span style="color:#ef4444; font-weight:bold;">${currentLength}</span> characters<br>
                but maximum allowed is <span style="color:#10b981; font-weight:bold;">${maxLength}</span> characters<br>
                <span style="color:#ef4444;">Please reduce by ${currentLength - maxLength} characters</span>
            </div>
            <button id="lengthPopupBtn" class="btn">OK</button>
        </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector('#lengthPopupBtn').onclick = () => {
        document.body.removeChild(popup);
    };
}

function validateTextLength(text, maxLength, fieldName) {
    if (text.length > maxLength) {
        showLengthExceededPopup(fieldName, text.length, maxLength);
        return false;
    }
    return true;
}

function validateTaskForm() {
    const title = sanitizeInput(document.getElementById('taskTitle').value.trim());
    const subject = sanitizeInput(document.getElementById('taskSubject').value.trim());
    const description = document.getElementById('taskDescription') ?
        document.getElementById('taskDescription').value.trim() : '';
    const dueDate = document.getElementById('taskDue').value;
    const priority = document.getElementById('taskPriority').value;

    if (!title) {
        showValidationError('Please enter what you need to study');
        return false;
    }
    if (!subject) {
        showValidationError('Please enter the subject');
        return false;
    }
    if (!dueDate) {
        showValidationError('Please select a due date');
        return false;
    }
    if (!priority) {
        showValidationError('Please select priority level');
        return false;
    }

    if (!validateTextLength(title, MAX_LENGTHS.TITLE, 'Task title')) {
        return false;
    }
    if (!validateTextLength(subject, MAX_LENGTHS.SUBJECT, 'Subject')) {
        return false;
    }
    if (description && !validateTextLength(description, MAX_LENGTHS.DESCRIPTION, 'Description')) {
        return false;
    }

    return true;
}

function saveTasks() {
    if (currentUser && typeof db !== 'undefined') {
        const userRef = db.collection('users').doc(currentUser.uid);
        userRef.get().then(doc => {
            if (doc.exists) {
                userRef.update({ tasks: tasks });
            } else {
                userRef.set({
                    displayName: currentUser.displayName || "",
                    email: currentUser.email || "",
                    tasks: tasks,
                    theme: "light"
                });
            }
        });
    }
}

function checkCooldown(action, lastTime, cooldownDuration) {
    const now = Date.now();
    const timeSinceLastAction = now - lastTime;

    if (timeSinceLastAction < cooldownDuration) {
        const remainingTime = cooldownDuration - timeSinceLastAction;
        showCooldownPopup(action, remainingTime);
        return false;
    }
    return true;
}

if (themeToggle) {
    themeToggle.onclick = function () {
        if (!checkCooldown('changing theme', lastThemeChange, COOLDOWNS.THEME_CHANGE)) {
            return;
        }

        lastThemeChange = Date.now();
        document.body.classList.toggle("night");
        localStorage.setItem("nightMode", document.body.classList.contains("night"));

        const newTheme = document.body.classList.contains("night") ? "dark" : "light";
        if (currentUser && typeof db !== 'undefined') {
            db.collection("users").doc(currentUser.uid).update({
                theme: newTheme
            });
        }
    };
}

if (window.console) {
    setTimeout(() => {
        console.log("%cSTOP!", "color: red; font-size: 40px;");
        console.log("This browser feature is for developers only. Pasting code here may let attackers steal your info.");
    }, 1000);
}

let tasks = [];
let taskId = 1;
let currentUser = null;

const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const pendingTasksEl = document.getElementById('pendingTasks');
const completionRateEl = document.getElementById('completionRate');

const navLogo = document.getElementById('navLogo');
const sideNav = document.getElementById('sideNav');
const sideNavBackdrop = document.getElementById('sideNavBackdrop');
const userNameNav = document.getElementById('userNameNav');
const loginPopup = document.getElementById('loginPopup');
const loginPopupBtn = document.getElementById('loginPopupBtn');

const taskDetailPopup = document.getElementById('taskDetailPopup');
const closeTaskDetail = document.getElementById('closeTaskDetail');
const taskDetailForm = document.getElementById('taskDetailForm');
const cancelTaskEdit = document.getElementById('cancelTaskEdit');

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        const loadingScreen = document.getElementById('loadingScreen');

        if (user) {
            currentUser = user;
            if (loadingScreen) loadingScreen.style.display = "flex";

            try {
                await ensureUserDoc(user);
                await loadUserData(user.uid);
            } catch (error) {
                console.error('Error loading user data:', error);
                showToast('Error loading user data', 'error');
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
                        if (mainEl) mainEl.classList.remove('blur');
                        if (footerEl) footerEl.classList.remove('blur');
                        if (navEl) navEl.classList.remove('blur');
                        window.location.href = "../login/Login.html";
                    };
                }
            } else {
                window.location.href = "../login/Login.html";
            }
        }
    });
}

function updateUIWithUserData(userData) {
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = userData.displayName || userData.name || userData.email || '';
    }
}

async function ensureUserDoc(user) {
    if (typeof db !== 'undefined') {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (!doc.exists) {
                db.collection('users').doc(user.uid).set({
                    displayName: user.displayName || "",
                    email: user.email || "",
                    tasks: [],
                    theme: "light"
                });
            }
        });
    }
}

async function loadUserData(uid) {
    if (typeof db === 'undefined') return;

    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
        const userData = doc.data();

        if (userData.theme === "dark") {
            document.body.classList.add("night");
            localStorage.setItem("nightMode", true);
        } else {
            document.body.classList.remove("night");
            localStorage.setItem("nightMode", false);
        }

        if (userNameNav) userNameNav.textContent = userData.displayName || userData.name || userData.email || '';
        const profilePic = document.getElementById('userProfilePicNav');

        if (profilePic) {
            let photoURL = userData.photoURL || currentUser.photoURL ||
                "https://cdn-icons-png.flaticon.com/512/456/456212.png ";
            profilePic.src = photoURL;
        }
        tasks = userData.tasks || [];
        taskId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
        renderTasks();
        updateStats();
    } else {
        tasks = [];
        renderTasks();
        updateStats();
        if (userNameNav) userNameNav.textContent = "";
    }
}

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

const sideNavLogout = document.getElementById("sideNavLogout");
if (sideNavLogout) {
    sideNavLogout.onclick = function () {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut()
                .then(() => {
                    localStorage.removeItem('remember');
                    localStorage.removeItem('rememberedUser');
                    window.location.href = '../login/Login.html';
                })
                .catch(error => {
                    console.error('Error signing out:', error);
                    showToast('Sign out failed. Please try again.', 'error');
                });
        }
    };
}

const aiAssistantLink = document.getElementById('aiAssistantLink');
if (aiAssistantLink) {
    aiAssistantLink.onclick = () => {
        window.location.href = 'AI/ai.html';
    };
}

const HomeLink = document.getElementById('HomeLink');
if (HomeLink) {
    HomeLink.onclick = () => {
        window.location.href = 'index.html';
    };
}

const CalendarLink = document.getElementById('CalendarLink');
if (CalendarLink) {
    CalendarLink.onclick = () => {
        window.location.href = '../app/calendar/calendar.html';
    };
}

function sortTasks(tasks) {
    const priorityValues = { 'high': 3, 'medium': 2, 'low': 1 };

    return tasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }

        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);

        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }

        return priorityValues[b.priority] - priorityValues[a.priority];
    });
}

if (taskForm) {
    taskForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addTask();
    });
}

function addTask() {
    if (!validateTaskForm()) {
        return;
    }

    if (!checkCooldown('adding a task', lastTaskAdd, COOLDOWNS.ADD_TASK)) {
        return;
    }

    lastTaskAdd = Date.now();

    const title = document.getElementById('taskTitle').value.trim();
    const subject = document.getElementById('taskSubject').value.trim();
    const dueDate = document.getElementById('taskDue').value;
    const priority = document.getElementById('taskPriority').value;
    const description = document.getElementById('taskDescription') ? document.getElementById('taskDescription').value.trim() : '';

    const task = {
        id: taskId++,
        title,
        subject,
        dueDate,
        priority,
        description,
        completed: false,
        createdAt: new Date()
    };

    tasks.push(task);
    taskForm.reset();
    renderTasks();
    updateStats();
    saveTasks();
}

function openTaskDetail(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    currentEditingTaskId = taskId;

    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskSubject').value = task.subject;
    document.getElementById('editTaskDue').value = task.dueDate;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskDescription').value = task.description || '';

    taskDetailPopup.style.display = 'flex';
    taskDetailPopup.classList.add('active');
}

function closeTaskDetailPopup() {
    taskDetailPopup.style.display = 'none';
    taskDetailPopup.classList.remove('active');
    currentEditingTaskId = null;
}

if (closeTaskDetail) {
    closeTaskDetail.onclick = closeTaskDetailPopup;
}

if (cancelTaskEdit) {
    cancelTaskEdit.onclick = closeTaskDetailPopup;
}

if (taskDetailPopup) {
    taskDetailPopup.onclick = function (e) {
        if (e.target === taskDetailPopup) {
            closeTaskDetailPopup();
        }
    };
}

if (taskDetailForm) {
    taskDetailForm.addEventListener('submit', function (e) {
        e.preventDefault();
        saveTaskChanges();
    });
}

function saveTaskChanges() {
    if (!currentEditingTaskId) return;

    const title = document.getElementById('editTaskTitle').value.trim();
    const subject = document.getElementById('editTaskSubject').value.trim();
    const dueDate = document.getElementById('editTaskDue').value;
    const priority = document.getElementById('editTaskPriority').value;
    const description = document.getElementById('editTaskDescription').value.trim();

    if (!title || !subject || !dueDate || !priority) {
        showValidationError('Please fill in all required fields');
        return;
    }

    if (!validateTextLength(title, MAX_LENGTHS.TITLE, 'Task title')) {
        return;
    }
    if (!validateTextLength(subject, MAX_LENGTHS.SUBJECT, 'Subject')) {
        return;
    }
    if (description && !validateTextLength(description, MAX_LENGTHS.DESCRIPTION, 'Description')) {
        return;
    }

    const taskIndex = tasks.findIndex(t => t.id === currentEditingTaskId);
    if (taskIndex !== -1) {
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            title,
            subject,
            dueDate,
            priority,
            description
        };

        renderTasks();
        updateStats();
        saveTasks();
        closeTaskDetailPopup();
    }
}

function renderTasks() {
    if (!taskList) return;

    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>Nothing here yet! Add your first task to get started.</p>
            </div>
        `;
        return;
    }

    const sortedTasks = sortTasks([...tasks]);

    taskList.innerHTML = sortedTasks.map(task => `
        <div class="task-item task-clickable fade-in ${task.completed ? 'completed' : ''}" data-id="${task.id}" onclick="openTaskDetail(${task.id})">
            <div class="task-content">
                <div class="task-title">${sanitizeInput(task.title)}</div>
                <div class="task-meta">
                    <span class="task-subject">${sanitizeInput(task.subject)}</span>
                    <span class="task-due">${task.dueDate ? `Due ${formatDate(task.dueDate)}` : ''}</span>
                    <span class="priority-badge priority-${task.priority}">${getPriorityText(task.priority)}</span>
                </div>
                ${task.description ? `<div class="task-description" style="margin-top: 4px; font-size: 0.85rem; color: #718096;">${sanitizeInput(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</div>` : ''}
            </div>
            <div class="task-actions" onclick="event.stopPropagation()">
                <button class="btn btn-small btn-complete" onclick="toggleTask(${task.id})">
                    ${task.completed ? 'Undo' : 'Done'}
                </button>
                <button class="btn btn-small btn-delete" onclick="deleteTask(${task.id})">
                    Remove
                </button>
            </div>
        </div>
    `).join('');
}

function getPriorityText(priority) {
    switch (priority) {
        case 'high': return 'High';
        case 'medium': return 'Medium';
        case 'low': return 'Low';
        default: return '';
    }
}

window.toggleTask = function (id) {
    tasks = tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    renderTasks();
    updateStats();
    saveTasks();
};

window.deleteTask = function (id) {
    if (!checkCooldown('deleting a task', lastTaskDelete, COOLDOWNS.DELETE_TASK)) {
        return;
    }

    lastTaskDelete = Date.now();
    tasks = tasks.filter(task => task.id !== id);
    renderTasks();
    updateStats();
    saveTasks();
};

window.openTaskDetail = openTaskDetail;

function updateStats() {
    if (!totalTasksEl) return;

    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    totalTasksEl.textContent = total;
    if (completedTasksEl) completedTasksEl.textContent = completed;
    if (pendingTasksEl) pendingTasksEl.textContent = pending;
    if (completionRateEl) completionRateEl.textContent = rate + '%';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message, type = 'info') {
    console.log(`Toast (${type}): ${message}`);
}

function addCharacterCounters() {
    const titleInput = document.getElementById('taskTitle');
    const subjectInput = document.getElementById('taskSubject');
    const descriptionInput = document.getElementById('taskDescription');

    const editTitleInput = document.getElementById('editTaskTitle');
    const editSubjectInput = document.getElementById('editTaskSubject');
    const editDescriptionInput = document.getElementById('editTaskDescription');

    function createCounter(input, maxLength, fieldName) {
        if (!input) return;

        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.style.cssText = `
            font-size: 0.8rem;
            color: #666;
            text-align: right;
            margin-top: 2px;
        `;

        function updateCounter() {
            const currentLength = input.value.length;
            counter.textContent = `${currentLength}/${maxLength}`;

            if (currentLength > maxLength) {
                counter.style.color = '#ef4444';
                counter.style.fontWeight = 'bold';
            } else if (currentLength > maxLength * 0.8) {
                counter.style.color = '#f59e0b';
                counter.style.fontWeight = 'normal';
            } else {
                counter.style.color = '#666';
                counter.style.fontWeight = 'normal';
            }
        }

        input.addEventListener('input', updateCounter);
        input.parentNode.insertBefore(counter, input.nextSibling);
        updateCounter();
    }

    createCounter(titleInput, MAX_LENGTHS.TITLE, 'Task title');
    createCounter(subjectInput, MAX_LENGTHS.SUBJECT, 'Subject');
    createCounter(descriptionInput, MAX_LENGTHS.DESCRIPTION, 'Description');
    createCounter(editTitleInput, MAX_LENGTHS.TITLE, 'Task title');
    createCounter(editSubjectInput, MAX_LENGTHS.SUBJECT, 'Subject');
    createCounter(editDescriptionInput, MAX_LENGTHS.DESCRIPTION, 'Description');
}

document.addEventListener('DOMContentLoaded', () => {
    addCharacterCounters();
    updateStats();
});