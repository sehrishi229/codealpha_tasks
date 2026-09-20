let currentProject = null;
let columns = [];
let ws = null;
let draggedTask = null;
let draggedColumn = null;
let currentTaskId = null;

function getAvatarUrl(user, size = 40) {
    if (user.profile_picture && user.profile_picture !== 'default-avatar.png') {
        return `/images/${user.profile_picture}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random&size=${size}`;
}

const projectId = window.location.pathname.split('/').pop();

document.addEventListener('DOMContentLoaded', async () => {
    const user = getUser();
    if (!user) {
        window.location.href = '/login';
        return;
    }

    await loadProject();
    setupWebSocket();
});

async function loadProject() {
    try {
        const response = await apiRequest(`/projects/${projectId}`);
        if (response.ok) {
            currentProject = await response.json();
            columns = currentProject.columns || [];
            renderProjectHeader();
            renderBoard();
            await updateNotificationBadge(await getUnreadCount());
        } else if (response.status === 403 || response.status === 404) {
            window.location.href = '/dashboard';
        }
    } catch (err) {
        console.error('Failed to load project', err);
    }
}

function renderProjectHeader() {
    const header = document.getElementById('project-header');
    if (!header || !currentProject) return;

    header.innerHTML = `
        <div>
            <h2>${currentProject.project.name}</h2>
            <p>${currentProject.project.description || 'No description'}</p>
        </div>
        <div class="project-actions">
            <button class="btn btn-secondary" onclick="showMembers()">Members (${currentProject.members.length})</button>
            <button class="btn btn-secondary" onclick="showInvite()">Invite</button>
            ${currentProject.role === 'owner' ? '<button class="btn btn-secondary" onclick="showEditProject()">Edit</button>' : ''}
        </div>
    `;
}

function renderBoard() {
    const board = document.getElementById('board');
    if (!board) return;

    board.innerHTML = `
        <div class="add-column" id="add-column">
            <input type="text" id="new-column-name" placeholder="Add column..." onkeydown="handleColumnInput(event)">
        </div>
        ${columns.map(col => `
            <div class="column" id="column-${col.id}" data-column-id="${col.id}">
                <div class="column-header">
                    <span class="column-title">${col.name}</span>
                    <button class="column-menu" onclick="showColumnMenu(${col.id})">⋮</button>
                </div>
                <div class="column-tasks" id="tasks-${col.id}">
                    ${renderTasks(col.id, currentProject.tasks[col.id] || [])}
                </div>
                <button class="btn btn-secondary" style="width:100%; margin-top:0.5rem;" onclick="showAddTask(${col.id})">+ Add Task</button>
            </div>
        `).join('')}
    `;
}

function renderTasks(columnId, tasks) {
    if (!tasks || tasks.length === 0) return '<p style="color:#999; font-size:0.8rem;">No tasks</p>';

    return tasks.map(task => `
        <div class="task-card" id="task-${task.id}" data-task-id="${task.id}"
             draggable="true" ondragstart="dragTask(event, ${task.id})">
            <div class="task-card-title">${task.title}</div>
            <div class="task-meta">
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                ${task.due_date ? `<span class="task-due ${isOverdue(task.due_date) ? 'due-overdue' : ''}">${formatDate(task.due_date)}</span>` : ''}
            </div>
            ${task.assigned_to_name ? `<div class="task-assignee">${task.assigned_to_name}</div>` : ''}
        </div>
    `).join('');
}

function dragTask(event, taskId) {
    draggedTask = taskId;
    event.dataTransfer.effectAllowed = 'move';
}

async function handleTaskDrop(columnId, event) {
    event.preventDefault();
    if (!draggedTask) return;

    const position = columns.find(c => c.id == columnId).tasks_count || 0;

    apiRequest(`/tasks/${draggedTask}/move`, {
        method: 'POST',
        body: JSON.stringify({ column_id: columnId, position })
    }).catch(err => {
        showToast('Failed to move task', 'error');
    });

    const taskCard = document.getElementById(`task-${draggedTask}`);
    if (taskCard) {
        const newColumn = document.getElementById(`tasks-${columnId}`);
        if (newColumn) {
            newColumn.appendChild(taskCard);
        }
    }

    draggedTask = null;
}

function handleColumnInput(event) {
    if (event.key === 'Enter') {
        const input = event.target;
        const name = input.value.trim();
        if (name) {
            addColumn(name);
            input.value = '';
        }
    }
}

async function addColumn(name) {
    try {
        const position = columns.length;
        const response = await apiRequest(`/projects/${projectId}/columns`, {
            method: 'POST',
            body: JSON.stringify({ name, position })
        });
        if (response.ok) {
            const column = await response.json();
            columns.push(column);
            renderBoard();
            showToast('Column added');
        }
    } catch (err) {
        showToast('Failed to create column', 'error');
    }
}

function showColumnMenu(columnId) {
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.innerHTML = `
        <button onclick="renameColumn(${columnId})">Rename</button>
        <button onclick="deleteColumn(${columnId})" style="color:red;">Delete</button>
    `;
    document.body.appendChild(menu);
    menu.style.position = 'absolute';
    menu.style.top = event.clientY + 'px';
    menu.style.left = event.clientX + 'px';
    window.addEventListener('click', () => menu.remove());
}

async function renameColumn(columnId) {
    const newName = prompt('Enter new column name:');
    if (!newName) return;

    try {
        const response = await apiRequest(`/projects/${projectId}/columns/${columnId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: newName })
        });
        if (response.ok) {
            const colHeader = document.querySelector(`#column-${columnId} .column-title`);
            if (colHeader) colHeader.textContent = newName;
        }
    } catch (err) {
        showToast('Failed to rename column', 'error');
    }
}

async function deleteColumn(columnId) {
    if (!confirm('Delete this column?')) return;

    try {
        const response = await apiRequest(`/projects/${projectId}/columns/${columnId}`, { method: 'DELETE' });
        if (response.ok) {
            columns = columns.filter(c => c.id != columnId);
            const colEl = document.getElementById(`column-${columnId}`);
            if (colEl) colEl.remove();
        }
    } catch (err) {
        showToast('Failed to delete column', 'error');
    }
}

async function addTask(columnId) {
    // Use task creation API
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'add-task-modal';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Create Task</h3>
                <button class="btn-close" onclick="closeModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                <form id="add-task-form">
                    <div class="form-group">
                        <input type="text" name="title" placeholder="Task Title" required>
                    </div>
                    <div class="form-group">
                        <textarea name="description" placeholder="Description" rows="3"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <select name="priority">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <input type="date" name="due_date">
                        </div>
                    </div>
                    <div class="form-group">
                        <select name="assigned_to" id="assignee-select">
                            <option value="">Unassigned</option>
                        </select>
                    </div>
                    <input type="hidden" name="column_id" value="${columnId}">
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal(this)">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Load members for assignee
    const assigneeSelect = modal.querySelector('#assignee-select');
    currentProject.members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id;
        option.textContent = member.full_name;
        assigneeSelect.appendChild(option);
    });

    modal.querySelector('#add-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const data = {
            title: formData.get('title'),
            description: formData.get('description') || '',
            column_id: columnId,
            priority: formData.get('priority'),
            due_date: formData.get('due_date') || null,
            assigned_to: formData.get('assigned_to') || null
        };

        try {
            const response = await apiRequest(`/projects/${projectId}/tasks`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (response.ok) {
                const task = await response.json();
                showToast('Task created');
                modal.remove();
                addTaskToColumn(columnId, task);
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to create task', 'error');
            }
        } catch (err) {
            showToast('Failed to create task', 'error');
        }
    });
}

