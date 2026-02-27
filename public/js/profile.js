document.addEventListener('DOMContentLoaded', async () => {
    const role = localStorage.getItem('role');
    if (!role) {
        window.location.href = '/';
        return;
    }

    if (role === 'super_admin') {
        document.getElementById('admin-api-section').classList.remove('hidden');
    }

    // Load Profile
    try {
        const res = await fetchWithAuth('/profile');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('profile-name').value = data.name;
            document.getElementById('profile-email').value = data.email;
            if (data.avatar_path) {
                document.getElementById('profile-avatar-preview').src = data.avatar_path;
            } else {
                document.getElementById('profile-avatar-preview').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`;
            }

            // Also update the UI navbar if the avatar matches the local one, keeping it in sync
            localStorage.setItem('avatar_path', data.avatar_path || '');
            if (role === 'super_admin') {
                document.getElementById('api-token').value = data.api_token || 'Nenhum token gerado';
            }
        }
    } catch (err) {
        console.error(err);
    }

    // Preview Image on Select
    const avatarInput = document.getElementById('profile-avatar');
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('profile-avatar-preview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Update Profile
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value;
        const email = document.getElementById('profile-email').value;
        const password = document.getElementById('profile-password').value;
        const avatarFile = document.getElementById('profile-avatar').files[0];

        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        if (password) formData.append('password', password);
        if (avatarFile) formData.append('avatar', avatarFile);

        try {
            const res = await fetchWithAuth('/profile', {
                method: 'PUT',
                body: formData // Body is directly FormData now instead of JSON
            });
            if (res.ok) {
                alert('Perfil atualizado com sucesso!');
                document.getElementById('profile-password').value = '';
                // Refresh to trigger avatar visual refresh everywhere
                window.location.reload();
            } else {
                alert('Erro ao atualizar perfil');
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Generate Token
    const generateBtn = document.getElementById('generate-token-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            if (confirm('Gerar um novo token invalidará o token anterior. Continuar?')) {
                try {
                    const res = await fetchWithAuth('/user/generate-token', { method: 'POST' });
                    if (res.ok) {
                        const data = await res.json();
                        document.getElementById('api-token').value = data.api_token;
                        alert('Novo token gerado com sucesso!');
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });
    }
});
