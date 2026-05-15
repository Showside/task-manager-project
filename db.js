// db.js - Модуль для работы с IndexedDB

class TaskDatabase {
    constructor() {
        this.dbName = 'TaskBoardDB';
        this.dbVersion = 2;
        this.db = null;
    }

    // ========== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ==========
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Ошибка открытия БД:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('База данных успешно открыта');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Обновление структуры БД...');
                
                // Создаем хранилище для пользователей
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'username' });
                    userStore.createIndex('email', 'email', { unique: true });
                    console.log('Создано хранилище users');
                }
                
                // Создаем хранилище для проектов
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
                    projectStore.createIndex('owner', 'owner', { unique: false });
                    projectStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('Создано хранилище projects');
                }
                
                // Создаем хранилище для задач
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
                    taskStore.createIndex('projectId', 'projectId', { unique: false });
                    taskStore.createIndex('status', 'status', { unique: false });
                    taskStore.createIndex('assignedTo', 'assignedTo', { unique: false });
                    taskStore.createIndex('priority', 'priority', { unique: false });
                    console.log('Создано хранилище tasks');
                }
            };
        });
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ========== ПОЛЬЗОВАТЕЛИ ==========
    
    async createUser(username, password, email) {
        const passwordHash = await this.hashPassword(password);
        
        const user = {
            username: username,
            passwordHash: passwordHash,
            email: email,
            createdAt: new Date().toISOString(),
            role: 'user'
        };
        
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.add(user);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(user);
        });
    }
    
    async getUser(username) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.get(username);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    
    async verifyUser(username, password) {
        const user = await this.getUser(username);
        if (!user) return false;
        
        const passwordHash = await this.hashPassword(password);
        return user.passwordHash === passwordHash;
    }
    
    async getAllUsers() {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const users = [];
            const request = store.openCursor();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    users.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(users);
                }
            };
        });
    }

    // ========== ПРОЕКТЫ ==========
    
    async createProject(project) {
        const transaction = this.db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        
        const projectData = {
            name: project.name,
            description: project.description || '',
            owner: project.owner,
            members: project.members || [project.owner],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(projectData);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                projectData.id = request.result;
                resolve(projectData);
            };
        });
    }
    
    async getAllProjects() {
        const transaction = this.db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        
        return new Promise((resolve, reject) => {
            const projects = [];
            const request = store.openCursor();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    projects.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(projects);
                }
            };
        });
    }
    
    async getUserProjects(username) {
        const transaction = this.db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        
        return new Promise((resolve, reject) => {
            const projects = [];
            const request = store.openCursor();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const project = cursor.value;
                    // Проверяем, является ли пользователь владельцем ИЛИ участником
                    if (project.owner === username || (project.members && project.members.includes(username))) {
                        projects.push(project);
                    }
                    cursor.continue();
                } else {
                    resolve(projects);
                }
            };
        });
    }
    
    async getProjectById(id) {
        const transaction = this.db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    
    async updateProject(id, updates) {
        const transaction = this.db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const project = request.result;
                if (!project) {
                    reject(new Error('Проект не найден'));
                    return;
                }
                
                Object.assign(project, updates, { updatedAt: new Date().toISOString() });
                
                const updateRequest = store.put(project);
                updateRequest.onerror = () => reject(updateRequest.error);
                updateRequest.onsuccess = () => resolve(project);
            };
        });
    }
    
    async deleteProject(id) {
        // Сначала удаляем все задачи проекта
        const tasks = await this.getProjectTasks(id);
        for (const task of tasks) {
            await this.deleteTask(task.id);
        }
        
        const transaction = this.db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    // ========== ЗАДАЧИ ==========
    
    async createTask(task) {
        const transaction = this.db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        
        const taskData = {
            title: task.title,
            description: task.description || '',
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            projectId: task.projectId,
            assignedTo: task.assignedTo || null,
            createdBy: task.createdBy,
            createdAt: new Date().toISOString(),
            deadline: task.deadline || null,
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(taskData);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                taskData.id = request.result;
                resolve(taskData);
            };
        });
    }
    
    async getProjectTasks(projectId) {
        const transaction = this.db.transaction(['tasks'], 'readonly');
        const store = transaction.objectStore('tasks');
        const index = store.index('projectId');
        
        return new Promise((resolve, reject) => {
            const tasks = [];
            const request = index.openCursor(IDBKeyRange.only(projectId));
            
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    tasks.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(tasks);
                }
            };
        });
    }
    
    async getTaskById(id) {
        const transaction = this.db.transaction(['tasks'], 'readonly');
        const store = transaction.objectStore('tasks');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    
    async updateTask(id, updates) {
        const transaction = this.db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const task = request.result;
                if (!task) {
                    reject(new Error('Задача не найдена'));
                    return;
                }
                
                Object.assign(task, updates, { updatedAt: new Date().toISOString() });
                
                const updateRequest = store.put(task);
                updateRequest.onerror = () => reject(updateRequest.error);
                updateRequest.onsuccess = () => resolve(task);
            };
        });
    }
    
    async deleteTask(id) {
        const transaction = this.db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }
    
    async getTasksByStatus(projectId, status) {
        const allTasks = await this.getProjectTasks(projectId);
        return allTasks.filter(task => task.status === status);
    }
    
    async getUserTasks(username) {
        const transaction = this.db.transaction(['tasks'], 'readonly');
        const store = transaction.objectStore('tasks');
        const index = store.index('assignedTo');
        
        return new Promise((resolve, reject) => {
            const tasks = [];
            const request = index.openCursor(IDBKeyRange.only(username));
            
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    tasks.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(tasks);
                }
            };
        });
    }
}

// Создаем глобальный экземпляр
window.taskDB = new TaskDatabase();