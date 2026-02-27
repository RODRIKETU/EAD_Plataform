let currentLessonId = null;
let currentModuleId = null;
let currentQuiz = []; // Array of questions
let quizContext = null; // { type: 'lesson' | 'module', id: number }

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('role') !== 'aluno') {
        window.location.href = '/';
        return;
    }

    loadDashboard();

    document.getElementById('btn-mark-completed').addEventListener('click', async () => {
        if (!currentLessonId) return;

        // Check for questions before completing
        try {
            const qRes = await fetchWithAuth(`/questions/lesson/${currentLessonId}`);
            if (qRes.ok) {
                const questions = await qRes.json();
                if (questions.length > 0) {
                    openQuizModal('lesson', currentLessonId, questions);
                    return; // Stop here, completion happens after quiz
                }
            }
        } catch (err) { console.error(err); }

        completeLesson(currentLessonId);
    });

    document.getElementById('btn-submit-quiz').addEventListener('click', submitQuiz);
});

async function completeLesson(lessonId) {
    try {
        const res = await fetchWithAuth(`/progress/${lessonId}`, {
            method: 'POST'
        });
        if (res.ok) {
            alert('Aula concluída!');
            // Reload to update checkmarks
            if (currentModuleId) {
                // Fetch the specific module to update visual state or simply reload dashboard
                loadDashboard();
                openCourse(window.currentCourseData);
            }
        }
    } catch (err) { console.error(err); }
}

async function loadDashboard() {
    try {
        const res = await fetchWithAuth('/student/dashboard');
        if (res.ok) {
            const data = await res.json();
            renderDashboard(data);
        }
    } catch (err) { console.error(err); }
}

function renderDashboard(data) {
    document.getElementById('finance-view').classList.add('hidden');
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('sidebar-container').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');

    // Stats
    document.getElementById('dashboard-stats').innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h4 class="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Cursos Assinados</h4>
            <p class="text-3xl font-black text-gray-800 dark:text-gray-100 mt-2">${data.stats.total_enrolled}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h4 class="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Em Andamento</h4>
            <p class="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">${data.stats.in_progress}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h4 class="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Concluídos</h4>
            <p class="text-3xl font-black text-green-600 dark:text-green-400 mt-2">${data.stats.completed_courses}</p>
        </div>
    `;

    // Enrolled
    const myCoursesContainer = document.getElementById('dashboard-my-courses');
    if (data.enrolled_courses.length === 0) {
        myCoursesContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full">Nenhum curso assinado no momento.</p>';
    } else {
        myCoursesContainer.innerHTML = data.enrolled_courses.map(c => `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full overflow-hidden" onclick='openCourse(${JSON.stringify(c).replace(/'/g, "&#39;")})'>
                ${c.thumbnail_url ? `<img src="${c.thumbnail_url}" alt="${c.title}" class="w-full h-40 object-cover">` : '<div class="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><span class="text-gray-400">Sem Capa</span></div>'}
                <div class="p-5 flex-1 flex flex-col">
                    <div class="flex-1">
                        <h4 class="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2">${c.title}</h4>
                        <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">${c.description || 'Sem descrição'}</p>
                    </div>
                    <div class="mt-4 pt-4 border-t dark:border-gray-700">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="font-bold text-gray-700 dark:text-gray-300">Progresso</span>
                            <span class="font-bold text-primary">${c.progress_percentage}%</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div class="bg-primary h-2 rounded-full transition-all duration-500" style="width: ${c.progress_percentage}%"></div>
                        </div>
                        <p class="text-xs text-gray-400 mt-2 text-right">${c.completed_lessons} de ${c.total_lessons} aulas</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Available
    const availableContainer = document.getElementById('dashboard-available-courses');
    if (data.available_courses.length === 0) {
        availableContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full">Nenhum curso novo disponível no momento.</p>';
    } else {
        availableContainer.innerHTML = data.available_courses.map(c => `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden">
                ${c.thumbnail_url ? `<img src="${c.thumbnail_url}" alt="${c.title}" class="w-full h-40 object-cover">` : '<div class="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><span class="text-gray-400">Sem Capa</span></div>'}
                <div class="p-5 flex-1 flex flex-col relative">
                    ${c.is_free ? '<span class="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Gratuito</span>' : `<span class="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">R$ ${parseFloat(c.price || 0).toFixed(2).replace('.', ',')}</span>`}
                    <div class="flex-1 mb-4 mt-2">
                        <h4 class="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2">${c.title}</h4>
                        <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">${c.description || 'Nenhuma descrição fornecida para este curso.'}</p>
                    </div>
                    <button onclick="enrollCourse(${c.id})" class="w-full mt-auto py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors">
                        ${c.is_free ? 'Assinar Curso Gratuito' : 'Comprar Curso'}
                    </button>
                </div>
            </div>
        `).join('');
    }
}

