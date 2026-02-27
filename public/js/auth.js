document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    if (data.avatar_path) localStorage.setItem('avatar_path', data.avatar_path);

                    if (['super_admin', 'coordenador', 'professor'].includes(data.role)) {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/student.html';
                    }
                } else {
                    alert(data.error || 'Login failed');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred during login');
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('avatar_path');
            window.location.href = '/';
        });
    }

    // Apply global dynamic avatars
    const savedAvatar = localStorage.getItem('avatar_path');
    if (savedAvatar) {
        document.querySelectorAll('.dynamic-avatar').forEach(img => {
            img.src = savedAvatar;
        });
    }
});
