const themeToggle = document.getElementById('themeToggle');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Replace localStorage with in-memory storage
let nightModeStorage = 'false';
let rememberStorage = null;
let rememberedUserStorage = null;

// Initialize theme
if (nightModeStorage === 'true' || (!nightModeStorage && prefersDark)) {
    document.body.classList.add('night');
}

let currentUser = null;
let tasks = [];
let currentOpenDate = null;
let currentDate = new Date();
let currentEditingTaskId = null;

// Firebase Auth State Listener
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        const loadingScreen = document.getElementById('loadingScreen');

        if (user) {
            currentUser = user;
            if (loadingScreen) loadingScreen.style.display = "flex";

            try {
                await loadUserData(user.uid);
                initializeCalendar();
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
                window.location.href = "../login/Login.html";
            };
        }
    } else {
        window.location.href = "../login/Login.html";
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

        // Update navigation
        const userNameNav = document.getElementById('userNameNav');
        if (userNameNav) userNameNav.textContent = userData.displayName || userData.name || userData.email || '';

        const profilePic = document.getElementById('userProfilePicNav');
        if (profilePic) {
            let photoURL = userData.photoURL || currentUser.photoURL || "https://cdn-icons-png.flaticon.com/512/456/456212.png";
            profilePic.src = photoURL;
        }

        tasks = userData.tasks || [];
    }
}

function initializeCalendar() {
    renderCalendar();
    setupEventListeners();
}

function setupEventListeners() {
    // Theme toggle
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

    // Navigation
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

    // Side navigation links
    const homeLink = document.getElementById('HomeLink');
    const calendarLink = document.getElementById('CalendarLink');
    const aiAssistantLink = document.getElementById('aiAssistantLink');
    const sideNavLogout = document.getElementById('sideNavLogout');

    if (homeLink) {
        homeLink.onclick = () => window.location.href = '../index.html';
    }
    if (calendarLink) {
        calendarLink.onclick = () => window.location.href = 'calendar.html';
    }
    if (aiAssistantLink) {
        aiAssistantLink.onclick = () => window.location.href = '../AI/ai.html';
    }
    if (sideNavLogout) {
        sideNavLogout.onclick = function () {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().signOut().then(() => {
                    rememberStorage = null;
                    rememberedUserStorage = null;
                    window.location.href = '../../login/Login.html';
                });
            }
        };
    }

    // Calendar navigation
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    const todayBtn = document.getElementById('todayBtn');

    if (prevMonth) {
        prevMonth.onclick = () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        };
    }

    if (nextMonth) {
        nextMonth.onclick = () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        };
    }

    if (todayBtn) {
        todayBtn.onclick = () => {
            currentDate = new Date();
            renderCalendar();
        };
    }

    // Modal event listeners
    const dayDetailModal = document.getElementById('dayDetailModal');
    const closeDayDetail = document.getElementById('closeDayDetail');
    const taskDetailPopup = document.getElementById('taskDetailPopup');
    const closeTaskDetail = document.getElementById('closeTaskDetail');
    const cancelTaskEdit = document.getElementById('cancelTaskEdit');
    const taskDetailForm = document.getElementById('taskDetailForm');

    if (closeDayDetail) {
        closeDayDetail.onclick = () => {
            if (dayDetailModal) dayDetailModal.style.display = 'none';
        };
    }

    if (dayDetailModal) {
        dayDetailModal.onclick = (e) => {
            if (e.target === dayDetailModal) {
                dayDetailModal.style.display = 'none';
            }
        };
    }

    if (closeTaskDetail) {
        closeTaskDetail.onclick = () => {
            if (taskDetailPopup) taskDetailPopup.style.display = 'none';
            currentEditingTaskId = null;
        };
    }

    if (cancelTaskEdit) {
        cancelTaskEdit.onclick = () => {
            if (taskDetailPopup) taskDetailPopup.style.display = 'none';
            currentEditingTaskId = null;
        };
    }

    if (taskDetailForm) {
        taskDetailForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveTaskChanges();
        });
    }
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

