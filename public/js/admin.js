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
    loadStudents();

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
        const desc = document.getElementById('les-desc').value;
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
            lessonFormData.append('description', desc);
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

    // Question Form Submit (Create or Update)
    document.getElementById('question-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const correctRadio = document.querySelector('input[name="q-correct"]:checked');
        if (!correctRadio) {
            alert('Selecione a opção correta!');
            return;
        }

        const qId = document.getElementById('q-id').value;
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
            const url = qId ? `/questions/${qId}` : '/questions';
            const method = qId ? 'PUT' : 'POST';

            const res = await fetchWithAuth(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                alert(`Pergunta ${qId ? 'atualizada' : 'salva'} com sucesso!`);
                document.getElementById('question-modal').classList.add('hidden');
                document.getElementById('question-form').reset();
                document.getElementById('q-id').value = '';

                // Refresh the list if it's open
                if (!document.getElementById('question-list-modal').classList.contains('hidden')) {
                    openQuestionListModal(body.lesson_id, body.module_id);
                }
            } else {
                alert('Erro ao salvar pergunta');
            }
        } catch (err) { console.error(err); }
    });
    // Material Form Submit
    document.getElementById('material-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('m-file');
        if (!fileInput.files.length) {
            alert('Selecione um arquivo PDF!');
            return;
        }

        const fd = new FormData();
        fd.append('name', document.getElementById('m-name').value);
        fd.append('comment', document.getElementById('m-comment').value);
        fd.append('material', fileInput.files[0]);

        const lessonId = document.getElementById('m-les-id').value;

        try {
            const res = await fetchWithAuth(`/lessons/${lessonId}/materials`, {
                method: 'POST',
                body: fd
            });
            if (res.ok) {
                alert('Material salvo com sucesso!');
                document.getElementById('material-modal').classList.add('hidden');
                document.getElementById('material-form').reset();

                // Refresh the list if it's open
                if (!document.getElementById('materials-list-modal').classList.contains('hidden')) {
                    openMaterialsListModal(lessonId);
                }
            } else {
                alert('Erro ao salvar material');
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
    const tabStudents = document.getElementById('tab-students');
    if (tabStudents) tabStudents.classList.add('hidden');

    document.getElementById(`tab-${tab}`).classList.remove('hidden');

    // Reset button styles
    ['btn-dashboard', 'btn-courses', 'btn-grades', 'btn-finance', 'btn-settings', 'btn-students'].forEach(id => {
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
                <div class="border border-gray-100 dark:border-gray-700 rounded-xl p-5 mb-5 shadow-sm bg-white dark:bg-gray-800 transition-colors duration-200">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3 mb-4 gap-3">
                        <h3 class="font-bold text-xl text-gray-800 dark:text-gray-100">${m.title}</h3>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="openQuestionListModal(null, ${m.id})" class="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors font-semibold">Avaliações do Módulo</button>
                            <button onclick="openLessonModal(${m.id})" class="text-xs bg-primary text-white px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity font-semibold shadow-sm">+ Nova Aula</button>
                        </div>
                    </div>
                    <ul class="space-y-3">
                        ${m.lessons.map(l => `
                            <li class="flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50/50 hover:bg-gray-50 dark:bg-gray-700/50 dark:hover:bg-gray-700 border border-gray-50 dark:border-gray-600 p-3 rounded-lg transition-colors duration-200">
                                <span class="font-medium text-gray-700 dark:text-gray-200 mb-2 sm:mb-0">${l.title}</span>
                                <div class="flex gap-2">
                                    <button onclick="openQuestionListModal(${l.id}, ${m.id})" class="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-md shadow-sm hover:text-primary transition-colors">Perguntas</button>
                                    <button onclick="openMaterialsListModal(${l.id})" class="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-md shadow-sm hover:text-indigo-600 transition-colors">Materiais</button>
                                </div>
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

async function loadStudents() {
    try {
        const res = await fetchWithAuth('/students');
        if (res.ok) {
            const students = await res.json();
            const list = document.getElementById('students-list');
            if (students.length === 0) {
                list.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhum aluno encontrado.</td></tr>`;
                return;
            }
            list.innerHTML = students.map(s => `
                <tr class="transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${s.name}<br><small class="text-gray-500 dark:text-gray-400">${s.email}</small></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${s.cpf || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${new Date(s.created_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button onclick="viewStudentDetails(${s.id})" class="text-primary hover:underline font-medium">Ver Detalhes</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function viewStudentDetails(studentId) {
    try {
        const res = await fetchWithAuth(`/students/${studentId}/details`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('student-modal-name').textContent = data.student.name;
            document.getElementById('student-modal-email').textContent = data.student.email;

            // Populate Progress
            const progressList = document.getElementById('st-progress-list');
            if (data.progress.length === 0) {
                progressList.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Nenhuma aula iniciada.</li>';
            } else {
                progressList.innerHTML = data.progress.map(p => `
                    <li class="flex flex-col text-sm p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-2 border border-gray-100 dark:border-gray-700">
                        <div class="flex justify-between items-center mb-1">
                            <span class="dark:text-gray-200"><span class="font-medium text-gray-800 dark:text-gray-100">${p.module_title}</span> - ${p.lesson_title}</span>
                            <span class="${p.is_completed ? 'text-green-600 dark:text-green-400 font-bold' : 'text-yellow-600 dark:text-yellow-400'} px-2 py-1 rounded-full text-xs bg-gray-50 dark:bg-gray-700">
                                ${p.is_completed ? 'Concluída' : 'Em andamento'}
                            </span>
                        </div>
                        ${p.grade !== null && p.grade !== undefined ? `
                            <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <div>
                                    <span class="text-xs font-semibold text-gray-500 mr-2">Nota:</span>
                                    <span class="font-bold ${p.passed ? 'text-green-600' : 'text-red-500'}">${parseFloat(p.grade).toFixed(1)}%</span>
                                </div>
                                <button onclick="viewStudentAnswers(${studentId}, ${p.lesson_id}, '${p.lesson_title}')" class="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors font-medium">Ver Respostas</button>
                            </div>
                        ` : ''}
                    </li>
                `).join('');
            }

            // Populate Grades
            const gradesList = document.getElementById('st-grades-list');
            if (data.grades.length === 0) {
                gradesList.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Nenhuma avaliação realizada.</li>';
            } else {
                gradesList.innerHTML = data.grades.map(g => `
                    <li class="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded mb-2">
                        <span class="dark:text-gray-200 font-medium">${g.module_title}</span>
                        <div class="text-right">
                            <span class="block text-gray-900 dark:text-gray-100 font-bold">${parseFloat(g.grade).toFixed(1)}%</span>
                            <span class="text-xs ${g.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                ${g.passed ? 'Aprovado' : 'Reprovado'}
                            </span>
                        </div>
                    </li>
                `).join('');
            }

            document.getElementById('student-modal').classList.remove('hidden');
        } else {
            alert('Erro ao carregar os detalhes do aluno');
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
    document.getElementById('q-id').value = '';
    document.getElementById('q-les-id').value = lessonId || '';
    document.getElementById('q-mod-id').value = moduleId || '';
    document.getElementById('q-modal-title').textContent = 'Adicionar Pergunta';
    document.getElementById('question-modal').classList.remove('hidden');
}

async function openQuestionListModal(lessonId, moduleId) {
    document.getElementById('ql-current-les').value = lessonId || '';
    document.getElementById('ql-current-mod').value = moduleId || '';

    let url = '';
    if (lessonId) url = `/questions/lesson/${lessonId}`;
    else if (moduleId) url = `/questions/module/${moduleId}`;

    if (!url) return;

    try {
        const res = await fetchWithAuth(url);
        const container = document.getElementById('question-list-container');
        if (res.ok) {
            const questions = await res.json();
            if (questions.length === 0) {
                container.innerHTML = '<li class="text-gray-500 py-4 text-center border rounded dark:border-gray-700">Nenhuma pergunta cadastrada.</li>';
            } else {
                container.innerHTML = questions.map((q, idx) => `
                    <li class="bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-200">
                        <div class="flex-1">
                            <h4 class="font-bold text-gray-800 dark:text-gray-100 mb-1">Q${idx + 1}: ${q.question_text}</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-300">
                                <span class="${q.correct_option === 'A' ? 'text-green-600 font-bold dark:text-green-400' : ''}">A) ${q.option_a}</span><br>
                                <span class="${q.correct_option === 'B' ? 'text-green-600 font-bold dark:text-green-400' : ''}">B) ${q.option_b}</span><br>
                                <span class="${q.correct_option === 'C' ? 'text-green-600 font-bold dark:text-green-400' : ''}">C) ${q.option_c}</span><br>
                                <span class="${q.correct_option === 'D' ? 'text-green-600 font-bold dark:text-green-400' : ''}">D) ${q.option_d}</span>
                            </p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="editQuestion('${encodeURIComponent(JSON.stringify(q))}')" class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition">Editar</button>
                            <button onclick="deleteQuestion(${q.id}, ${lessonId}, ${moduleId})" class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">Excluir</button>
                        </div>
                    </li>
                `).join('');
            }
            document.getElementById('question-list-modal').classList.remove('hidden');
        } else {
            alert('Erro ao carregar perguntas');
        }
    } catch (err) { console.error(err); }
}

function editQuestion(encodedQuestionData) {
    const q = JSON.parse(decodeURIComponent(encodedQuestionData));
    document.getElementById('question-form').reset();
    document.getElementById('q-id').value = q.id;
    document.getElementById('q-les-id').value = q.lesson_id || '';
    document.getElementById('q-mod-id').value = q.module_id || '';
    document.getElementById('q-text').value = q.question_text;
    document.getElementById('q-opt-a').value = q.option_a;
    document.getElementById('q-opt-b').value = q.option_b;
    document.getElementById('q-opt-c').value = q.option_c;
    document.getElementById('q-opt-d').value = q.option_d;

    const correctRadio = document.querySelector(`input[name="q-correct"][value="${q.correct_option}"]`);
    if (correctRadio) correctRadio.checked = true;

    document.getElementById('q-modal-title').textContent = 'Editar Pergunta';
    document.getElementById('question-modal').classList.remove('hidden');
}

async function deleteQuestion(id, lessonId, moduleId) {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;
    try {
        const res = await fetchWithAuth(`/questions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Pergunta excluída com sucesso!');
            openQuestionListModal(lessonId, moduleId);
        } else {
            alert('Erro ao excluir a pergunta.');
        }
    } catch (err) { console.error(err); }
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

    const createCard = (title, value, icon, iconBgClass, iconTextClass) => `
        <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div class="p-3.5 rounded-full ${iconBgClass} ${iconTextClass} mr-5 text-2xl shadow-sm">${icon}</div>
            <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">${title}</p>
                <p class="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">${value}</p>
            </div>
        </div>
    `;

    cardsHtml += createCard('Total de Alunos', data.totalStudents, '👥', 'bg-blue-50 dark:bg-blue-900/40', 'text-blue-600 dark:text-blue-400');
    cardsHtml += createCard('Aulas Concluídas', data.totalCompletions, '✅', 'bg-emerald-50 dark:bg-emerald-900/40', 'text-emerald-600 dark:text-emerald-400');

    if (role === 'coordenador' || role === 'super_admin') {
        cardsHtml += createCard('Média Geral', data.averageGrade + '%', '📈', 'bg-amber-50 dark:bg-amber-900/40', 'text-amber-600 dark:text-amber-400');
    }

    if (role === 'super_admin') {
        cardsHtml += createCard('Staff', data.totalStaff, '👔', 'bg-purple-50 dark:bg-purple-900/40', 'text-purple-600 dark:text-purple-400');
        cardsHtml += createCard('Receita (Pago)', `R$ ${data.totalRevenue}`, '💰', 'bg-green-50 dark:bg-green-900/40', 'text-green-600 dark:text-green-400');
        cardsHtml += createCard('Receita (Pendente)', `R$ ${data.pendingRevenue}`, '⏳', 'bg-rose-50 dark:bg-rose-900/40', 'text-rose-600 dark:text-rose-400');
    }

    container.innerHTML = cardsHtml;
}