function addTaskToColumn(columnId, task) {
    const tasksContainer = document.getElementById(`tasks-${columnId}`);
    if (!tasksContainer) return;

    const existing = tasksContainer.querySelector('p');
    if (existing && existing.style.color === '#999') {
        tasksContainer.innerHTML = '';
    }

    tasksContainer.innerHTML += `
        <div class="task-card" id="task-${task.id}" data-task-id="${task.id}"
             draggable="true" ondragstart="dragTask(event, ${task.id})">
            <div class="task-card-title">${task.title}</div>
            <div class="task-meta">
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                ${task.due_date ? `<span class="task-due ${isOverdue(task.due_date) ? 'due-overdue' : ''}">${formatDate(task.due_date)}</span>` : ''}
            </div>
            ${task.assigned_to_name ? `<div class="task-assignee">${task.assigned_to_name}</div>` : ''}
        </div>
    `;
}

function showAddTask(columnId) {
    addTask(columnId);
}

function openTask(taskId) {
    currentTaskId = taskId;
    showTaskModal(taskId);
}

async function showTaskModal(taskId) {
    try {
        const response = await apiRequest(`/tasks/${taskId}`);
        if (!response.ok) return;
        const task = await response.json();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'task-modal';
        modal.innerHTML = `
            <div class="modal task-modal">
                <div class="modal-header">
                    <input type="text" id="modal-task-title" value="${task.title}" style="font-size:1.5rem; border:none; background:transparent; width:100%;">
                    <button class="btn-close" onclick="closeModal(this)">&times;</button>
                </div>
                <div class="modal-body" id="modal-body">
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" placeholder="Add description..." rows="4">${task.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Status</label>
                            <select name="column_id" id="task-column">
                                ${columns.map(c => `<option value="${c.id}" ${c.id == task.column_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select name="priority">
                                <option value="low" ${task.priority == 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${task.priority == 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${task.priority == 'high' ? 'selected' : ''}>High</option>
                                <option value="urgent" ${task.priority == 'urgent' ? 'selected' : ''}>Urgent</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Due Date</label>
                            <input type="date" name="due_date" value="${task.due_date || ''}">
                        </div>
                        <div class="form-group">
                            <label>Assign To</label>
                            <select name="assigned_to" id="modal-assignee">
                                <option value="">Unassigned</option>
                                ${currentProject.members.map(m => `<option value="${m.user_id}" ${m.user_id == task.assigned_to ? 'selected' : ''}>${m.full_name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="section" style="margin-top:1rem;">
                        <h4>Comments</h4>
                        <div id="comments-list" style="max-height:200px; overflow-y:auto; margin-bottom:0.5rem;">
                            <!-- Comments loaded -->
                        </div>
                        <div class="form-row" style="gap:0.5rem;">
                            <input type="text" id="comment-input" placeholder="Add a comment..." style="flex:1;">
                            <button class="btn btn-primary" onclick="addComment(${task.id})">Add</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal(this)">Close</button>
                    <button class="btn btn-primary" onclick="saveTask(${task.id})">Save</button>
                    <button class="btn" onclick="deleteTaskModal(${task.id})" style="background:#fee; color:#c53030;">Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Load comments
        await loadComments(taskId);
    } catch (err) {
        console.error('Failed to load task', err);
    }
}

async function loadComments(taskId) {
    try {
        const response = await apiRequest(`/tasks/${taskId}/comments`);
        if (response.ok) {
            const comments = await response.json();
            const commentsList = document.getElementById('comments-list');
            if (comments.length === 0) {
                commentsList.innerHTML = '<p style="color:#999; font-size:0.8rem;">No comments yet</p>';
            } else {
                commentsList.innerHTML = comments.map(c => `
                    <div class="activity-item">
                        <strong>${c.full_name || c.username}</strong>: ${c.content}
                        <div style="font-size:0.75rem; color:#999;">${formatDate(c.created_at)}</div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Failed to load comments', e);
    }
}

async function saveTask(taskId) {
    const modal = document.getElementById('task-modal').closest('.modal-overlay');
    const form = modal.querySelector('.modal-body');

    const data = {
        title: form.querySelector('#modal-task-title').value,
        description: form.querySelector('textarea[name="description"]').value,
        column_id: form.querySelector('select[name="column_id"]').value,
        priority: form.querySelector('select[name="priority"]').value,
        due_date: form.querySelector('input[name="due_date"]').value || null,
        assigned_to: form.querySelector('select[name="assigned_to"]').value || null
    };

    try {
        const response = await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (response.ok) {
            const task = await response.json();
            showToast('Task updated');
            updateTaskCard(taskId, task);
            modal.remove();
        }
    } catch (err) {
        showToast('Failed to save task', 'error');
    }
}

function updateTaskCard(taskId, task) {
    const card = document.getElementById(`task-${taskId}`);
    if (!card) return;

    card.innerHTML = `
        <div class="task-card-title">${task.title}</div>
        <div class="task-meta">
            <span class="task-priority priority-${task.priority}">${task.priority}</span>
            ${task.due_date ? `<span class="task-due ${isOverdue(task.due_date) ? 'due-overdue' : ''}">${formatDate(task.due_date)}</span>` : ''}
        </div>
        ${task.assigned_to_name ? `<div class="task-assignee">${task.assigned_to_name}</div>` : ''}
    `;
}

async function deleteTaskModal(taskId) {
    try {
        const response = await apiRequest(`/tasks/${taskId}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Task deleted');
            closeModal(document.querySelector('#task-modal .btn-close'));
            const card = document.getElementById(`task-${taskId}`);
            if (card) card.remove();
        }
    } catch (err) {
        showToast('Failed to delete task', 'error');
    }
}

async function addComment(taskId) {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) return;

    try {
        const response = await apiRequest(`/tasks/${taskId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        if (response.ok) {
            const comment = await response.json();
            input.value = '';
            addCommentToDOM(comment);
        }
    } catch (err) {
        showToast('Failed to add comment', 'error');
    }
}

function addCommentToDOM(comment) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;

    const emptyMsg = commentsList.querySelector('p');
    if (emptyMsg) commentsList.innerHTML = '';

    commentsList.innerHTML += `
        <div class="activity-item">
            <strong>${comment.full_name || comment.username}</strong>: ${comment.content}
            <div style="font-size:0.75rem; color:#999;">${formatDate(comment.created_at)}</div>
        </div>
    `;
    commentsList.scrollTop = commentsList.scrollHeight;
}

async function showInvite() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Invite Members</h3>
                <button class="btn-close" onclick="closeModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                <p>Search for users to invite:</p>
                <input type="text" id="invite-search" placeholder="Search by username or email..." style="width:100%; padding:0.5rem; margin-bottom:0.5rem;">
                <div id="invite-results" style="max-height:200px; overflow-y:auto;"></div>
                <div id="invite-selected" style="margin-top:0.5rem;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal(this)">Cancel</button>
                <button class="btn btn-primary" onclick="submitInvites()">Send Invites</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const selected = [];
    const searchInput = modal.querySelector('#invite-search');

    searchInput.addEventListener('input', async () => {
        const query = searchInput.value.trim();
        if (!query) {
            document.getElementById('invite-results').innerHTML = '';
            return;
        }
        try {
            const response = await apiRequest(`/auth/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const users = await response.json();
                const existingIds = currentProject.members.map(m => m.user_id);
                const available = users.filter(u => !existingIds.includes(u.id));
                document.getElementById('invite-results').innerHTML = available.map(u => `
                    <div class="member-item" onclick="selectInviteUser(${u.id}, '${u.full_name}', '${u.email}')">
                        <img src="${getAvatarUrl(u, 30)}" width="30" height="30" style="border-radius:50%;">
                        <div><strong>${u.full_name}</strong><div style="font-size:0.8rem; color:#999;">${u.email}</div></div>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('Failed to search users', err);
        }
    });

    window.selectInviteUser = (userId, name, email) => {
        if (selected.some(u => u.id === userId)) return;
        const user = { id: userId, name, email };
        selected.push(user);
        const selectedDiv = document.getElementById('invite-selected');
        selectedDiv.innerHTML = selected.map(u => `
            <div class="member-item" style="justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span>${u.name}</span>
                </div>
                <button class="btn" onclick="removeSelectedInvite(${u.id})" style="background:#fee; color:#c53030; padding:2px 8px;">×</button>
            </div>
        `).join('');
    };

    window.removeSelectedInvite = (userId) => {
        selected = selected.filter(u => u.id !== userId);
        document.getElementById('invite-selected').innerHTML = selected.map(u => `
            <div class="member-item" style="justify-content:space-between;">
                <span>${u.name}</span>
                <button class="btn" onclick="removeSelectedInvite(${u.id})" style="background:#fee; color:#c53030; padding:2px 8px;">×</button>
            </div>
        `).join('');
    };

    window.submitInvites = async () => {
        for (const user of selected) {
            try {
                const response = await apiRequest(`/projects/${projectId}/members`, {
                    method: 'POST',
                    body: JSON.stringify({ user_id: user.id, role: 'member' })
                });
                if (response.ok) {
                    const newMembers = await response.json();
                    currentProject.members = newMembers;
                }
            } catch (err) {
                console.error('Failed to invite user', err);
            }
        }
        showToast(selected.length > 0 ? `${selected.length} invitation(s) sent` : 'No users selected');
        modal.remove();
        renderProjectHeader();
    };
}

function showEditProject() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Project</h3>
                <button class="btn-close" onclick="closeModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                <form id="edit-project-form">
                    <div class="form-group">
                        <label>Project Name</label>
                        <input type="text" name="name" value="${currentProject.project.name}" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" rows="3">${currentProject.project.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="is_public" value="1" ${currentProject.project.is_public ? 'checked' : ''}> Public project
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal(this)">Cancel</button>
                <button class="btn btn-primary" onclick="saveEditProject()">Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    window.saveEditProject = async () => {
        const form = modal.querySelector('#edit-project-form');
        const data = {
            name: form.name.value,
            description: form.description.value,
            is_public: form.is_public.checked ? 1 : 0
        };

        try {
            const response = await apiRequest(`/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (response.ok) {
                const updatedProject = await response.json();
                currentProject.project.name = updatedProject.name;
                currentProject.project.description = updatedProject.description;
                currentProject.project.is_public = updatedProject.is_public;
                showToast('Project updated');
                modal.remove();
                renderProjectHeader();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to update project', 'error');
            }
        } catch (err) {
            showToast('Failed to update project', 'error');
        }
    };
}

function showMembers() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Project Members</h3>
                <button class="btn-close" onclick="closeModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                <ul class="member-list">
                    ${currentProject.members.map(m => `
                        <li class="member-item">
                            <img src="${getAvatarUrl(m, 30)}" width="30" height="30" style="border-radius:50%;">
                            <div>
                                <strong>${m.full_name}</strong>
                                <div style="font-size:0.8rem; color:#999;">${m.role}</div>
                            </div>
                            ${m.user_id != currentProject.project.owner_id ? `<button class="btn" onclick="removeMember(${m.user_id})" style="margin-left:auto; background:#fee; color:#c53030;">Remove</button>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function isOverdue(dateString) {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
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

function setupWebSocket() {
    const token = getToken();
    if (!token) return;

    ws = new WebSocket(`ws://localhost:8080?token=${token}`);

    ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({ type: 'subscribe', payload: { projectId } }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected, retrying...');
        setTimeout(setupWebSocket, 3000);
    };
}

function handleWebSocketMessage(data) {
    const { type, payload } = data;
    switch (type) {
        case 'task_created':
            if (payload.projectId == projectId) {
                handleTaskCreated(payload.task);
            }
            break;
        case 'task_updated':
            if (payload.projectId == projectId) {
                handleTaskUpdated(payload.task);
            }
            break;
        case 'task_moved':
            if (payload.projectId == projectId) {
                handleTaskMoved(payload.taskId, payload.column_id, payload.position);
            }
            break;
        case 'task_deleted':
            if (payload.projectId == projectId) {
                handleTaskDeleted(payload.taskId);
            }
            break;
        case 'comment_added':
            if (payload.taskId == currentTaskId) {
                addCommentToDOM(payload.comment);
            }
            break;
        case 'comment_updated':
            if (payload.taskId == currentTaskId) {
                updateCommentInDOM(payload.commentId, payload.content);
            }
            break;
        case 'comment_deleted':
            if (payload.taskId == currentTaskId) {
                removeCommentFromDOM(payload.commentId);
            }
            break;
        case 'column_created':
            if (payload.projectId == projectId) {
                handleColumnCreated(payload.column);
            }
            break;
        case 'column_updated':
            if (payload.projectId == projectId) {
                handleColumnUpdated(payload.columnId, payload.name);
            }
            break;
        case 'column_deleted':
            if (payload.projectId == projectId) {
                handleColumnDeleted(payload.columnId);
            }
            break;
        case 'columns_reordered':
            break;
        case 'member_added':
            if (payload.projectId == projectId) {
                showToast(`New member added`);
            }
            break;
        case 'member_removed':
            if (payload.projectId == projectId) {
                showToast(`Member removed`);
            }
            break;
        case 'project_updated':
            break;
        case 'project_deleted':
            if (payload.projectId == projectId) {
                showToast('This project was deleted');
                window.location.href = '/dashboard';
            }
            break;
        case 'notification':
            fetchUnreadNotifications();
            updateNotificationBadgeFromSocket();
            break;
    }
}

function handleTaskCreated(task) {
    addTaskToColumn(task.column_id, task);
}

function handleTaskUpdated(task) {
    const card = document.getElementById(`task-${task.id}`);
    if (card) {
        card.innerHTML = `
            <div class="task-card-title">${task.title}</div>
            <div class="task-meta">
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                ${task.due_date ? `<span class="task-due ${isOverdue(task.due_date) ? 'due-overdue' : ''}">${formatDate(task.due_date)}</span>` : ''}
            </div>
            ${task.assigned_to_name ? `<div class="task-assignee">${task.assigned_to_name}</div>` : ''}
        `;
    }
}

function handleTaskMoved(taskId, columnId, position) {
    const card = document.getElementById(`task-${taskId}`);
    if (card) {
        const targetColumn = document.getElementById(`tasks-${columnId}`);
        if (targetColumn) {
            targetColumn.appendChild(card);
        }
    }
}

function handleTaskDeleted(taskId) {
    const card = document.getElementById(`task-${taskId}`);
    if (card) card.remove();
    if (currentTaskId == taskId) {
        closeModal(document.querySelector('#task-modal .btn-close'));
    }
}

function handleColumnCreated(column) {
    columns.push(column);
    renderBoard();
}

function handleColumnUpdated(columnId, name) {
    const col = columns.find(c => c.id == columnId);
    if (col) col.name = name;
    const titleEl = document.querySelector(`#column-${columnId} .column-title`);
    if (titleEl) titleEl.textContent = name;
}

function handleColumnDeleted(columnId) {
    columns = columns.filter(c => c.id != columnId);
    const colEl = document.getElementById(`column-${columnId}`);
    if (colEl) colEl.remove();
}

function updateCommentInDOM(commentId, content) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    // Could update the specific comment element
}

function removeCommentFromDOM(commentId) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    // Could remove the specific comment element
}

function fetchUnreadNotifications() {
    // Update notification badge
    updateNotificationBadgeFromSocket();
}

async function updateNotificationBadgeFromSocket() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    const count = await getUnreadCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

function closeModal(button) {
    button.closest('.modal-overlay').remove();
}
