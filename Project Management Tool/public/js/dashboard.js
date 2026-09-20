// Dashboard page logic
let currentUser = null;
let allNotifications = [];

function getAvatarUrl(user, size = 40) {
    if (user.profile_picture && user.profile_picture !== 'default-avatar.png') {
        return `/images/${user.profile_picture}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random&size=${size}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = getUser();
    if (!user) {
        window.location.href = '/login';
        return;
    }
    currentUser = user;

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Render user info in top bar
    const userInfo = document.getElementById('user-info');
    if (userInfo && user) {
        const avatar = getAvatarUrl(user, 40);
        userInfo.innerHTML = `<img src="${avatar}" alt="${user.full_name}" class="user-avatar"> <span style="color:#e2e8f0;">${user.full_name}</span>`;
    }

    // Load dashboard data
    await loadDashboard();

    // Setup create project button
    const createBtn = document.getElementById('create-project-btn');
    if (createBtn) createBtn.addEventListener('click', showCreateProjectModal);

    // Setup mark all read
    const markAllRead = document.getElementById('mark-all-read');
    if (markAllRead) markAllRead.addEventListener('click', markAllAsRead);

    // Setup WebSocket for notifications
    setupWebSocket();
});

function setupWebSocket() {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8080?token=${token}`);
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe_notifications', payload: {} }));
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
            updateNotificationBadge();
            if (document.getElementById('tab-notifications').classList.contains('active')) {
                loadNotifications();
            }
        }
    };
    ws.onclose = () => setTimeout(setupWebSocket, 3000);
}

async function loadDashboard() {
    try {
        const response = await apiRequest('/projects/stats');
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-projects').textContent = stats.totalProjects;
            document.getElementById('stat-active').textContent = stats.activeTasks;
            document.getElementById('stat-completed').textContent = stats.completedTasks;
            document.getElementById('stat-overdue').textContent = stats.overdueTasks;
        }
    } catch (e) {
        console.error('Failed to load stats', e);
    }

    await loadDashboardProjects();
    await updateNotificationBadge();
}

async function loadDashboardProjects() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    grid.innerHTML = '<p>Loading projects...</p>';

    try {
        const response = await apiRequest('/projects');
        if (response.ok) {
            const projects = await response.json();
            if (projects.length === 0) {
                grid.innerHTML = '<p>No projects yet. Create your first project!</p>';
            } else {
                grid.innerHTML = projects.map(project => `
                    <div class="project-card">
                        <div class="project-card-header">
                            <h3 onclick="openProject(${project.id})">${project.name}</h3>
                            <span class="badge ${project.is_public ? 'badge-public' : 'badge-private'}">${project.is_public ? 'Public' : 'Private'}</span>
                        </div>
                        <p onclick="openProject(${project.id})">${project.description || 'No description'}</p>
                        <div class="project-meta">
                            <span><strong>${project.member_count || 1}</strong> members</span>
                            <span>${formatDate(project.created_at)}</span>
                        </div>
                        <button class="btn-delete" onclick="deleteProject(${project.id}, event)" title="Delete project">×</button>
                    </div>
                `).join('');
            }
        } else {
            grid.innerHTML = '<p style="color:red;">Failed to load projects. Please refresh.</p>';
        }
    } catch (e) {
        console.error('Failed to load projects', e);
        grid.innerHTML = '<p style="color:red;">Error loading projects.</p>';
    }
}

async function loadProjectsTab() {
    const grid = document.getElementById('projects-grid-tab');
    if (!grid) return;

    grid.innerHTML = '<p>Loading projects...</p>';

    try {
        const response = await apiRequest('/projects');
        if (response.ok) {
            const projects = await response.json();
            if (projects.length === 0) {
                grid.innerHTML = '<p>No projects yet. Create your first project!</p>';
            } else {
                grid.innerHTML = projects.map(project => `
                    <div class="project-card">
                        <div class="project-card-header">
                            <h3 onclick="openProject(${project.id})">${project.name}</h3>
                            <span class="badge ${project.is_public ? 'badge-public' : 'badge-private'}">${project.is_public ? 'Public' : 'Private'}</span>
                        </div>
                        <p onclick="openProject(${project.id})">${project.description || 'No description'}</p>
                        <div class="project-meta">
                            <span><strong>${project.member_count || 1}</strong> members</span>
                            <span>${formatDate(project.created_at)}</span>
                        </div>
                        <button class="btn-delete" onclick="deleteProject(${project.id}, event)" title="Delete project">×</button>
                    </div>
                `).join('');
            }
        } else {
            grid.innerHTML = '<p style="color:red;">Failed to load projects.</p>';
        }
    } catch (e) {
        console.error('Failed to load projects', e);
        grid.innerHTML = '<p style="color:red;">Error loading projects.</p>';
    }
}