function renderCharts(data, role) {
    if (chartInstance1) chartInstance1.destroy();
    if (chartInstance2) chartInstance2.destroy();

    const ctx1 = document.getElementById('chart-primary').getContext('2d');

    // Determine dynamic colors from CSS variables and dark mode state
    const isDark = document.documentElement.classList.contains('dark');
    const primaryColorRaw = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#4F46E5';
    const textColor = isDark ? '#E5E7EB' : '#374151'; // gray-200 or gray-700
    const gridColor = isDark ? '#374151' : '#E5E7EB'; // gray-700 or gray-200

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: textColor } },
        },
        scales: {
            x: {
                ticks: { color: textColor },
                grid: { color: gridColor, drawBorder: false }
            },
            y: {
                ticks: { color: textColor, precision: 0 },
                grid: { color: gridColor, drawBorder: false }
            }
        }
    };

    if (role === 'professor') {
        chartInstance1 = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Alunos Registrados', 'Aulas Concluídas Total'],
                datasets: [{
                    label: 'Engajamento Global',
                    data: [data.totalStudents, data.totalCompletions],
                    backgroundColor: [primaryColorRaw, '#10B981']
                }]
            },
            options: chartOptions
        });
        document.getElementById('chart-secondary-container').classList.add('hidden');
    }
    else if (role === 'coordenador' || role === 'super_admin') {
        // Coordinator & Admin sees Module Engagement (Views vs Completions)
        const labels = (data.moduleEngagement || []).map(m => m.title);
        const views = (data.moduleEngagement || []).map(m => m.views);
        const completions = (data.moduleEngagement || []).map(m => m.completions);

        chartInstance1 = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Visualizações',
                        data: views,
                        backgroundColor: '#9CA3AF' // Gray represents those who saw
                    },
                    {
                        label: 'Conclusões (Aprovados)',
                        data: completions,
                        backgroundColor: primaryColorRaw
                    }
                ]
            },
            options: chartOptions
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
                options: chartOptions
            });
        }
    }
}

