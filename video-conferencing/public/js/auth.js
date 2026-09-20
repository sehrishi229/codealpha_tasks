class Auth {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.init();
  }

  init() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    this.clearErrors();

    if (!this.validateEmail(email)) {
      this.showError('emailError', 'Please enter a valid email address');
      return;
    }
    if (password.length < 1) {
      this.showError('passwordError', 'Password is required');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          data.errors.forEach(err => {
            if (err.path === 'email') this.showError('emailError', err.msg);
            if (err.path === 'password') this.showError('passwordError', err.msg);
          });
        } else {
          this.showError('formError', data.error || 'Login failed');
        }
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      this.showError('formError', 'Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const displayName = form.display_name.value.trim();

    this.clearErrors();

    if (username.length < 3) {
      this.showError('usernameError', 'Username must be at least 3 characters');
      return;
    }
    if (!this.validateEmail(email)) {
      this.showError('emailError', 'Please enter a valid email address');
      return;
    }
    if (displayName.length < 1) {
      this.showError('displayNameError', 'Display name is required');
      return;
    }
    if (password.length < 8) {
      this.showError('passwordError', 'Password must be at least 8 characters');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, display_name: displayName }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          data.errors.forEach(err => {
            this.showError('formError', err.msg);
          });
        } else {
          this.showError('formError', data.error || 'Registration failed');
        }
        return;
      }

      window.location.href = '/login';
    } catch (err) {
      this.showError('formError', 'Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';
    }
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.classList.add('visible');
    }
  }

  clearErrors() {
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
  }

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

const auth = new Auth();