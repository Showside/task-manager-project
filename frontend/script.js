// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentProject = null;             // для модалки участников
let loadProjectsFunction = null;       // не используется, оставлено для совместимости

// Базовый URL API (относительный, так как статика и API на одном сервере)
const API_BASE = '/api';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(elementId, text, isError = true) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.textContent = text;
        msgDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        msgDiv.style.color = isError ? '#ff8a8a' : '#8aff8a';
        msgDiv.style.padding = '12px 20px';
        msgDiv.style.borderRadius = '10px';
        msgDiv.style.fontWeight = '500';
        msgDiv.style.border = `1px solid ${isError ? '#ff6b6b' : '#6bff6b'}`;
        msgDiv.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        msgDiv.style.backdropFilter = 'blur(8px)';
        msgDiv.style.fontSize = '14px';
        msgDiv.style.textAlign = 'center';
        
        setTimeout(() => {
            msgDiv.textContent = '';
            msgDiv.style.backgroundColor = '';
            msgDiv.style.color = '';
            msgDiv.style.padding = '';
            msgDiv.style.borderRadius = '';
            msgDiv.style.border = '';
            msgDiv.style.boxShadow = '';
            msgDiv.style.backdropFilter = '';
        }, 3000);
    }
}

// Универсальный запрос к API с авторизацией
async function apiRequest(endpoint, options = {}) {
    const currentUser = localStorage.getItem('currentUser');
    const headers = {
        'Content-Type': 'application/json',
        ...(currentUser && { 'X-User': currentUser }),
        ...options.headers
    };
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    if (!response.ok) {
        let errorMsg = 'Ошибка запроса';
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
    }
    // Если статус 204 (No Content) или ответ пустой
    if (response.status === 204) return null;
    return response.json();
}

// ========== ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ HEADER ==========
function updateHeader() {
    const currentUser = localStorage.getItem('currentUser');
    const headerNav = document.getElementById('headerNav');   
    if (!headerNav) return;
    
    if (currentUser) {
        headerNav.innerHTML = `
            <div class="user-info">
                <div class="user-name" onclick="goToDashboard()" style="cursor: pointer;">
                    👤 ${escapeHtml(currentUser)}
                </div>
                <div class="logout-link" onclick="logout()">
                    Выйти
                </div>
            </div>
        `;
    } else {
        const currentPage = window.location.pathname.split('/').pop();
        let links = '';
        if (currentPage !== 'loginpage.html') {
            links += '<a href="loginpage.html">Вход</a>';
        }
        if (currentPage !== 'register.html') {
            links += '<a href="register.html">Регистрация</a>';
        }
        headerNav.innerHTML = links;
    }
}

function goToDashboard() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        window.location.href = 'projects.html';
    } else {
        alert('Пожалуйста, авторизуйтесь');
        window.location.href = 'loginpage.html';
    }
}

// ========== ГЛАВНАЯ СТРАНИЦА (index.html) ==========
const loginBtn = document.getElementById('goToLoginPage');
if (loginBtn) {
    loginBtn.onclick = () => {
        window.location.href = 'loginpage.html';
    };
}

const registerBtn = document.getElementById('goToRegisterPage');
if (registerBtn) {
    registerBtn.onclick = () => {
        window.location.href = 'register.html';
    };
}

const dashboardBtn = document.getElementById('goToDashboard');
if (dashboardBtn) {
    dashboardBtn.onclick = () => {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            window.location.href = 'projects.html';
        } else {
            alert('Пожалуйста, сначала авторизуйтесь!');
            window.location.href = 'loginpage.html';
        }
    };
}

// ========== СТРАНИЦА АВТОРИЗАЦИИ ==========
async function login(username, password) {
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        localStorage.setItem('currentUser', data.username);
        showMessage('loginMessage', 'Добро пожаловать!', false);
        setTimeout(() => {
            window.location.href = 'projects.html';
        }, 1000);
        return true;
    } catch (err) {
        showMessage('loginMessage', err.message);
        return false;
    }
}

if (document.getElementById('loginBtn')) {
    const loginFormBtn = document.getElementById('loginBtn');
    if (loginFormBtn) {
        loginFormBtn.onclick = async () => {
            const username = document.getElementById('loginUsername')?.value;
            const password = document.getElementById('loginPassword')?.value;
            if (username && password) {
                await login(username, password);
            } else {
                showMessage('loginMessage', 'Заполните все поля');
            }
        };
    }
    
    const loginInputs = document.querySelectorAll('#loginUsername, #loginPassword');
    loginInputs.forEach(input => {
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const username = document.getElementById('loginUsername')?.value;
                const password = document.getElementById('loginPassword')?.value;
                if (username && password) {
                    await login(username, password);
                } else {
                    showMessage('loginMessage', 'Заполните все поля');
                }
            }
        });
    });
}

