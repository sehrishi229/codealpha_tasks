// Authentication utilities
const API_URL = '/api';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function removeUser() {
    localStorage.removeItem('user');
}

function isLoggedIn() {
    return !!getToken();
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        }
    };
    const response = await fetch(`${API_URL}${endpoint}`, config);
    return response;
}

function showError(message, element) {
    if (element) {
        element.textContent = message;
        element.classList.remove('hidden');
    }
}

function hideError(element) {
    if (element) element.classList.add('hidden');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notif-count');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

async function fetchUnreadNotifications() {
    try {
        const response = await apiRequest('/notifications/unread');
        if (response.ok) {
            const data = await response.json();
            updateNotificationBadge(data.count);
        }
    } catch (e) {
        console.error('Failed to fetch notifications', e);
    }
}

function checkAuth() {
    const protectedPages = ['/dashboard', '/project/'];
    const currentPath = window.location.pathname;

    const isProtected = protectedPages.some(page => currentPath.startsWith(page));
    if (isProtected && !isLoggedIn()) {
        window.location.href = '/login';
    }
}

function logout() {
    removeToken();
    removeUser();
    window.location.href = '/login';
}

function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarUrl(user) {
    if (user.profile_picture && user.profile_picture !== 'default-avatar.png') {
        return `/images/${user.profile_picture}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random&size=40`;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
}

// Initialize auth state on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Setup login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    setToken(data.token);
                    setUser(data.user);
                    window.location.href = '/dashboard';
                } else {
                    showError(data.error || 'Login failed', document.querySelector('.error-message') || createErrorElement());
                }
            } catch (err) {
                showError('Network error', createErrorElement());
            }
        });
    }

    // Setup register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const full_name = document.getElementById('full_name').value;
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, full_name })
                });

                const data = await response.json();

                if (response.ok) {
                    setToken(data.token);
                    setUser(data.user);
                    window.location.href = '/dashboard';
                } else {
                    showError(data.error || 'Registration failed', createErrorElement());
                }
            } catch (err) {
                showError('Network error', createErrorElement());
            }
        });
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Update user info display
    const user = getUser();
    if (user) {
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            const initials = getInitials(user.full_name);
            const avatarUrl = user.profile_picture && user.profile_picture !== 'default-avatar.png'
                ? `/images/${user.profile_picture}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random&size=40`;
            userInfo.innerHTML = `
                <img src="${avatarUrl}" alt="${user.full_name}">
                <span class="name">${user.full_name}</span>
            `;
        }
    }

    // Update hero buttons if on home page
    const heroButtons = document.getElementById('hero-buttons');
    if (heroButtons) {
        if (user) {
            heroButtons.innerHTML = `<a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>`;
        } else {
            heroButtons.innerHTML = `
                <a href="/login" class="btn btn-secondary">Login</a>
                <a href="/register" class="btn btn-primary">Get Started</a>
            `;
        }
    }

    // Fetch notification count if on dashboard/project pages
    if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/project')) {
        fetchUnreadNotifications();
    }
});

function createErrorElement() {
    const existing = document.querySelector('.error-message');
    if (existing) return existing;

    const el = document.createElement('div');
    el.className = 'error-message hidden';
    const form = document.querySelector('form');
    if (form) form.parentNode.insertBefore(el, form.nextSibling);
    return el;
}