async function loadTasksTab() {
    const container = document.getElementById('my-tasks-list');
    if (!container) return;

    try {
        const response = await apiRequest('/tasks/assigned/me');
        if (response.ok) {
            const tasks = await response.json();
            if (tasks.length === 0) {
                container.innerHTML = '<p>No tasks assigned to you.</p>';
            } else {
                container.innerHTML = tasks.map(task => `
                    <div class="task-card" onclick="openTaskModal(${task.id})">
                        <div class="task-card-header">
                            <span class="task-title">${task.title}</span>
                            <span class="task-priority priority-${task.priority}">${task.priority}</span>
                        </div>
                        <p class="task-desc">${task.description || 'No description'}</p>
                        <div class="task-meta">
                            <span>Due: ${task.due_date ? formatDate(task.due_date) : 'No due date'}</span>
                            <span>Project: ${task.project_name || 'Unknown'}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Failed to load tasks', e);
    }
}

async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    try {
        const response = await apiRequest('/notifications');
        if (response.ok) {
            allNotifications = await response.json();
            const markAllBtn = document.getElementById('mark-all-read');
            if (markAllBtn) markAllBtn.style.display = allNotifications.length > 0 ? 'inline-block' : 'none';

            if (allNotifications.length === 0) {
                container.innerHTML = '<p style="color:#999; padding:1rem;">No notifications yet.</p>';
            } else {
                container.innerHTML = allNotifications.map(notif => `
                    <div class="notification-item ${!notif.read_at ? 'unread' : ''}" onclick="handleNotificationClick(${notif.id})">
                        <div class="notif-message">${notif.message}</div>
                        <div class="notif-time" style="font-size:0.75rem; color:#999;">${formatDate(notif.created_at)}</div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Failed to load notifications', e);
    }
}

async function loadProfile() {
    const container = document.getElementById('profile-content');
    if (!container) return;

    try {
        const response = await apiRequest('/auth/profile');
        if (response.ok) {
            const user = await response.json();
            const avatar = getAvatarUrl(user, 80);

            // Fetch additional stats
            const tasksResponse = await apiRequest('/tasks/assigned/me');
            let taskCount = 0;
            if (tasksResponse.ok) {
                const tasks = await tasksResponse.json();
                taskCount = tasks.length;
            }

            container.innerHTML = `
                <div>
                    <img src="${avatar}" alt="${user.full_name}" class="profile-picture">
                </div>
                <div>
                    <table style="width:100%; border-collapse:collapse;">
                        <tr><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;"><strong>Full Name</strong></td><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;">${user.full_name}</td></tr>
                        <tr><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;"><strong>Username</strong></td><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;">${user.username}</td></tr>
                        <tr><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;"><strong>Email</strong></td><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;">${user.email}</td></tr>
                        <tr><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;"><strong>Member Since</strong></td><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;">${formatDate(user.created_at)}</td></tr>
                        <tr><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;"><strong>Tasks Assigned</strong></td><td style="padding:0.5rem; border-bottom:1px solid #e2e8f0;">${taskCount}</td></tr>
                        <tr><td style="padding:0.5rem;"><strong>Profile Picture</strong></td><td style="padding:0.5rem;"></td></tr>
                    </table>
                    <p style="color:#999; font-size:0.85rem; margin-top:0.5rem;">Avatar is generated from your name initials</p>
                </div>
            `;
        }
    } catch (e) {
        console.error('Failed to load profile', e);
        container.innerHTML = '<p>Failed to load profile.</p>';
    }
}

async function updateNotificationBadge() {
    const count = await getUnreadCount();
    const badge = document.getElementById('notif-count');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

async function getUnreadCount() {
    try {
        const response = await apiRequest('/notifications/unread');
        if (response.ok) {
            const data = await response.json();
            return data.count;
        }
    } catch (e) {}
    return 0;
}

async function markAllAsRead() {
    try {
        const response = await apiRequest('/notifications/read-all', { method: 'POST' });
        if (response.ok) {
            allNotifications.forEach(n => n.read_at = new Date().toISOString());
            loadNotifications();
            updateNotificationBadge();
            showToast('All notifications marked as read');
        }
    } catch (e) {
        showToast('Failed to mark notifications', 'error');
    }
}

function handleNotificationClick(notifId) {
    // Mark as read
    apiRequest(`/notifications/${notifId}/read`, { method: 'PUT' }).then(() => {
        const item = document.querySelector(`[onclick="handleNotificationClick(${notifId})"]`);
        if (item) item.classList.remove('unread');
        updateNotificationBadge();
    });
}

function openProject(id) {
    window.location.href = `/project/${id}`;
}

function openTaskModal(taskId) {
    // Open task view in modal or navigate
    window.location.href = `/project/${getTaskProjectId(taskId)}#task-${taskId}`;
}

async function getTaskProjectId(taskId) {
    // We can infer this from the task data
    const response = await apiRequest(`/tasks/${taskId}`);
    if (response.ok) {
        const task = await response.json();
        return task.project_id;
    }
    return '';
}

function showCreateProjectModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Create Project</h3>
                <button class="btn-close" onclick="closeModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                <form id="create-project-form">
                    <div class="form-group">
                        <input type="text" name="name" placeholder="Project Name" required>
                    </div>
                    <div class="form-group">
                        <textarea name="description" placeholder="Description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" name="is_public" value="1"> Public project</label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal(this)">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('create-project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            is_public: formData.get('is_public') ? 1 : 0
        };

        try {
            const response = await apiRequest('/projects', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (response.ok) {
                const project = await response.json();
                showToast('Project created successfully');
                modal.remove();
                loadProjectsTab();
                loadDashboard();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to create project', 'error');
            }
        } catch (err) {
            console.error('Failed to create project', err);
            showToast('Failed to create project', 'error');
        }
    });
}

function closeModal(button) {
    button.closest('.modal-overlay').remove();
}

async function deleteProject(projectId, event) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    try {
        const response = await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Project deleted');
            loadProjectsTab();
            loadDashboard();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to delete project', 'error');
        }
    } catch (err) {
        console.error('Failed to delete project', err);
        showToast('Failed to delete project', 'error');
    }
}