// ========== СТРАНИЦА РЕГИСТРАЦИИ ==========
async function register(username, password, confirmPassword, email) {
    if (!username || !password || !confirmPassword || !email) {
        showMessage('regMessage', 'Заполните все поля');
        return false;
    }
    
    if (password !== confirmPassword) {
        showMessage('regMessage', 'Пароли не совпадают');
        return false;
    }
    
    if (password.length < 4) {
        showMessage('regMessage', 'Пароль должен содержать минимум 4 символа');
        return false;
    }
    
    if (!email.includes('@')) {
        showMessage('regMessage', 'Введите корректный email');
        return false;
    }
    
    try {
        await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, email })
        });
        showMessage('regMessage', 'Регистрация успешна! Перенаправляем на вход...', false);
        setTimeout(() => {
            window.location.href = 'loginpage.html';
        }, 2000);
        return true;
    } catch (err) {
        showMessage('regMessage', err.message);
        return false;
    }
}

if (document.getElementById('registerBtn')) {
    const registerFormBtn = document.getElementById('registerBtn');
    if (registerFormBtn) {
        registerFormBtn.onclick = async () => {
            const username = document.getElementById('regUsername')?.value;
            const password = document.getElementById('regPassword')?.value;
            const confirmPassword = document.getElementById('regConfirmPassword')?.value;
            const email = document.getElementById('regEmail')?.value;
            await register(username, password, confirmPassword, email);
        };
    }
    
    const regInputs = document.querySelectorAll('#regUsername, #regPassword, #regConfirmPassword, #regEmail');
    regInputs.forEach(input => {
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const username = document.getElementById('regUsername')?.value;
                const password = document.getElementById('regPassword')?.value;
                const confirmPassword = document.getElementById('regConfirmPassword')?.value;
                const email = document.getElementById('regEmail')?.value;
                await register(username, password, confirmPassword, email);
            }
        });
    });
}

// ========== СТРАНИЦА ПРОЕКТОВ (projects.html) ==========
if (document.getElementById('projectsContainer')) {
    let currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        alert('Пожалуйста, авторизуйтесь');
        window.location.href = 'loginpage.html';
    }
    
    // Загрузка и отображение проектов
    async function loadProjects() {
        try {
            const projects = await apiRequest('/projects');
            const container = document.getElementById('projectsGrid');
            
            if (projects.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#666;">У вас пока нет проектов. Создайте первый!</p>';
                return;
            }
            
            container.innerHTML = projects.map(project => {
                const isOwner = project.owner === currentUser;
                
                return `
                    <div class="project-card" onclick="openProject(${project.id})">
                        <h3>${escapeHtml(project.name)}</h3>
                        <p>${escapeHtml(project.description || 'Нет описания')}</p>
                        <div class="project-meta">
                            <span>📅 ${new Date(project.created_at).toLocaleDateString()}</span>
                            <span>👥 ${project.members ? project.members.length : 1} участников</span>
                        </div>
                        <div class="project-meta">
                            <span>👑 Владелец: ${escapeHtml(project.owner)}</span>
                        </div>
                        <div class="project-members">
                            <div class="members-list">
                                ${project.members ? project.members.slice(0, 3).map(member => `
                                    <span class="member-tag ${project.owner === member ? 'owner' : ''}">
                                        ${escapeHtml(member)} ${project.owner === member ? '👑' : ''}
                                    </span>
                                `).join('') : `<span class="member-tag">${escapeHtml(project.owner)} 👑</span>`}
                                ${project.members && project.members.length > 3 ? `<span class="member-tag">+${project.members.length - 3}</span>` : ''}
                            </div>
                        </div>
                        <div class="project-actions">
                            ${isOwner ? `
                                <button class="edit-project" onclick="event.stopPropagation(); editProject(${project.id})">✏️</button>
                                <button class="edit-project" onclick="event.stopPropagation(); openMembersModal(${project.id})" style="background-color: #667eea;">👥</button>
                                <button class="delete-project" onclick="event.stopPropagation(); deleteProject(${project.id})">🗑️</button>
                            ` : `
                                <button class="edit-project" onclick="event.stopPropagation(); openProject(${project.id})" style="background-color: #667eea;">📋 Открыть</button>
                            `}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error(err);
            alert('Ошибка загрузки проектов');
        }
    }
    
    window.openProject = (projectId) => {
        localStorage.setItem('currentProject', projectId);
        window.location.href = 'task.html';
    };
    
    window.editProject = async (projectId) => {
        try {
            const project = await apiRequest(`/projects/${projectId}`);
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectDescription').value = project.description || '';
            document.getElementById('modalTitle').textContent = 'Редактировать проект';
            document.getElementById('projectModal').classList.add('active');
            
            const saveBtn = document.getElementById('saveProjectBtn');
            saveBtn.onclick = async () => {
                const name = document.getElementById('projectName').value;
                const description = document.getElementById('projectDescription').value;
                await apiRequest(`/projects/${projectId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name, description })
                });
                closeModal();
                loadProjects();
            };
        } catch (err) {
            alert('Ошибка загрузки проекта');
        }
    };
    
    window.deleteProject = async (projectId) => {
        if (confirm('Вы уверены, что хотите удалить проект? Все задачи также будут удалены!')) {
            try {
                await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
                loadProjects();
            } catch (err) {
                alert('Ошибка удаления');
            }
        }
    };
    
    // Модальное окно для создания/редактирования проекта
    const modal = document.getElementById('projectModal');
    const createBtn = document.getElementById('createProjectBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const saveBtn = document.getElementById('saveProjectBtn');
    
    if (createBtn) {
        createBtn.onclick = () => {
            document.getElementById('projectName').value = '';
            document.getElementById('projectDescription').value = '';
            document.getElementById('modalTitle').textContent = 'Создать проект';
            modal.classList.add('active');
        };
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = closeModal;
    }
    
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const name = document.getElementById('projectName').value;
            const description = document.getElementById('projectDescription').value;
            
            if (!name) {
                alert('Введите название проекта');
                return;
            }
            
            try {
                await apiRequest('/projects', {
                    method: 'POST',
                    body: JSON.stringify({ name, description })
                });
                closeModal();
                loadProjects();
            } catch (err) {
                alert('Ошибка создания проекта');
            }
        };
    }
    
    function closeModal() {
        modal.classList.remove('active');
    }
    window.closeModal = closeModal;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Загружаем проекты при старте
    loadProjects();
}

