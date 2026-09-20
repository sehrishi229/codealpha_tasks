// Main app entry point
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();

    const navAuth = document.getElementById('nav-auth');
    if (navAuth) {
        if (user) {
            navAuth.innerHTML = `
                <span style="color:white; margin-right:1rem;">Welcome, ${user.full_name}</span>
                <a href="/dashboard" class="btn btn-secondary">Dashboard</a>
                <a href="#" class="btn btn-primary" id="logout-btn-nav">Logout</a>
            `;
            document.getElementById('logout-btn-nav').addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        } else {
            navAuth.innerHTML = `
                <a href="/login" class="btn btn-secondary">Login</a>
                <a href="/register" class="btn btn-primary">Register</a>
            `;
        }
    }

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
});
