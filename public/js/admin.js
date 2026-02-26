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

    loadDashboard();
    loadModules();
    loadGrades();

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
        fd.append('lgpd_terms', document.getElementById('set-lgpd-terms').value);

        const logo = document.getElementById('set-logo').files[0];
        if (logo) fd.append('logo', logo);

        const loginBg = document.getElementById('set-login-bg').files[0];
        if (loginBg) fd.append('login_bg', loginBg);

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
    document.getElementById('tab-dashboard').classList.add('hidden');
    document.getElementById('tab-courses').classList.add('hidden');
    document.getElementById('tab-grades').classList.add('hidden');
    document.getElementById('tab-finance').classList.add('hidden');
    document.getElementById('tab-settings').classList.add('hidden');

    document.getElementById(`tab-${tab}`).classList.remove('hidden');

    // Reset button styles
    ['btn-dashboard', 'btn-courses', 'btn-grades', 'btn-finance', 'btn-settings'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('bg-gray-100', 'text-gray-800');
            btn.classList.add('text-gray-600');
        }
    });

    // Active button style
    const activeBtn = document.getElementById(`btn-${tab}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600');
        activeBtn.classList.add('bg-gray-100', 'text-gray-800');
    }
}

async function loadModules() {
    try {
        const res = await fetchWithAuth('/modules');
        if (res.ok) {
            const modules = await res.json();
            const list = document.getElementById('modules-list');
            list.innerHTML = modules.map(m => `
                <div class="border dark:border-gray-700 rounded p-4 mb-4 transition-colors duration-200">
                    <div class="flex items-center justify-between border-b dark:border-gray-700 pb-2 mb-2">
                        <h3 class="font-bold text-lg dark:text-gray-100">${m.title}</h3>
                        <div class="space-x-2">
                            <button onclick="openQuestionModal(null, ${m.id})" class="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-800 transition">+ Avaliação do Módulo</button>
                            <button onclick="openLessonModal(${m.id})" class="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition">+ Nova Aula</button>
                        </div>
                    </div>
                    <ul class="text-sm text-gray-700 dark:text-gray-300 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">
                        ${m.lessons.map(l => `
                            <li class="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded transition-colors duration-200">
                                <span class="dark:text-gray-200">- ${l.title}</span>
                                <button onclick="openQuestionModal(${l.id}, ${m.id})" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Add Pergunta</button>
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
                <tr class="transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${c.student_email}<br><small class="text-gray-500 dark:text-gray-400">ID: ${c.student_id}</small></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${c.description}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">R$ ${c.amount}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${c.status}</td>
                </tr>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function loadGrades() {
    try {
        const res = await fetchWithAuth('/grades');
        if (res.ok) {
            const grades = await res.json();
            const list = document.getElementById('grades-list');
            if (grades.length === 0) {
                list.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Nenhuma avaliação encontrada.</td></tr>`;
                return;
            }
            list.innerHTML = grades.map(g => `
                <tr class="transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${g.student_name}<br><small class="text-gray-500 dark:text-gray-400">${g.student_email}</small></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200">${g.module_title}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${parseFloat(g.grade).toFixed(1)}%</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${g.passed ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'}">
                            ${g.passed ? 'Aprovado' : 'Reprovado'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${new Date(g.created_at).toLocaleDateString()}</td>
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
            if (settings.lgpd_terms) document.getElementById('set-lgpd-terms').value = settings.lgpd_terms;
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

let chartInstance1 = null;
let chartInstance2 = null;

async function loadDashboard() {
    try {
        const res = await fetchWithAuth('/dashboard/metrics');
        if (res.ok) {
            const data = await res.json();
            const role = localStorage.getItem('role');
            renderMetricCards(data, role);
            renderCharts(data, role);
        }
    } catch (err) { console.error('Error loading dashboard', err); }
}

function renderMetricCards(data, role) {
    const container = document.getElementById('dashboard-cards');
    let cardsHtml = '';

    const createCard = (title, value, icon, color) => `
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-${color}-500 flex items-center transition-colors duration-200">
            <div class="p-3 rounded-full bg-${color}-100 dark:bg-gray-700 text-${color}-500 mr-4 text-xl sm:text-2xl">${icon}</div>
            <div>
                <p class="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold">${title}</p>
                <p class="text-2xl font-bold text-gray-800 dark:text-gray-100">${value}</p>
            </div>
        </div>
    `;

    cardsHtml += createCard('Total de Alunos', data.totalStudents, '👥', 'blue');
    cardsHtml += createCard('Aulas Concluídas', data.totalCompletions, '✅', 'green');

    if (role === 'coordenador' || role === 'super_admin') {
        cardsHtml += createCard('Média Geral', data.averageGrade, '📈', 'yellow');
    }

    if (role === 'super_admin') {
        cardsHtml += createCard('Receita (Pago)', `R$ ${data.totalRevenue}`, '💰', 'green');
        cardsHtml += createCard('Receita (Pendente)', `R$ ${data.pendingRevenue}`, '⏳', 'red');
        cardsHtml += createCard('Total Staff', data.totalStaff, '👔', 'purple');
    }

    container.innerHTML = cardsHtml;
}

function renderCharts(data, role) {
    if (chartInstance1) chartInstance1.destroy();
    if (chartInstance2) chartInstance2.destroy();

    const ctx1 = document.getElementById('chart-primary').getContext('2d');

    if (role === 'professor') {
        // Professor only sees basic bar chart of completions vs students
        chartInstance1 = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Alunos Registrados', 'Aulas Concluídas Total'],
                datasets: [{
                    label: 'Engajamento',
                    data: [data.totalStudents, data.totalCompletions],
                    backgroundColor: ['#4F46E5', '#10B981']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        document.getElementById('chart-secondary-container').classList.add('hidden');
    }
    else if (role === 'coordenador' || role === 'super_admin') {
        // Coordinator & Admin sees Module Completion Rates
        const labels = (data.moduleCompletionRates || []).map(m => m.title);
        const rates = (data.moduleCompletionRates || []).map(m => m.rate);

        chartInstance1 = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Taxa de Aprovação por Módulo (%)',
                    data: rates,
                    backgroundColor: '#4F46E5'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        if (role === 'coordenador') {
            document.getElementById('chart-secondary-container').classList.add('hidden');
        }

        if (role === 'super_admin') {
            document.getElementById('chart-secondary-container').classList.remove('hidden');
            const ctx2 = document.getElementById('chart-secondary').getContext('2d');
            const revLabels = (data.monthlyRevenue || []).map(r => r.month);
            const revData = (data.monthlyRevenue || []).map(r => r.total);

            chartInstance2 = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: revLabels,
                    datasets: [{
                        label: 'Receita Mensal (R$)',
                        data: revData,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }
}