// ========== УПРАВЛЕНИЕ УЧАСТНИКАМИ ПРОЕКТА ==========
let currentMembersProject = null;

// Загрузить участников в выпадающий список при создании/редактировании задачи
async function loadProjectMembersForTask(projectId) {
    try {
        const project = await apiRequest(`/projects/${projectId}`);
        const assigneeSelect = document.getElementById('taskAssignee');
        if (!assigneeSelect) return;
        
        assigneeSelect.innerHTML = '<option value="">Не назначен</option>';
        if (project && project.members) {
            project.members.forEach(member => {
                assigneeSelect.innerHTML += `<option value="${escapeHtml(member)}">${escapeHtml(member)}</option>`;
            });
        }
    } catch (err) {
        console.error('Ошибка загрузки участников для задачи', err);
    }
}

window.openMembersModal = async (projectId) => {
    try {
        const project = await apiRequest(`/projects/${projectId}`);
        if (!project) return;
        
        currentMembersProject = project;
        document.getElementById('membersProjectName').textContent = project.name;
        document.getElementById('membersModal').classList.add('active');
        
        document.getElementById('newMemberLogin').value = '';
        document.getElementById('memberMessage').textContent = '';
        
        await loadMembersList(projectId);
    } catch (err) {
        alert('Ошибка загрузки данных проекта');
    }
};

async function loadMembersList(projectId) {
    try {
        const project = await apiRequest(`/projects/${projectId}`);
        if (!project) return;
        
        const container = document.getElementById('membersList');
        const currentUser = localStorage.getItem('currentUser');
        const isOwner = project.owner === currentUser;
        
        if (!project.members || project.members.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999;">Нет участников</p>';
            return;
        }
        
        container.innerHTML = project.members.map(member => {
            return `
                <div class="members-modal-item">
                    <div class="member-info">
                        <div class="member-avatar">${member.charAt(0).toUpperCase()}</div>
                        <div class="member-details">
                            <div class="member-login">${escapeHtml(member)}</div>
                            <div class="member-role ${project.owner === member ? 'owner' : ''}">
                                ${project.owner === member ? '👑 Владелец' : '👤 Участник'}
                            </div>
                        </div>
                    </div>
                    ${isOwner && project.owner !== member ? `
                        <button class="remove-member-btn" onclick="removeMember(${projectId}, '${member.replace(/'/g, "\\'")}')">
                            🗑️ Удалить
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        alert('Ошибка загрузки участников');
    }
}

window.addMember = async (projectId, username) => {
    const messageDiv = document.getElementById('memberMessage');
    
    try {
        await apiRequest(`/members/${projectId}`, {
            method: 'POST',
            body: JSON.stringify({ username })
        });
        
        // Обновляем currentMembersProject
        currentMembersProject = await apiRequest(`/projects/${projectId}`);
        
        await loadMembersList(projectId);
        
        messageDiv.textContent = `Пользователь "${username}" добавлен в проект`;
        messageDiv.className = 'member-message success';
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'member-message';
        }, 2000);
        
        document.getElementById('newMemberLogin').value = '';
        
        // Обновляем список проектов на главной странице проектов
        if (document.getElementById('projectsContainer')) {
            loadProjects();  // функция из области видимости projects.html
        }
    } catch (err) {
        messageDiv.textContent = err.message;
        messageDiv.className = 'member-message error';
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'member-message';
        }, 3000);
    }
};