// Materials Functions
async function openMaterialsListModal(lessonId) {
    document.getElementById('mat-current-les').value = lessonId;

    // Fetch materials
    try {
        const res = await fetchWithAuth(`/lessons/${lessonId}/materials`);
        if (res.ok) {
            const materials = await res.json();
            const container = document.getElementById('materials-list-container');

            if (materials.length === 0) {
                container.innerHTML = '<li class="text-gray-500 dark:text-gray-400 text-sm">Nenhum material cadastrado para esta aula.</li>';
            } else {
                container.innerHTML = materials.map(m => `
                    <li class="p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row justify-between sm:items-center transition-colors duration-200">
                        <div class="mb-2 sm:mb-0">
                            <p class="font-bold text-gray-800 dark:text-gray-100">${m.name}</p>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${m.comment || ''}</p>
                            <button onclick="openPdfModal('${m.file_path}', '${m.name.replace(/'/g, "\\'")}')" class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold hover:underline mt-2 inline-block">Ler Arquivo PDF na Tela</button>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="deleteMaterial(${m.id}, ${lessonId})" class="text-sm text-white bg-red-600 px-3 py-1 rounded hover:bg-red-700 transition">Excluir</button>
                        </div>
                    </li>
                `).join('');
            }

            document.getElementById('materials-list-modal').classList.remove('hidden');
        } else {
            alert('Erro ao carregar materiais');
        }
    } catch (err) { console.error(err); }
}