async function enrollCourse(moduleId) {
    if (!confirm("Deseja assinar e começar este curso agora?")) return;
    try {
        const res = await fetchWithAuth(`/student/enroll/${moduleId}`, { method: 'POST' });
        if (res.ok) {
            alert('Matrícula realizada com sucesso!');
            loadDashboard(); // reload dashboard to move it to my courses
        } else {
            alert('Erro ao realizar matrícula.');
        }
    } catch (err) { console.error(err); }
}

function showDashboard() {
    loadDashboard();
}

function openCourse(courseData) {
    window.currentCourseData = courseData; // save reference for reload
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('sidebar-container').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');

    // Reset Video Area
    document.getElementById('video-container').classList.add('hidden');
    document.getElementById('lesson-actions').classList.add('hidden');
    document.getElementById('lesson-title').classList.remove('hidden');
    document.getElementById('lesson-title').textContent = 'Bem-vindo(a) ao curso!';
    document.getElementById('lesson-desc-container').classList.add('hidden');
    if (hlsInstance) hlsInstance.stopLoad();

    const nav = document.getElementById('course-navigation');
    nav.innerHTML = `
        <div class="mb-4">
            <h4 class="font-bold text-gray-700 dark:text-gray-200">${courseData.title}</h4>
            <ul class="ml-2 mt-2 space-y-2 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                ${courseData.lessons.map(l => `
                    <li>
                        <button onclick="selectLesson(${l.id}, ${courseData.id}, '${l.title.replace(/'/g, "'")}', '${l.video_hls_path}', '${encodeURIComponent(l.description || '')}', '${encodeURIComponent(l.description_title || '')}')" 
                            class="text-sm text-left w-full rounded py-1 px-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${l.is_completed ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-300'}">
                            ${l.is_completed ? '✓' : '○'} ${l.title}
                        </button>
                    </li>
                `).join('')}
            </ul>
            <button onclick="checkModuleEvaluation(${courseData.id})" class="mt-4 text-xs font-bold text-primary underline hover:text-secondary block">Avaliação Final do Curso</button>
        </div>
    `;
}