window.removeMember = async (projectId, username) => {
    if (!confirm(`Удалить пользователя "${username}" из проекта?`)) return;
    
    try {
        await apiRequest(`/members/${projectId}/${encodeURIComponent(username)}`, { method: 'DELETE' });
        
        currentMembersProject = await apiRequest(`/projects/${projectId}`);
        await loadMembersList(projectId);
        
        if (document.getElementById('projectsContainer')) {
            loadProjects();
        }
        
        const messageDiv = document.getElementById('memberMessage');
        if (messageDiv) {
            messageDiv.textContent = `Пользователь "${username}" удален из проекта`;
            messageDiv.className = 'member-message success';
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'member-message';
            }, 2000);
        }
    } catch (err) {
        alert('Ошибка при удалении участника');
    }
};

window.closeMembersModal = () => {
    document.getElementById('membersModal').classList.remove('active');
    currentMembersProject = null;
};

// Обработчики для модального окна участников
document.addEventListener('DOMContentLoaded', () => {
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) {
        addMemberBtn.onclick = async () => {
            if (!currentMembersProject) return;
            const username = document.getElementById('newMemberLogin').value.trim();
            if (username) {
                await window.addMember(currentMembersProject.id, username);
            } else {
                const messageDiv = document.getElementById('memberMessage');
                messageDiv.textContent = 'Введите логин пользователя';
                messageDiv.className = 'member-message error';
                setTimeout(() => {
                    messageDiv.textContent = '';
                    messageDiv.className = 'member-message';
                }, 2000);
            }
        };
    }
    
    const newMemberInput = document.getElementById('newMemberLogin');
    if (newMemberInput) {
        newMemberInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && currentMembersProject) {
                const username = newMemberInput.value.trim();
                if (username) {
                    await window.addMember(currentMembersProject.id, username);
                }
            }
        });
    }
});

const membersModal = document.getElementById('membersModal');
if (membersModal) {
    membersModal.addEventListener('click', (e) => {
        if (e.target === membersModal) window.closeMembersModal();
    });
}