function openMaterialModal(lessonId) {
    document.getElementById('m-les-id').value = lessonId;
    document.getElementById('material-form').reset();
    document.getElementById('material-modal').classList.remove('hidden');
}

async function deleteMaterial(id, lessonId) {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;
    try {
        const res = await fetchWithAuth(`/materials/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Material excluído com sucesso!');
            openMaterialsListModal(lessonId);
        } else {
            alert('Erro ao excluir material.');
        }
    } catch (err) { console.error(err); }
}

async function viewStudentAnswers(studentId, lessonId, lessonTitle) {
    try {
        const res = await fetchWithAuth(`/students/${studentId}/lesson/${lessonId}/answers`);
        if (res.ok) {
            const answers = await res.json();
            document.getElementById('answers-modal-title').textContent = `Respostas da Aula: ${lessonTitle}`;
            const container = document.getElementById('answers-list-container');

            if (answers.length === 0) {
                container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">O aluno não respondeu a nenhuma pergunta avaliativa (ou foram apagadas).</p>';
            } else {
                container.innerHTML = answers.map((a, idx) => `
                    <div class="mb-4 border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                        <p class="font-bold text-gray-800 dark:text-gray-100 mb-2">${idx + 1}. ${a.question_text}</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
                            <div class="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border border-gray-100 dark:border-gray-600">
                                <p class="text-gray-500 dark:text-gray-400 mb-1 font-semibold text-xs uppercase tracking-wider">Resposta do Aluno</p>
                                <p class="font-medium ${a.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    ${a.student_answer ? `${a.student_answer}) ${a.options[a.student_answer] || 'Opção Desconhecida'}` : 'Não respondida'}
                                </p>
                            </div>
                            <div class="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border border-gray-100 dark:border-gray-600">
                                <p class="text-gray-500 dark:text-gray-400 mb-1 font-semibold text-xs uppercase tracking-wider">Gabarito Direto</p>
                                <p class="font-medium text-green-600 dark:text-green-400">
                                    ${a.correct_option}) ${a.options[a.correct_option]}
                                </p>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            document.getElementById('answers-modal').classList.remove('hidden');
        } else {
            alert('Não foi possível carregar as respostas.');
        }
    } catch (err) { console.error(err); }
}

// --- PDF Modal logic

function openPdfModal(pdfUrl, title) {
    document.getElementById('pdf-modal-title').textContent = title || 'Material de Apoio';
    document.getElementById('pdf-viewer').src = pdfUrl;
    document.getElementById('pdf-download-btn').href = pdfUrl;
    document.getElementById('pdf-modal').classList.remove('hidden');
}

function closePdfModal() {
    document.getElementById('pdf-modal').classList.add('hidden');
    document.getElementById('pdf-viewer').src = '';
}