function renderCalendar() {
    const calendarTitle = document.getElementById('calendarTitle');
    const calendarGrid = document.getElementById('calendarGrid');

    if (!calendarTitle || !calendarGrid) return;

    // Update title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    calendarTitle.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Clear calendar
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    // Get first day of month and number of days
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // Generate calendar days
    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';

        const isOtherMonth = cellDate.getMonth() !== currentDate.getMonth();
        const isToday = isDateToday(cellDate);
        const dayTasks = getTasksForDate(cellDate);

        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        if (isToday) {
            dayElement.classList.add('today');
        }
        if (dayTasks.length > 0) {
            dayElement.classList.add('has-tasks');
        }

        dayElement.innerHTML = `
            <div class="day-number">${cellDate.getDate()}</div>
            <div class="day-tasks">
                ${dayTasks.slice(0, 3).map(task => `
                    <div class="task-dot priority-${task.priority} ${task.completed ? 'completed' : ''}"
                            title="${task.title}">
                        ${task.title}
                    </div>
                `).join('')}
                ${dayTasks.length > 3 ? `<div class="task-dot" style="background: #666;">+${dayTasks.length - 3} more</div>` : ''}
            </div>
        `;

        if (!isOtherMonth) {
            dayElement.onclick = () => openDayDetail(cellDate, dayTasks);
        }

        calendarGrid.appendChild(dayElement);
    }
}

function isDateToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

function getTasksForDate(date) {
    const dateString = formatDateForComparison(date);
    return tasks.filter(task => task.dueDate === dateString);
}

