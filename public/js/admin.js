document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('role');
    if (!['super_admin', 'coordenador', 'professor'].includes(role)) {
        window.location.href = '/';
        return;
    }

    // Update Role Label
    const roleLabel = document.getElementById('admin-role-label');
    if (roleLabel) {
        if (role === 'super_admin') roleLabel.textContent = '| Super Admin';
        else if (role === 'coordenador') roleLabel.textContent = '| Coordenador';
        else if (role === 'professor') roleLabel.textContent = '| Professor';
    }

    // Hide sections based on role
    if (role !== 'super_admin') {
        const btnFinance = document.getElementById('btn-finance');
        const btnSettings = document.getElementById('btn-settings');
        if (btnFinance) btnFinance.style.display = 'none';
        if (btnSettings) btnSettings.style.display = 'none';
    } else {
        loadFinance();
        loadAdminSettings();
    }

    loadModules();

    // Module Form
    document.getElementById('module-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('mod-title').value;
        const description = document.getElementById('mod-desc').value;

        try {
            const res = await fetchWithAuth('/modules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description })
            });

            if (res.ok) {
                document.getElementById('module-modal').classList.add('hidden');
                document.getElementById('module-form').reset();
                loadModules();
            } else {
                alert('Erro ao criar módulo');
            }
        } catch (err) { console.error(err); }
    });

    // Lesson Form (with Video Upload)
    document.getElementById('lesson-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const moduleId = document.getElementById('les-mod-id').value;
        const title = document.getElementById('les-title').value;
        const videoInput = document.getElementById('les-video').files[0];
        const pdfInput = document.getElementById('les-pdf').files[0];
        const submitBtn = document.getElementById('les-submit-btn');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        try {
            // 1. Upload lesson data and get lesson ID
            const lessonFormData = new FormData();
            lessonFormData.append('module_id', moduleId);
            lessonFormData.append('title', title);
            if (pdfInput) lessonFormData.append('pdf', pdfInput);

            const resLes = await fetchWithAuth('/lessons', {
                method: 'POST',
                body: lessonFormData
            });

            if (resLes.ok) {
                const data = await resLes.json();
                const lessonId = data.id;

                if (videoInput) {
                    submitBtn.textContent = 'Processando vídeo HLS...';
                    const videoFormData = new FormData();
                    videoFormData.append('lesson_id', lessonId);
                    videoFormData.append('video', videoInput);

                    await fetchWithAuth('/video/upload', {
                        method: 'POST',
                        body: videoFormData
                    });
                }

                alert('Aula salva com sucesso!');
                document.getElementById('lesson-modal').classList.add('hidden');
                document.getElementById('lesson-form').reset();
                loadModules();
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar aula');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar';
        }
    });

    // Finance Form
    document.getElementById('charge-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            student_id: document.getElementById('chg-student').value,
            description: document.getElementById('chg-desc').value,
            amount: document.getElementById('chg-amount').value,
            due_date: document.getElementById('chg-date').value
        };

        try {
            const res = await fetchWithAuth('/finance/charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                document.getElementById('charge-modal').classList.add('hidden');
                document.getElementById('charge-form').reset();
                loadFinance();
            }
        } catch (err) { console.error(err); }
    });

    // Settings Form
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('platform_name', document.getElementById('set-platform-name').value);
        fd.append('primary_color', document.getElementById('set-primary-color').value);
        fd.append('secondary_color', document.getElementById('set-secondary-color').value);

        const logo = document.getElementById('set-logo').files[0];
        if (logo) fd.append('logo', logo);

        try {
            const res = await fetchWithAuth('/settings', {
                method: 'PUT',
                body: fd
            });
            if (res.ok) {
                alert('Configurações atualizadas!');
                loadSettings(); // re-applies css vars locally
            }
        } catch (err) { console.error(err); }
    });

    // Question Form
    document.getElementById('question-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const correctRadio = document.querySelector('input[name="q-correct"]:checked');
        if (!correctRadio) {
            alert('Selecione a opção correta!');
            return;
        }

        const body = {
            lesson_id: document.getElementById('q-les-id').value || null,
            module_id: document.getElementById('q-mod-id').value || null,
            type: 'multiple_choice',
            question_text: document.getElementById('q-text').value,
            option_a: document.getElementById('q-opt-a').value,
            option_b: document.getElementById('q-opt-b').value,
            option_c: document.getElementById('q-opt-c').value,
            option_d: document.getElementById('q-opt-d').value,
            correct_option: correctRadio.value
        };

        try {
            const res = await fetchWithAuth('/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                alert('Pergunta salva com sucesso!');
                document.getElementById('question-modal').classList.add('hidden');
                document.getElementById('question-form').reset();
            } else {
                alert('Erro ao salvar pergunta');
            }
        } catch (err) { console.error(err); }
    });
});

function showTab(tab) {
    document.getElementById('tab-courses').classList.add('hidden');
    document.getElementById('tab-finance').classList.add('hidden');
    document.getElementById('tab-settings').classList.add('hidden');

    document.getElementById(`tab-${tab}`).classList.remove('hidden');
}

async function loadModules() {
    try {
        const res = await fetchWithAuth('/modules');
        if (res.ok) {
            const modules = await res.json();
            const list = document.getElementById('modules-list');
            list.innerHTML = modules.map(m => `
                <div class="border rounded p-4 mb-4">
                    <div class="flex items-center justify-between border-b pb-2 mb-2">
                        <h3 class="font-bold text-lg">${m.title}</h3>
                        <div class="space-x-2">
                            <button onclick="openQuestionModal(null, ${m.id})" class="text-sm bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">+ Avaliação do Módulo</button>
                            <button onclick="openLessonModal(${m.id})" class="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">+ Nova Aula</button>
                        </div>
                    </div>
                    <ul class="text-sm text-gray-700 pl-4 border-l-2 border-gray-200 space-y-2">
                        ${m.lessons.map(l => `
                            <li class="flex justify-between items-center bg-gray-50 p-2 rounded">
                                <span>- ${l.title}</span>
                                <button onclick="openQuestionModal(${l.id}, ${m.id})" class="text-xs text-blue-600 hover:underline">+ Add Pergunta</button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function loadFinance() {
    try {
        const res = await fetchWithAuth('/finance');
        if (res.ok) {
            const charges = await res.json();
            const list = document.getElementById('finance-list');
            list.innerHTML = charges.map(c => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${c.student_email}<br><small>ID: ${c.student_id}</small></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${c.description}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ ${c.amount}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${c.status}</td>
                </tr>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function loadAdminSettings() {
    try {
        const res = await fetch('/api/settings/public');
        if (res.ok) {
            const settings = await res.json();
            if (settings.platform_name) document.getElementById('set-platform-name').value = settings.platform_name;
            if (settings.primary_color) document.getElementById('set-primary-color').value = settings.primary_color;
            if (settings.secondary_color) document.getElementById('set-secondary-color').value = settings.secondary_color;
        }
    } catch (err) { console.error(err); }
}

function openLessonModal(moduleId) {
    document.getElementById('les-mod-id').value = moduleId;
    document.getElementById('lesson-modal').classList.remove('hidden');
}

function openQuestionModal(lessonId, moduleId) {
    document.getElementById('question-form').reset();
    document.getElementById('q-les-id').value = lessonId || '';
    document.getElementById('q-mod-id').value = moduleId || '';
    document.getElementById('question-modal').classList.remove('hidden');
}
