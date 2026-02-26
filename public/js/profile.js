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
            if (role === 'super_admin') {
                document.getElementById('api-token').value = data.api_token || 'Nenhum token gerado';
            }
        }
    } catch (err) {
        console.error(err);
    }

    // Update Profile
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value;
        const email = document.getElementById('profile-email').value;
        const password = document.getElementById('profile-password').value;

        const body = { name, email };
        if (password) body.password = password;

        try {
            const res = await fetchWithAuth('/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                alert('Perfil atualizado com sucesso!');
                document.getElementById('profile-password').value = '';
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