function formatDateForComparison(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function openDayDetail(date, dayTasks) {
    const dayDetailModal = document.getElementById('dayDetailModal');
    const dayDetailTitle = document.getElementById('dayDetailTitle');
    const dayTasksList = document.getElementById('dayTasksList');

    if (!dayDetailModal || !dayDetailTitle || !dayTasksList) return;

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    dayDetailTitle.textContent = formattedDate;

    if (dayTasks.length === 0) {
        dayTasksList.innerHTML = `
            <div class="no-tasks">
                <div class="no-tasks-icon">
                    <i class="fas fa-calendar-times"></i>
                </div>
                <h3>No tasks for this day</h3>
                <p>You're all caught up! Enjoy your free time.</p>
            </div>
        `;
    } else {
        dayTasksList.innerHTML = dayTasks.map(task => `
            <div class="day-task-item priority-${task.priority} ${task.completed ? 'completed' : ''}">
                <div class="day-task-title">
                    ${task.completed ? '<i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i>' : ''}
                    ${task.title}
                </div>
                <div class="day-task-meta">
                    <span><i class="fas fa-book"></i> ${task.subject}</span>
                    <span><i class="fas fa-flag"></i> ${getPriorityText(task.priority)}</span>
                    <span><i class="fas fa-calendar"></i> Due: ${formatDate(task.dueDate)}</span>
                </div>
                ${task.description ? `<div class="day-task-description">${task.description}</div>` : ''}
                <div class="day-task-actions">
                    <button class="btn btn-small ${task.completed ? 'btn-secondary' : 'btn-success'}" 
                            onclick="toggleTaskCompletion('${task.id}')">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        ${task.completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                    <button class="btn btn-small btn-danger" 
                            onclick="deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    dayDetailModal.style.display = 'flex';
}

function getPriorityText(priority) {
    switch (priority) {
        case 'high': return 'Super urgent!';
        case 'medium': return 'Pretty important';
        case 'low': return 'Not urgent';
        default: return 'Unknown';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function openTaskDetail(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    currentEditingTaskId = taskId;

    const editTaskTitle = document.getElementById('editTaskTitle');
    const editTaskSubject = document.getElementById('editTaskSubject');
    const editTaskDue = document.getElementById('editTaskDue');
    const editTaskPriority = document.getElementById('editTaskPriority');
    const editTaskDescription = document.getElementById('editTaskDescription');
    const taskDetailPopup = document.getElementById('taskDetailPopup');

    if (editTaskTitle) editTaskTitle.value = task.title;
    if (editTaskSubject) editTaskSubject.value = task.subject;
    if (editTaskDue) editTaskDue.value = task.dueDate;
    if (editTaskPriority) editTaskPriority.value = task.priority;
    if (editTaskDescription) editTaskDescription.value = task.description || '';

    if (taskDetailPopup) taskDetailPopup.style.display = 'flex';
}

async function saveTaskChanges() {
    if (!currentEditingTaskId || !currentUser) return;

    const editTaskTitle = document.getElementById('editTaskTitle');
    const editTaskSubject = document.getElementById('editTaskSubject');
    const editTaskDue = document.getElementById('editTaskDue');
    const editTaskPriority = document.getElementById('editTaskPriority');
    const editTaskDescription = document.getElementById('editTaskDescription');

    if (!editTaskTitle || !editTaskSubject || !editTaskDue || !editTaskPriority) return;

    const title = editTaskTitle.value.trim();
    const subject = editTaskSubject.value.trim();
    const dueDate = editTaskDue.value;
    const priority = editTaskPriority.value;
    const description = editTaskDescription ? editTaskDescription.value.trim() : '';

    if (!title || !subject || !dueDate || !priority) {
        alert('Please fill in all required fields.');
        return;
    }

    try {
        // Update task in local array
        const taskIndex = tasks.findIndex(t => t.id === parseInt(currentEditingTaskId));
        if (taskIndex !== -1) {
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                title,
                subject,
                dueDate,
                priority,
                description,
                updatedAt: new Date().toISOString()
            };

            // Update in Firebase
            if (typeof db !== 'undefined') {
                await db.collection('users').doc(currentUser.uid).update({
                    tasks: tasks
                });
            }

            // Close modals and refresh calendar
            const taskDetailPopup = document.getElementById('taskDetailPopup');
            const dayDetailModal = document.getElementById('dayDetailModal');

            if (taskDetailPopup) taskDetailPopup.style.display = 'none';
            if (dayDetailModal) dayDetailModal.style.display = 'none';

            currentEditingTaskId = null;
            renderCalendar();

            // Show success message
            showNotification('Task updated successfully!', 'success');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Error updating task. Please try again.', 'error');
    }
}

async function toggleTaskCompletion(taskId) {
    if (!currentUser) return;

    try {
        const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId));
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            tasks[taskIndex].updatedAt = new Date().toISOString();

            // Update in Firebase
            if (typeof db !== 'undefined') {
                await db.collection('users').doc(currentUser.uid).update({
                    tasks: tasks
                });
            }

            // Refresh calendar and day detail if open
            renderCalendar();

            // If day detail modal is open, refresh it
            const dayDetailModal = document.getElementById('dayDetailModal');
            if (dayDetailModal && dayDetailModal.style.display === 'flex') {
                const dayDetailTitle = document.getElementById('dayDetailTitle');
                if (dayDetailTitle) {
                    const date = new Date(dayDetailTitle.textContent);
                    const dayTasks = getTasksForDate(date);
                    openDayDetail(date, dayTasks);
                }
            }

            showNotification(
                tasks[taskIndex].completed ? 'Task marked as complete!' : 'Task marked as incomplete!',
                'success'
            );
        }
    } catch (error) {
        console.error('Error toggling task completion:', error);
        showNotification('Error updating task. Please try again.', 'error');
    }
}

async function deleteTask(taskId) {
    try {
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId));
        if (taskIndex === -1) {
            throw new Error('Task not found');
        }

        // Remove from local array
        tasks = tasks.filter(task => task.id !== parseInt(taskId));

        // Update in Firebase
        if (typeof db !== 'undefined') {
            await db.collection('users').doc(currentUser.uid).update({
                tasks: tasks
            });
        }

        // Refresh calendar and close modals
        renderCalendar();

        const dayDetailModal = document.getElementById('dayDetailModal');
        if (dayDetailModal && dayDetailModal.style.display === 'flex') {
            const dayDetailTitle = document.getElementById('dayDetailTitle');
            if (dayDetailTitle) {
                const date = new Date(dayDetailTitle.textContent);
                const dayTasks = getTasksForDate(date);
                openDayDetail(date, dayTasks);
            }
        }

        showNotification('Task deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('ไม่สามารถลบ task ได้: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS for notifications
const notificationCSS = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notification.show {
    transform: translateX(0);
}

.notification-success {
    background-color: #10b981;
}

.notification-error {
    background-color: #ef4444;
}

.notification-info {
    background-color: #3b82f6;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-small {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    margin-right: 0.5rem;
}

.btn-success {
    background-color: #10b981;
}

.btn-success:hover {
    background-color: #059669;
}

.btn-danger {
    background-color: #ef4444;
}

.btn-danger:hover {
    background-color: #dc2626;
}

.btn-primary {
    background-color: var(--primary-color);
}

.btn-primary:hover {
    background-color: var(--primary-hover);
}

.btn-secondary {
    background-color: #6b7280;
}

.btn-secondary:hover {
    background-color: #4b5563;
}
`;

const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Make functions globally available
window.toggleTaskCompletion = toggleTaskCompletion;
window.openTaskDetail = openTaskDetail;
window.deleteTask = deleteTask;

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded');

    setTimeout(() => {
        if (!currentUser) {
            console.log('Testing calendar without user...');
            currentDate = new Date();
            renderCalendar();
        }
    }, 2000);
});

function animatePopup(popup) {
    popup.style.opacity = 0;
    popup.style.transform = "translateY(-10px)";
    popup.style.display = "flex";
    setTimeout(() => {
        popup.style.transition = "all 0.3s ease";
        popup.style.opacity = 1;
        popup.style.transform = "translateY(0)";
    }, 10);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `notification notification-${type} show`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.remove('show'), 3000);
    setTimeout(() => toast.remove(), 3500);
}

// Initialize when page loads
window.addEventListener("load", () => {
    const popup = document.getElementById("dayDetailModal");
    if (popup && popup.style.display === "flex") {
        animatePopup(popup);
    }
});