function selectLesson(id, moduleId, title, hlsPath, encodedDesc, encodedDescTitle) {
    currentLessonId = id;
    currentModuleId = moduleId;

    // Hide finance view, show video elements
    document.getElementById('finance-view').classList.add('hidden');
    document.getElementById('lesson-title').classList.remove('hidden');
    document.getElementById('lesson-title').textContent = title;
    document.getElementById('lesson-actions').classList.remove('hidden');

    // Handle Description
    const descText = decodeURIComponent(encodedDesc || '').trim();
    const descTitleText = decodeURIComponent(encodedDescTitle || '').trim();
    const descContainer = document.getElementById('lesson-desc-container');
    const descContent = document.getElementById('lesson-desc-content');
    const descTitle = document.getElementById('lesson-desc-title');

    if (descContainer && descContent && descTitle) {
        if (descText) {
            descTitle.textContent = descTitleText || 'Sobre esta aula';
            descContent.innerHTML = descText.replace(/n/g, '<br>');
            descContainer.classList.remove('hidden');
        } else {
            descContainer.classList.add('hidden');
            descContent.innerHTML = '';
        }
    }

    // Fetch and render Support Materials dynamically
    const materialsList = document.getElementById('materials-list');
    materialsList.innerHTML = '<span class="text-sm text-gray-400">Carregando materiais...</span>';

    fetchWithAuth(`/lessons/${id}/materials`).then(res => {
        if (res.ok) {
            res.json().then(materials => {
                if (materials.length === 0) {
                    materialsList.innerHTML = '';
                    return;
                }

                materialsList.innerHTML = materials.map(m => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                        <div>
                            <p class="font-bold text-gray-800 dark:text-gray-100 text-sm">${m.name}</p>
                            ${m.comment ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${m.comment}</p>` : ''}
                        </div>
                        <button onclick="openPdfModal('${m.file_path}', '${m.name.replace(/'/g, "'")}')" class="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-lg hover:bg-indigo-200 transition-colors flex-shrink-0 ml-4 font-bold text-center h-fit">Ler Material</button>
                    </div>
                `).join('');
            });
        } else {
            materialsList.innerHTML = '<span class="text-sm text-red-400">Erro ao carregar materiais</span>';
        }
    }).catch(err => {
        console.error(err);
        materialsList.innerHTML = '';
    });

    if (hlsPath && hlsPath !== 'null') {
        playVideo(hlsPath);
    } else {
        document.getElementById('video-container').classList.add('hidden');
        document.getElementById('lesson-title').textContent += ' (Vídeo não disponível)';
    }
}

async function showFinance() {
    // Hide video aspects
    document.getElementById('video-container').classList.add('hidden');
    document.getElementById('lesson-actions').classList.add('hidden');
    document.getElementById('lesson-title').classList.add('hidden');
    if (hlsInstance) hlsInstance.stopLoad();
    document.getElementById('video-player').pause();

    // Show Finance view
    document.getElementById('finance-view').classList.remove('hidden');
    document.getElementById('certificates-view').classList.add('hidden');
    document.getElementById('sidebar-container').classList.add('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');

    try {
        const res = await fetchWithAuth('/finance/my');
        if (res.ok) {
            const charges = await res.json();
            const list = document.getElementById('my-charges');
            if (charges.length === 0) {
                list.innerHTML = '<p class="text-gray-500">Nenhuma fatura encontrada.</p>';
            } else {
                list.innerHTML = charges.map(c => `
                    <div class="border border-gray-200 dark:border-gray-700 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors duration-200 gap-4">
                        <div>
                            <p class="font-bold text-gray-800 dark:text-gray-100">${c.description}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-300">Vencimento: ${new Date(c.due_date).toLocaleDateString()} - R$ ${parseFloat(c.amount).toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 text-xs font-bold rounded-full ${c.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${c.status.toUpperCase()}
                            </span>
                            <button onclick="downloadSecurePdf('/student/receipt/charge/${c.id}', 'fatura_${c.id}.pdf')" class="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors font-bold">
                                Imprimir
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Also fetch enrolled courses to show free receipts
        const dashRes = await fetchWithAuth('/student/dashboard');
        if (dashRes.ok) {
            const data = await dashRes.json();
            const recList = document.getElementById('my-enrollment-receipts');
            if (data.enrolled_courses.length === 0) {
                recList.innerHTML = '<p class="text-gray-500">Nenhuma assinatura de curso encontrada.</p>';
            } else {
                recList.innerHTML = data.enrolled_courses.map(c => `
                    <div class="border border-gray-200 dark:border-gray-700 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors duration-200 gap-4">
                        <div>
                            <p class="font-bold text-gray-800 dark:text-gray-100">${c.title}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-300">Acesso via Plataforma em ${new Date(c.enrolled_at).toLocaleDateString()}</p>
                        </div>
                        <button onclick="downloadSecurePdf('/student/receipt/enrollment/${c.id}', 'matricula_${c.id}.pdf')" class="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors font-bold whitespace-nowrap">
                            Comprovante
                        </button>
                    </div>
                `).join('');
            }
        }

    } catch (err) { console.error(err); }
}

async function showCertificates() {
    // Hide video aspects
    document.getElementById('video-container').classList.add('hidden');
    document.getElementById('lesson-actions').classList.add('hidden');
    document.getElementById('lesson-title').classList.add('hidden');
    if (hlsInstance) hlsInstance.stopLoad();
    document.getElementById('video-player').pause();

    // Show Certificates view
    document.getElementById('finance-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('sidebar-container').classList.add('hidden');
    document.getElementById('certificates-view').classList.remove('hidden');

    try {
        const dashRes = await fetchWithAuth('/student/dashboard');
        if (dashRes.ok) {
            const data = await dashRes.json();
            const list = document.getElementById('certificates-list');

            if (data.enrolled_courses.length === 0) {
                list.innerHTML = '<p class="text-gray-500 col-span-full">Nenhum curso assinado para emitir certificados.</p>';
            } else {
                list.innerHTML = data.enrolled_courses.map(c => `
                    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border ${c.progress_percentage === 100 ? 'border-green-500 dark:border-green-500/50' : 'border-gray-200 dark:border-gray-700'} flex flex-col h-full text-center">
                        <div class="h-16 w-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 ${c.progress_percentage === 100 ? 'text-green-500' : 'text-gray-400'}">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        </div>
                        <h4 class="font-black text-lg text-gray-800 dark:text-gray-100 mb-2">${c.title}</h4>
                        <p class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">Progresso: ${c.progress_percentage}%</p>
                        
                        <div class="mt-auto">
                            ${c.progress_percentage === 100
                        ? `<button onclick="downloadSecurePdf('/student/certificate/${c.id}', 'certificado_${c.id}.pdf')" class="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors shadow-sm">Baixar Certificado</button>`
                        : `<button disabled class="w-full py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed font-bold rounded-lg">Em Andamento</button>`}
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (err) { console.error(err); }
}

async function downloadSecurePdf(endpoint, filename) {
    try {
        const token = localStorage.getItem('api_token');
        const res = await fetch(`/api${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            alert('Não foi possível gerar este PDF. Verifique os requisitos.');
            return;
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('PDF Download Error', err);
        alert('Erro ao tentar fazer o download.');
    }
}

async function checkModuleEvaluation(moduleId) {
    try {
        const qRes = await fetchWithAuth(`/questions/module/ ${moduleId}`);
        if (qRes.ok) {
            const questions = await qRes.json();
            if (questions.length > 0) {
                openQuizModal('module', moduleId, questions);
            } else {
                alert('Este módulo não possui avaliação final.');
            }
        }
    } catch (err) { console.error(err); }
}

function openQuizModal(type, id, questions) {
    quizContext = { type, id };
    currentQuiz = questions;

    document.getElementById('quiz-modal-title').textContent = type === 'lesson'
        ? 'Perguntas da Aula'
        : 'Avaliação Final do Módulo';

    const container = document.getElementById('quiz-container');
    container.innerHTML = questions.map((q, index) => `
        <div class="question-block bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-200 mb-5" data-qid="${q.id}">
            <p class="font-bold mb-4 text-gray-800 dark:text-gray-100 text-lg leading-snug"><span class="text-primary mr-1">${index + 1}.</span> ${q.question_text}</p>
            <div class="space-y-3 pl-2">
                ${['A', 'B', 'C', 'D'].map(opt => `
                    <label class="flex items-center space-x-3 p-3 rounded-lg border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer transition-all">
                        <input type="radio" name="q-${q.id}" value="${opt}" class="w-5 h-5 text-primary focus:ring-primary border-gray-300">
                        <span class="text-gray-700 dark:text-gray-300 font-medium">${q['option_' + opt.toLowerCase()]}</span>
                    </label>
                `).join('')}
            </div>
        </div >
            `).join('');

    document.getElementById('quiz-modal').classList.remove('hidden');
}

function closeQuizModal() {
    document.getElementById('quiz-modal').classList.add('hidden');
    // Store type and id temporarily in case it was a lesson, so we can complete it
    const wasLesson = quizContext?.type === 'lesson';
    const lastId = quizContext?.id;

    quizContext = null;
    currentQuiz = [];
}

async function submitQuiz() {
    if (!quizContext || currentQuiz.length === 0) return;

    const answers = {};
    let allAnswered = true;

    currentQuiz.forEach(q => {
        const selected = document.querySelector(`input[name="q-${q.id}"]:checked`);
        if (selected) {
            answers[q.id] = selected.value;
        } else {
            allAnswered = false;
        }
    });

    if (!allAnswered) {
        alert('Por favor, responda todas as perguntas.');
        return;
    }

    const typeContext = quizContext.type;
    const idContext = quizContext.id;

    const body = { answers };
    if (typeContext === 'lesson') {
        body.lesson_id = idContext;
    } else {
        body.module_id = idContext;
    }

    try {
        const res = await fetchWithAuth('/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const result = await res.json();

            if (result.passed) {
                alert(`Parabéns! Você acertou ${result.correct} de ${result.total} perguntas. Nota: ${result.score.toFixed(1)}% `);
                closeQuizModal();
                if (typeContext === 'lesson') {
                    completeLesson(idContext);
                }
            } else {
                alert(`Você acertou ${result.correct} de ${result.total} perguntas. Nota: ${result.score.toFixed(1)}%.\nVocê não atingiu a pontuação mínima necessária para concluir.Tente novamente.`);
                closeQuizModal();
            }
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