// ========== СТРАНИЦА ЗАДАЧ (task.html) ==========
if (document.getElementById('kanbanBoard')) {
    let currentUser = localStorage.getItem('currentUser');
    let projectId = localStorage.getItem('currentProject');
    
    if (!currentUser) {
        alert('Пожалуйста, авторизуйтесь');
        window.location.href = 'loginpage.html';
    }
    
    if (!projectId) {
        alert('Выберите проект');
        window.location.href = 'projects.html';
    }
    
    // Загружаем информацию о проекте и задачи
    (async () => {
        try {
            const project = await apiRequest(`/projects/${projectId}`);
            if (project) {
                document.getElementById('projectTitle').textContent = project.name;
            }
            await loadTasks();
        } catch (err) {
            alert('Ошибка загрузки проекта');
        }
    })();
    
    async function loadTasks() {
        try {
            const tasks = await apiRequest(`/tasks/project/${projectId}`);
            
            const todoTasks = tasks.filter(t => t.status === 'todo');
            const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
            const doneTasks = tasks.filter(t => t.status === 'done');
            
            renderColumn('todo', todoTasks);
            renderColumn('in-progress', inProgressTasks);
            renderColumn('done', doneTasks);
        } catch (err) {
            console.error(err);
            alert('Ошибка загрузки задач');
        }
    }
    
    function renderColumn(columnId, tasks) {
        const container = document.getElementById(`${columnId}-tasks`);
        if (!container) return;
        
        if (tasks.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Нет задач</p>';
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div class="task-card" draggable="true" data-task-id="${task.id}" ondragstart="dragStart(event)" ondragend="dragEnd(event)">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-description">${escapeHtml(task.description || '')}</div>
                <div class="task-meta">
                    <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
                    ${task.deadline ? `<span class="task-deadline">📅 ${new Date(task.deadline).toLocaleDateString()}</span>` : ''}
                </div>
                ${task.assigned_to ? `<div class="task-meta" style="margin-top: 5px;"><span>👤 ${escapeHtml(task.assigned_to)}</span></div>` : ''}
                <div class="task-actions" style="margin-top:8px;">
                    <button class="edit-task" onclick="editTask(${task.id})" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button class="delete-task" onclick="deleteTask(${task.id})" style="background:none; border:none; cursor:pointer; color:#dc3545;">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    function getPriorityText(priority) {
        switch(priority) {
            case 'high': return '🔴 Высокий';
            case 'medium': return '🟡 Средний';
            case 'low': return '🟢 Низкий';
            default: return priority;
        }
    }
    
    window.dragStart = (e) => {
        e.dataTransfer.setData('taskId', e.target.closest('.task-card').dataset.taskId);
        e.target.closest('.task-card').style.opacity = '0.5';
    };
    
    window.dragEnd = (e) => {
        e.target.closest('.task-card').style.opacity = '1';
    };
    
    window.dropTask = async (e, newStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            try {
                await apiRequest(`/tasks/${taskId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });
                await loadTasks();
            } catch (err) {
                alert('Ошибка перемещения задачи');
            }
        }
    };
    
    window.dragOver = (e) => {
        e.preventDefault();
    };
    
    window.editTask = async (taskId) => {
        try {
            const task = await apiRequest(`/tasks/${taskId}`);
            if (!task) return;
            
            await loadProjectMembersForTask(parseInt(projectId));
            
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskDeadline').value = task.deadline ? task.deadline.split('T')[0] : '';
            document.getElementById('taskAssignee').value = task.assigned_to || '';
            
            document.getElementById('taskModal').classList.add('active');
            
            const saveTaskBtn = document.getElementById('saveTaskBtn');
            saveTaskBtn.onclick = async () => {
                const title = document.getElementById('taskTitle').value;
                const description = document.getElementById('taskDescription').value;
                const priority = document.getElementById('taskPriority').value;
                const deadline = document.getElementById('taskDeadline').value;
                const assignedTo = document.getElementById('taskAssignee').value || null;
                
                if (!title) {
                    alert('Введите название задачи');
                    return;
                }
                
                await apiRequest(`/tasks/${taskId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        title,
                        description,
                        priority,
                        deadline: deadline || null,
                        assignedTo: assignedTo
                    })
                });
                
                closeTaskModal();
                await loadTasks();
            };
        } catch (err) {
            alert('Ошибка загрузки задачи');
        }
    };
    
    window.deleteTask = async (taskId) => {
        if (confirm('Удалить задачу?')) {
            try {
                await apiRequest(`/tasks/${taskId}`, { method: 'DELETE' });
                await loadTasks();
            } catch (err) {
                alert('Ошибка удаления задачи');
            }
        }
    };
    
    window.openCreateTaskModal = async () => {
        await loadProjectMembersForTask(parseInt(projectId));
        
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('taskPriority').value = 'medium';
        document.getElementById('taskDeadline').value = '';
        document.getElementById('taskAssignee').value = '';
        
        document.getElementById('taskModal').classList.add('active');
        
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        saveTaskBtn.onclick = async () => {
            const title = document.getElementById('taskTitle').value;
            const description = document.getElementById('taskDescription').value;
            const priority = document.getElementById('taskPriority').value;
            const deadline = document.getElementById('taskDeadline').value;
            const assignedTo = document.getElementById('taskAssignee').value || null;
            
            if (!title) {
                alert('Введите название задачи');
                return;
            }
            
            try {
                await apiRequest('/tasks', {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        description,
                        priority,
                        deadline: deadline || null,
                        assignedTo: assignedTo,
                        projectId: parseInt(projectId),
                        status: 'todo'
                    })
                });
                closeTaskModal();
                await loadTasks();
            } catch (err) {
                alert('Ошибка создания задачи');
            }
        };
    };
    
    function closeTaskModal() {
        document.getElementById('taskModal').classList.remove('active');
    }
    window.closeTaskModal = closeTaskModal;
    
    const taskModal = document.getElementById('taskModal');
    if (taskModal) {
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) closeTaskModal();
        });
    }
}

// ========== ВЫХОД ИЗ СИСТЕМЫ ==========
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentProject');
    alert('Вы вышли из системы');
    updateHeader();
    window.location.href = 'index.html';
}

window.logout = logout;

// Вызываем обновление header при загрузке любой страницы
document.addEventListener('DOMContentLoaded', () => {
    updateHeader();
});